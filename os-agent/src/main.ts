/**
 * Roboto SAI OS Agent - Main Entry Point
 * 
 * Initializes and starts the MCP OS Agent:
 * - Loads configuration
 * - Initializes permission middleware
 * - Creates MCP host and connects to servers
 * - Starts API server
 */

import { McpHost, McpServerConfig } from './mcpHost.js';
import { PermissionMiddleware } from './permissions.js';
import { createApi } from './api.js';
import winston from 'winston';
import path from 'path';

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';
      return `${timestamp} [${level}]: ${message} ${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'os-agent.log' })
  ]
});

/**
 * MCP Server Configurations
 * 
 * Define MCP servers for different capabilities:
 * - filesystem: File operations on R:/D:/ drives
 * - browser: Web automation with full access
 * - twitter: Twitter operations (posting, reading)
 * - email: Email sending with notifications
 */
const MCP_SERVER_CONFIGS: McpServerConfig[] = [
  {
    name: 'filesystem',
    description: 'Scoped filesystem server for secure disk access',
    command: 'node',
    args: ['/app/fs-server/dist/index.js'],
    env: {
      ALLOWED_DRIVES: 'R:,D:',
      ALLOW_READ: 'true',
      ALLOW_WRITE: 'true'
    },
    enabled: true
  },
  {
    name: 'browser',
    description: 'Headless browser automation server',
    command: 'python3',
    args: ['-m', 'mcp_servers.browser_server'],
    env: {
      PYTHONPATH: '/app',
      BROWSER_HEADLESS: process.env.BROWSER_HEADLESS || 'true',
      BROWSER_TIMEOUT: process.env.BROWSER_TIMEOUT || '30000'
    },
    enabled: false  // Disabled until playwright dependency is resolved
  },
  {
    name: 'twitter',
    description: 'Twitter posting and browsing server',
    command: 'python3',
    args: ['-m', 'mcp_servers.twitter_server'],
    env: {
      TWITTER_API_KEY: process.env.TWITTER_API_KEY || '',
      TWITTER_API_SECRET: process.env.TWITTER_API_SECRET || ''
    },
    enabled: process.env.ENABLE_TWITTER === 'true'
  },
  {
    name: 'email',
    description: 'Outbound email server',
    command: 'python3',
    args: ['-m', 'mcp_servers.email_server'],
    env: {
      SMTP_HOST: process.env.SMTP_HOST || '',
      SMTP_PORT: process.env.SMTP_PORT || '587',
      SMTP_USER: process.env.SMTP_USER || '',
      SMTP_PASS: process.env.SMTP_PASS || ''
    },
    enabled: process.env.ENABLE_EMAIL === 'true'
  }
];

/**
 * Initialize and start OS agent
 */
async function main(): Promise<void> {
  try {
    logger.info('🤖 Roboto SAI OS Agent starting...');
    logger.info('MCP Protocol Host - Scoped Trust Model B');
    
    // Load configuration from environment
    const PORT = parseInt(process.env.PORT || '5055', 10);
    const HOST = process.env.HOST || '0.0.0.0';

    logger.info('Configuration loaded', { port: PORT, host: HOST });

    // Initialize permission middleware
    logger.info('Initializing permission middleware...');
    const permissionMiddleware = new PermissionMiddleware({
      filesystem: {
        allowedDrives: ['R:', 'D:'],
        allowRead: true,
        allowWrite: true
      },
      browser: {
        allowFullAutomation: true
      },
      twitter: {
        allowPosting: true,
        allowAccountCreation: false
      },
      email: {
        allowSending: true,
        requireNotification: true
      },
      autoApproveLowRisk: process.env.AUTO_APPROVE_LOW_RISK !== 'false'
    });
    logger.info('✅ Permission middleware initialized');

    // Create MCP host
    logger.info('Creating MCP host...');
    const statePath = process.env.MCP_SERVER_STATE_PATH
      || path.resolve(process.cwd(), 'data', 'mcp-server-state.json');
    const mcpHost = new McpHost(MCP_SERVER_CONFIGS, permissionMiddleware, statePath);
    await mcpHost.loadServerState();
    logger.info('✅ MCP host created');

    // Connect to MCP servers
    logger.info('Connecting to MCP servers...');
    try {
      await mcpHost.connectAll();
      const status = mcpHost.getStatus();
      logger.info('✅ MCP servers connected', {
        connected: status.connected,
        total: status.servers.length,
        servers: status.servers.map(s => ({ name: s.name, tools: s.toolsCount }))
      });
    } catch (error) {
      logger.error('Failed to connect to MCP servers', {
        error: error instanceof Error ? error.message : String(error)
      });
      logger.warn('Some servers may not be available, but continuing with connected servers');
    }

    // Create and start API server
    logger.info('Starting API server...');
    const app = createApi(mcpHost, permissionMiddleware, PORT);

    const server = app.listen(PORT, HOST, () => {
      logger.info('✅ API server started', {
        host: HOST,
        port: PORT,
        url: `http://${HOST}:${PORT}`
      });
      logger.info('📡 Endpoints available:');
      logger.info('  - GET  /health                    - Health check');
      logger.info('  - GET  /api/status                - OS agent status');
      logger.info('  - POST /api/tools/call            - Execute tool call');
      logger.info('  - GET  /api/approvals/pending     - Get pending approvals');
      logger.info('  - POST /api/approvals/action      - Approve/reject tool call');
      logger.info('  - GET  /api/servers               - Get MCP servers info');
      logger.info('  - POST /api/permissions/check     - Check permission');
      logger.info('🚀 Roboto SAI OS Agent ready!');
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(() => {
        logger.info('API server closed');
      });

      await mcpHost.disconnectAll();
      logger.info('MCP servers disconnected');

      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', { reason });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start OS agent', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
     });
    process.exit(1);
  }
}

// Start the agent
main().catch((error) => {
  logger.error('Fatal error', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});
