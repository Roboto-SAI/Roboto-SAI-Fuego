/**
 * RobotoClient SDK Implementation
 * Handles chat events, tool calls, approvals, and MCP orchestration.
 */

import {
  ApprovalRequiredData,
  ChatEventPayload,
  McpServer,
  McpToolResponse,
  RobotoClientConfig,
  ToolCall,
  ToolResultData
} from './types';

interface StreamChatParams {
  message: string;
  sessionId?: string;
  context?: Record<string, unknown>;
  reasoningEffort?: string;
  userId?: string;
}

interface McpToolCallOptions {
  userId?: string;
  sessionId?: string;
  serverId?: string;
  description?: string;
  toolCallId?: string;
  source?: 'backend' | 'mcp' | 'user';
  onApprovalRequired?: (details: ApprovalRequiredData) => void;
}

interface PendingApprovalEntry {
  approvalId: string;
  toolCall: ToolCall;
  resolve: (result: McpToolResponse) => void;
  reject: (error: Error) => void;
  createdAt: number;
}

interface ToolPolicyDecision {
  allowed: boolean;
  reason?: string;
}

export class RobotoClient {
  private readonly config: RobotoClientConfig;
  private readonly pendingApprovals = new Map<string, PendingApprovalEntry>();
  private readonly headers: Record<string, string>;
  private toolPolicy: ((toolCall: ToolCall) => ToolPolicyDecision) | null = null;

  constructor(config: RobotoClientConfig) {
    this.config = config;
    this.headers = {
      'Content-Type': 'application/json',
      ...(config.defaultHeaders ?? {})
    };
  }

  setToolPolicy(policy: ((toolCall: ToolCall) => ToolPolicyDecision) | null): void {
    this.toolPolicy = policy;
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private createErrorEvent(message: string, details?: unknown): ChatEventPayload {
    return {
      type: 'error',
      id: this.generateId(),
      timestamp: Date.now(),
      data: {
        message,
        details,
      }
    };
  }

  private normalizeEvent(raw: any): ChatEventPayload {
    const base = {
      id: typeof raw.id === 'string' ? raw.id : this.generateId(),
      timestamp: typeof raw.timestamp === 'number' ? raw.timestamp : Date.now(),
    };

    switch (raw?.type) {
      case 'assistant_message':
        return {
          ...base,
          type: 'assistant_message',
          data: {
            content: typeof raw.data?.content === 'string' ? raw.data.content : '',
            metadata: raw.data?.metadata ?? {}
          }
        };
      case 'tool_call':
        return {
          ...base,
          type: 'tool_call',
          data: raw.data as ToolCall
        };
      case 'tool_result':
        return {
          ...base,
          type: 'tool_result',
          data: raw.data as ToolResultData
        };
      case 'approval_required':
        return {
          ...base,
          type: 'approval_required',
          data: raw.data as ApprovalRequiredData
        };
      default:
        return {
          ...base,
          type: 'error',
          data: {
            message: 'Unknown event received',
            details: raw
          }
        };
    }
  }

  private async fetchJson<T>(url: string, options: RequestInit): Promise<T> {
    const response = await fetch(url, options);
    const json = await response.json();
    if (!response.ok) {
      const message = typeof json?.error === 'string'
        ? json.error
        : json?.detail ?? response.statusText;
      throw new Error(message || 'Request failed');
    }
    return json as T;
  }

  async *streamChat(params: StreamChatParams): AsyncGenerator<ChatEventPayload> {
    const body = {
      message: params.message,
      session_id: params.sessionId,
      reasoning_effort: params.reasoningEffort ?? 'medium',
      context: params.context ?? {},
      user_id: params.userId ?? this.config.userId,
      timestamp: Date.now()
    };

    let payload: any;
    try {
      const response = await fetch(`${this.config.backendBaseUrl.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        headers: this.headers,
        credentials: 'include',
        body: JSON.stringify(body)
      });

      payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail ?? payload?.error ?? 'Chat stream failed');
      }
    } catch (error) {
      yield this.createErrorEvent((error as Error).message, error);
      return;
    }

    const rawEvents = Array.isArray(payload?.events)
      ? payload.events
      : [
          {
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'assistant_message',
            data: {
              content: payload.reply || payload.response || payload.content || 'Roboto responded.'
            }
          }
        ];

    const events: ChatEventPayload[] = rawEvents.map(event => this.normalizeEvent(event));

    for (const event of events) {
      yield event;
      if (event.type === 'tool_call') {
        if (this.toolPolicy) {
          const decision = this.toolPolicy(event.data);
          if (!decision.allowed) {
            yield this.createErrorEvent(
              decision.reason ?? 'Tool disabled by policy',
              event.data
            );
            continue;
          }
        }
        const toolEvents = await this.processToolCall(
          event.data,
          { userId: params.userId ?? this.config.userId, sessionId: params.sessionId }
        );
        for (const toolEvent of toolEvents) {
          yield toolEvent;
        }
      }
    }
  }

  private async processToolCall(toolCall: ToolCall, options: McpToolCallOptions): Promise<ChatEventPayload[]> {
    const events: ChatEventPayload[] = [];
    try {
      const result = await this.executeToolCall(toolCall, {
        ...options,
        onApprovalRequired: (approvalPayload) => {
          events.push({
            type: 'approval_required',
            id: this.generateId(),
            timestamp: Date.now(),
            data: approvalPayload
          });
        }
      });

      if (result.success) {
        events.push({
          type: 'tool_result',
          id: this.generateId(),
          timestamp: Date.now(),
          data: {
            toolCall,
            result: result.data,
            raw: result
          }
        });
      } else {
        events.push(this.createErrorEvent(result.error ?? 'MCP tool call failed', result));
      }
    } catch (error) {
      events.push(this.createErrorEvent((error as Error).message, error));
    }

    return events;
  }

  private waitForApproval(details: ApprovalRequiredData): Promise<McpToolResponse> {
    return new Promise((resolve, reject) => {
      if (!details.approvalId) {
        return reject(new Error('Missing approval identifier'));
      }

      const entry: PendingApprovalEntry = {
        approvalId: details.approvalId,
        toolCall: details.toolCall,
        resolve,
        reject,
        createdAt: Date.now()
      };

      this.pendingApprovals.set(details.approvalId, entry);
    });
  }

  async callBackendTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`${this.config.backendBaseUrl.replace(/\/$/, '')}/api/tools/${toolName}`, {
      method: 'POST',
      headers: this.headers,
      credentials: 'include',
      body: JSON.stringify(args)
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.error ?? payload?.detail ?? 'Backend tool failed');
    }

    return response.json();
  }

  async callMcpTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>,
    options: McpToolCallOptions = {}
  ): Promise<McpToolResponse> {
    const body = {
      toolName,
      parameters: args,
      userId: options.userId,
      sessionId: options.sessionId
    };

    const response = await fetch(`${this.config.osAgentBaseUrl.replace(/\/$/, '')}/api/tools/call`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body)
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 202 && payload?.requiresApproval) {
        return {
          success: false,
          approvalRequired: true,
          approvalId: payload?.data?.approvalId ?? options.toolCallId ?? '',
          expiresAt: payload?.data?.expiresAt,
          data: payload?.data,
          permissionCheck: payload?.data?.permissionCheck,
          toolCall: payload?.data?.toolCall,
        } as McpToolResponse;
      }
      throw new Error(payload?.error ?? 'MCP tool call failed');
    }

    return (payload?.data ?? {}) as McpToolResponse;
  }

  private async executeToolCall(
    toolCall: ToolCall,
    options: McpToolCallOptions = {}
  ): Promise<McpToolResponse> {
    const resolvedServerId = options.serverId ?? toolCall.serverId ?? '';
    const response = await this.callMcpTool(
      resolvedServerId,
      toolCall.toolName,
      toolCall.args,
      {
        userId: options.userId,
        sessionId: options.sessionId,
      }
    );

    if (response.approvalRequired && response.approvalId) {
      const approvalPayload: ApprovalRequiredData = {
        approvalId: response.approvalId,
        expiresAt: response.expiresAt,
        toolCall,
        permissionCheck: response.permissionCheck,
      };

      options.onApprovalRequired?.(approvalPayload);
      return this.waitForApproval(approvalPayload);
    }

    return response;
  }

  async performToolCall(
    toolCall: ToolCall,
    options: McpToolCallOptions = {}
  ): Promise<McpToolResponse> {
    if (this.toolPolicy) {
      const decision = this.toolPolicy(toolCall);
      if (!decision.allowed) {
        throw new Error(decision.reason ?? 'Tool disabled by policy');
      }
    }
    return this.executeToolCall(toolCall, options);
  }

  async listMcpServers(): Promise<McpServer[]> {
    const response = await this.fetchJson<{ data: { servers: McpServer[] } }>(
      `${this.config.osAgentBaseUrl.replace(/\/$/, '')}/api/servers`,
      {
        method: 'GET',
        headers: this.headers
      }
    );

    return response.data.servers ?? [];
  }

  async setMcpServerEnabled(serverId: string, enabled: boolean): Promise<McpServer | null> {
    const response = await this.fetchJson<{ data: { server: McpServer | null } }>(
      `${this.config.osAgentBaseUrl.replace(/\/$/, '')}/api/servers/toggle`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ serverId, enabled })
      }
    );

    return response.data.server ?? null;
  }

  async approveAction(approvalId: string, userId?: string): Promise<McpToolResponse> {
    const entry = this.pendingApprovals.get(approvalId);
    if (!entry) {
      throw new Error(`Approval ${approvalId} not found`);
    }

    try {
      const body = {
        approvalId,
        action: 'approve',
        userId
      };

      const response = await fetch(`${this.config.osAgentBaseUrl.replace(/\/$/, '')}/api/approvals/action`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body)
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Approval approval failed');
      }

      const result = (payload?.data ?? payload) as McpToolResponse;
      entry.resolve(result);
      this.pendingApprovals.delete(approvalId);
      return result;
    } catch (error) {
      entry.reject(error as Error);
      this.pendingApprovals.delete(approvalId);
      throw error;
    }
  }

  async denyAction(approvalId: string, userId?: string): Promise<void> {
    const entry = this.pendingApprovals.get(approvalId);
    if (!entry) {
      throw new Error(`Approval ${approvalId} not found`);
    }

    try {
      const body = {
        approvalId,
        action: 'reject',
        userId
      };

      const response = await fetch(`${this.config.osAgentBaseUrl.replace(/\/$/, '')}/api/approvals/action`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? 'Approval rejection failed');
      }

      entry.reject(new Error('Action denied by user')); 
      this.pendingApprovals.delete(approvalId);
    } catch (error) {
      entry.reject(error as Error);
      this.pendingApprovals.delete(approvalId);
      throw error;
    }
  }

  async testBackend(): Promise<boolean> {
    return this.safePing(`${this.config.backendBaseUrl.replace(/\/$/, '')}/api/health`);
  }

  async testOsAgent(): Promise<boolean> {
    return this.safePing(`${this.config.osAgentBaseUrl.replace(/\/$/, '')}/health`);
  }

  private async safePing(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'GET', headers: this.headers });
      return response.ok;
    } catch {
      return false;
    }
  }
}