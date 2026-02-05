/**
 * MCP Host - Server Connection Management and Tool Routing
 * 
 * Manages connections to MCP servers (filesystem, browser, email, twitter)
 * Routes tool calls through permission middleware
 * Handles approval workflows for high-risk operations
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { PermissionMiddleware, PermissionCheckResult } from './permissions.js';
import winston from 'winston';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'mcp-host.log' })
  ]
});

/**
 * MCP Server Configuration
 */
export interface McpServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
  description?: string;
}

/**
 * Tool Call Request
 */
export interface ToolCallRequest {
  toolName: string;
  parameters: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  requestId: string;
}

/**
 * Tool Call Response
 */
export interface ToolCallResponse {
  requestId: string;
  success: boolean;
  data?: unknown;
  error?: string;
  executionTime: number;
  approvalRequired: boolean;
  timestamp: string;
}

/**
 * Approval Request
 */
export interface ApprovalRequest {
  id: string;
  toolCall: ToolCallRequest;
  permissionCheck: PermissionCheckResult;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: string;
  expiresAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

/**
 * MCP Server Instance
 */
interface McpServerInstance {
  config: McpServerConfig;
  client: Client;
  process: ChildProcess;
  connected: boolean;
  tools: Array<{ name: string; description: string; inputSchema: unknown }>;
}

interface PersistedServerState {
  updatedAt: string;
  servers: Record<string, boolean>;
}

/**
 * McpHost - Core MCP Protocol Host
 */
export class McpHost {
  private servers: Map<string, McpServerInstance> = new Map();
  private permissionMiddleware: PermissionMiddleware;
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  private approvalTimeout: number = 300000; // 5 minutes
  private serverConfigs: McpServerConfig[];
  private stateFilePath?: string;

  constructor(
    serverConfigs: McpServerConfig[],
    permissionMiddleware?: PermissionMiddleware,
    stateFilePath?: string
  ) {
    this.serverConfigs = serverConfigs;
    this.permissionMiddleware = permissionMiddleware || new PermissionMiddleware();
    this.stateFilePath = stateFilePath;
    logger.info('MCP Host initialized', { serverCount: serverConfigs.length });
  }

  async loadServerState(): Promise<void> {
    if (!this.stateFilePath) {
      return;
    }

    try {
      const raw = await fs.readFile(this.stateFilePath, 'utf-8');
      const payload = JSON.parse(raw) as PersistedServerState;
      const servers = payload?.servers ?? {};

      Object.entries(servers).forEach(([name, enabled]) => {
        const config = this.serverConfigs.find((entry) => entry.name === name);
        if (config) {
          config.enabled = Boolean(enabled);
        }
      });

      logger.info('Loaded MCP server state', { path: this.stateFilePath });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT') {
        logger.warn('Failed to load MCP server state', {
          error: err.message
        });
      }
    }
  }

  private async persistServerState(): Promise<void> {
    if (!this.stateFilePath) {
      return;
    }

    const payload: PersistedServerState = {
      updatedAt: new Date().toISOString(),
      servers: Object.fromEntries(
        this.serverConfigs.map((config) => [config.name, config.enabled])
      )
    };

    await fs.mkdir(path.dirname(this.stateFilePath), { recursive: true });
    await fs.writeFile(this.stateFilePath, JSON.stringify(payload, null, 2), 'utf-8');
  }

  /**
   * Connect to all configured MCP servers
   */
  async connectAll(): Promise<void> {
    logger.info('Connecting to MCP servers...', { count: this.serverConfigs.length });

    const connectionPromises = this.serverConfigs
      .filter(config => config.enabled)
      .map(config => this.connectServer(config));

    const results = await Promise.allSettled(connectionPromises);

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;

    logger.info('MCP server connections complete', { success: successCount, failed: failCount });

    if (failCount > 0) {
      logger.warn('Some MCP servers failed to connect', {
        failures: results
          .filter(r => r.status === 'rejected')
          .map(r => (r as PromiseRejectedResult).reason)
      });
    }
  }

  /**
   * Connect to a specific MCP server
   */
  private async connectServer(config: McpServerConfig): Promise<void> {
    try {
      logger.info('Connecting to MCP server', { name: config.name, command: config.command });

      // Spawn server process
      const serverProcess = spawn(config.command, config.args, {
        env: { ...process.env, ...config.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Create stdio transport
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env
      });

      // Create MCP client
      const client = new Client({
        name: 'roboto-sai-os-agent',
        version: '1.0.0'
      }, {
        capabilities: {
          tools: {},
          resources: {}
        }
      });

      // Connect client to transport
      await client.connect(transport);

      // List available tools
      const toolsList = await client.listTools();

      logger.info('MCP server connected', {
        name: config.name,
        toolsCount: toolsList.tools.length,
        tools: toolsList.tools.map(t => t.name)
      });

      // Store server instance with properly typed tools
      const tools = toolsList.tools.map(t => ({
        name: t.name,
        description: t.description || '',
        inputSchema: t.inputSchema
      }));

      this.servers.set(config.name, {
        config,
        client,
        process: serverProcess,
        connected: true,
        tools
      });
    } catch (error) {
      logger.error('Failed to connect to MCP server', {
        name: config.name,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async disconnectServer(name: string): Promise<void> {
    const instance = this.servers.get(name);
    if (!instance) {
      return;
    }

    try {
      await instance.client.close();
      instance.process.kill();
      logger.info('MCP server disconnected', { name });
    } catch (error) {
      logger.error('Error disconnecting MCP server', {
        name,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      this.servers.delete(name);
    }
  }

  async setServerEnabled(name: string, enabled: boolean): Promise<void> {
    const config = this.serverConfigs.find((entry) => entry.name === name);
    if (!config) {
      throw new Error(`Unknown MCP server: ${name}`);
    }

    if (config.enabled === enabled) {
      return;
    }

    const previous = config.enabled;
    config.enabled = enabled;

    try {
      if (enabled) {
        await this.connectServer(config);
      } else {
        await this.disconnectServer(name);
      }

      await this.persistServerState();
    } catch (error) {
      config.enabled = previous;
      throw error;
    }
  }

  /**
   * Execute a tool call with permission checking
   */
  async callTool(request: ToolCallRequest): Promise<ToolCallResponse> {
    const startTime = Date.now();

    logger.info('Tool call requested', { requestId: request.requestId, toolName: request.toolName });

    try {
      // Check permissions
      const permissionCheck = await this.permissionMiddleware.checkPermission({
        toolName: request.toolName,
        parameters: request.parameters,
        userId: request.userId,
        sessionId: request.sessionId
      });

      if (!permissionCheck.allowed) {
        this.permissionMiddleware.logPermissionDecision(
          {
            toolName: request.toolName,
            parameters: request.parameters,
            userId: request.userId,
            sessionId: request.sessionId
          },
          permissionCheck,
          'denied'
        );

        logger.warn('Tool call denied by permissions', { requestId: request.requestId, reason: permissionCheck.reason });

        return {
          requestId: request.requestId,
          success: false,
          error: `Permission denied: ${permissionCheck.reason}`,
          executionTime: Date.now() - startTime,
          approvalRequired: permissionCheck.requiresApproval,
          timestamp: new Date().toISOString()
        };
      }

      // Check if approval is required
      if (permissionCheck.requiresApproval) {
        const approvalRequest = this.createApprovalRequest(request, permissionCheck);
        this.pendingApprovals.set(approvalRequest.id, approvalRequest);

        logger.info('Tool call requires approval', {
          requestId: request.requestId,
          approvalId: approvalRequest.id,
          riskLevel: permissionCheck.riskLevel
        });

        return {
          requestId: request.requestId,
          success: false,
          error: 'Approval required',
          executionTime: Date.now() - startTime,
          approvalRequired: true,
          timestamp: new Date().toISOString(),
          data: {
            approvalId: approvalRequest.id,
            expiresAt: approvalRequest.expiresAt,
            toolCall: approvalRequest.toolCall,
            permissionCheck: approvalRequest.permissionCheck,
          }
        };
      }

      // Execute tool call
      const result = await this.executeTool(request);

      this.permissionMiddleware.logPermissionDecision(
        {
          toolName: request.toolName,
          parameters: request.parameters,
          userId: request.userId,
          sessionId: request.sessionId
        },
        permissionCheck,
        'approved'
      );

      return {
        requestId: request.requestId,
        success: true,
        data: result,
        executionTime: Date.now() - startTime,
        approvalRequired: false,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Tool call failed', {
        requestId: request.requestId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        requestId: request.requestId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        approvalRequired: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute tool call on appropriate MCP server
   */
  private async executeTool(request: ToolCallRequest): Promise<unknown> {
    // Find server that provides this tool
    const serverEntry = Array.from(this.servers.entries()).find(([, instance]) =>
      instance.tools.some(t => t.name === request.toolName)
    );

    if (!serverEntry) {
      throw new Error(`No MCP server found for tool: ${request.toolName}`);
    }

    const [serverName, serverInstance] = serverEntry;

    logger.info('Executing tool on MCP server', {
      toolName: request.toolName,
      serverName,
      parameters: request.parameters
    });

    // Call tool via MCP client
    const result = await serverInstance.client.callTool({
      name: request.toolName,
      arguments: request.parameters
    });

    logger.info('Tool execution complete', {
      toolName: request.toolName,
      serverName,
      success: true
    });

    return result;
  }

  /**
   * Create an approval request for a high-risk tool call
   */
  private createApprovalRequest(
    toolCall: ToolCallRequest,
    permissionCheck: PermissionCheckResult
  ): ApprovalRequest {
    const id = `approval_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + this.approvalTimeout).toISOString();

    return {
      id,
      toolCall,
      permissionCheck,
      status: 'pending',
      createdAt,
      expiresAt
    };
  }

  /**
   * Approve a pending tool call
   */
  async approveToolCall(approvalId: string, approvedBy: string): Promise<ToolCallResponse> {
    const approval = this.pendingApprovals.get(approvalId);

    if (!approval) {
      throw new Error(`Approval request not found: ${approvalId}`);
    }

    if (approval.status !== 'pending') {
      throw new Error(`Approval already ${approval.status}`);
    }

    if (new Date() > new Date(approval.expiresAt)) {
      approval.status = 'expired';
      throw new Error('Approval request expired');
    }

    logger.info('Approval granted', { approvalId, approvedBy, toolCall: approval.toolCall });

    approval.status = 'approved';
    approval.resolvedAt = new Date().toISOString();
    approval.resolvedBy = approvedBy;

    // Execute the approved tool call
    const result = await this.executeTool(approval.toolCall);

    this.pendingApprovals.delete(approvalId);

    return {
      requestId: approval.toolCall.requestId,
      success: true,
      data: result,
      executionTime: 0,
      approvalRequired: false,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reject a pending tool call
   */
  rejectToolCall(approvalId: string, rejectedBy: string): void {
    const approval = this.pendingApprovals.get(approvalId);

    if (!approval) {
      throw new Error(`Approval request not found: ${approvalId}`);
    }

    if (approval.status !== 'pending') {
      throw new Error(`Approval already ${approval.status}`);
    }

    logger.info('Approval rejected', { approvalId, rejectedBy, toolCall: approval.toolCall });

    approval.status = 'rejected';
    approval.resolvedAt = new Date().toISOString();
    approval.resolvedBy = rejectedBy;

    this.pendingApprovals.delete(approvalId);
  }

  /**
   * Get all pending approval requests
   */
  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values()).filter(a => a.status === 'pending');
  }

  /**
   * Get connected servers and their tools
   */
  getStatus(): {
    connected: number;
    servers: Array<{
      id: string;
      name: string;
      description: string;
      enabled: boolean;
      connected: boolean;
      toolsCount: number;
      tools: Array<{ name: string; description: string; inputSchema: unknown }>;
    }>;
  } {
    const servers = this.serverConfigs.map((config) => {
      const instance = this.servers.get(config.name);
      return {
        id: config.name,
        name: config.name,
        description: config.description || `MCP Server ${config.name}`,
        enabled: config.enabled,
        connected: instance?.connected ?? false,
        toolsCount: instance?.tools.length ?? 0,
        tools: instance?.tools ?? []
      };
    });

    return {
      connected: servers.filter(s => s.connected).length,
      servers
    };
  }

  /**
   * Disconnect all servers
   */
  async disconnectAll(): Promise<void> {
    logger.info('Disconnecting all MCP servers...');

    const names = Array.from(this.servers.keys());
    for (const name of names) {
      await this.disconnectServer(name);
    }
    logger.info('All MCP servers disconnected');
  }
}
