/**
 * REST API for MCP OS Agent
 * 
 * Exposes HTTP endpoints for:
 * - Tool call execution
 * - Approval management
 * - Status monitoring
 * - Server information
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import winston from 'winston';
import { McpHost, ToolCallRequest } from './mcpHost.js';
import { PermissionMiddleware } from './permissions.js';
import { z } from 'zod';

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'api.log' })
  ]
});

/**
 * Tool call request schema
 */
const ToolCallRequestSchema = z.object({
  toolName: z.string(),
  parameters: z.record(z.unknown()),
  userId: z.string().optional(),
  sessionId: z.string().optional()
});

/**
 * Approval action schema
 */
const ApprovalActionSchema = z.object({
  approvalId: z.string(),
  action: z.enum(['approve', 'reject']),
  userId: z.string()
});

const ServerToggleSchema = z.object({
  serverId: z.string(),
  enabled: z.boolean()
});

/**
 * Create Express API for MCP OS Agent
 */
export function createApi(
  mcpHost: McpHost,
  permissionMiddleware: PermissionMiddleware,
  port: number = 5055
): express.Application {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5000', 'http://localhost:8080'],
    credentials: true
  }));
  app.use(express.json());

  // Request logging middleware
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info('API request', {
      method: req.method,
      path: req.path,
      ip: req.ip
    });
    next();
  });

  /**
   * Health check endpoint
   */
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  /**
   * Get OS agent status
   */
  app.get('/api/status', (_req: Request, res: Response) => {
    try {
      const status = mcpHost.getStatus();
      res.json({
        success: true,
        data: {
          ...status,
          permissionModel: 'scoped_trust_model_b',
          uptime: process.uptime()
        }
      });
    } catch (error) {
      logger.error('Status endpoint error', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({
        success: false,
        error: 'Failed to get status'
      });
    }
  });

  /**
   * Execute a tool call
   */
  app.post('/api/tools/call', async (req: Request, res: Response) => {
    try {
      // Validate request body
      const parsed = ToolCallRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: parsed.error.errors
        });
      }

      const { toolName, parameters, userId, sessionId } = parsed.data;

      // Generate request ID
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Create tool call request
      const toolCallRequest: ToolCallRequest = {
        toolName,
        parameters,
        userId,
        sessionId,
        requestId
      };

      logger.info('Tool call initiated', { requestId, toolName, userId });

      // Execute tool call
      const result = await mcpHost.callTool(toolCallRequest);

      // Return response
      if (result.success) {
        return res.json({
          success: true,
          data: result
        });
      } else {
        // If approval required, return 202 Accepted
        if (result.approvalRequired) {
          return res.status(202).json({
            success: false,
            requiresApproval: true,
            data: result
          });
        } else {
          return res.status(400).json({
            success: false,
            error: result.error,
            data: result
          });
        }
      }
    } catch (error) {
      logger.error('Tool call error', {
        error: error instanceof Error ? error.message : String(error)
      });
      return res.status(500).json({
        success: false,
        error: 'Tool call failed'
      });
    }
  });

  /**
   * Get pending approvals
   */
  app.get('/api/approvals/pending', (_req: Request, res: Response) => {
    try {
      const pending = mcpHost.getPendingApprovals();
      res.json({
        success: true,
        data: {
          count: pending.length,
          approvals: pending
        }
      });
    } catch (error) {
      logger.error('Get pending approvals error', {
        error: error instanceof Error ? error.message : String(error)
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get pending approvals'
      });
    }
  });

  /**
   * Approve or reject a tool call
   */
  app.post('/api/approvals/action', async (req: Request, res: Response) => {
    try {
      // Validate request body
      const parsed = ApprovalActionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: parsed.error.errors
        });
      }

      const { approvalId, action, userId } = parsed.data;

      logger.info('Approval action requested', { approvalId, action, userId });

      if (action === 'approve') {
        const result = await mcpHost.approveToolCall(approvalId, userId);
        return res.json({
          success: true,
          data: result
        });
      } else {
        mcpHost.rejectToolCall(approvalId, userId);
        return res.json({
          success: true,
          message: 'Tool call rejected'
        });
      }
    } catch (error) {
      logger.error('Approval action error', {
        error: error instanceof Error ? error.message : String(error)
      });
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Approval action failed'
      });
    }
  });

  /**
   * Get MCP servers information
   */
  app.get('/api/servers', (_req: Request, res: Response) => {
    try {
      const status = mcpHost.getStatus();
      res.json({
        success: true,
        data: {
          connected: status.connected,
          total: status.servers.length,
          servers: status.servers
        }
      });
    } catch (error) {
      logger.error('Get servers error', {
        error: error instanceof Error ? error.message : String(error)
      });
      res.status(500).json({
        success: false,
        error: 'Failed to get server information'
      });
    }
  });

  /**
   * Enable or disable an MCP server
   */
  app.post('/api/servers/toggle', async (req: Request, res: Response) => {
    try {
      const parsed = ServerToggleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: parsed.error.errors
        });
      }

      const { serverId, enabled } = parsed.data;
      await mcpHost.setServerEnabled(serverId, enabled);

      const status = mcpHost.getStatus();
      const server = status.servers.find((entry) => entry.id === serverId);

      return res.json({
        success: true,
        data: {
          server,
          status
        }
      });
    } catch (error) {
      logger.error('Toggle server error', {
        error: error instanceof Error ? error.message : String(error)
      });
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update server state'
      });
    }
  });

  /**
   * Check permission for a tool call (without executing)
   */
  app.post('/api/permissions/check', async (req: Request, res: Response) => {
    try {
      // Validate request body
      const parsed = ToolCallRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: parsed.error.errors
        });
      }

      const { toolName, parameters, userId, sessionId } = parsed.data;

      // Check permission
      const permissionCheck = await permissionMiddleware.checkPermission({
        toolName,
        parameters,
        userId,
        sessionId
      });

      return res.json({
        success: true,
        data: permissionCheck
      });
    } catch (error) {
      logger.error('Permission check error', {
        error: error instanceof Error ? error.message : String(error)
      });
      return res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  });

  /**
   * Error handling middleware
   */
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error', {
      error: err.message,
      stack: err.stack,
      path: req.path
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  });

  /**
   * 404 handler
   */
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found'
    });
  });

  logger.info('API created', { port });

  return app;
}
