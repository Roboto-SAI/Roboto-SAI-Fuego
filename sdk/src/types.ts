/**
 * RobotoClient SDK Shared Types
 */

export type ChatEventType =
  | 'assistant_message'
  | 'tool_call'
  | 'tool_result'
  | 'approval_required'
  | 'error';

export interface AssistantMessageData {
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  source: 'backend' | 'mcp';
  serverId?: string;
  toolName: string;
  description?: string;
  args: Record<string, unknown>;
}

export interface ToolResultData {
  toolCall: ToolCall;
  result: unknown;
  raw?: McpToolResponse;
}

export interface ApprovalRequiredData {
  approvalId: string;
  expiresAt?: string;
  toolCall: ToolCall;
  permissionCheck?: PermissionCheckResult;
}

export interface ErrorEventData {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ChatEvent<T = unknown> {
  type: ChatEventType;
  id: string;
  timestamp: number;
  data: T;
}

export type ChatEventPayload =
  | ChatEvent<AssistantMessageData>
  | ChatEvent<ToolCall>
  | ChatEvent<ToolResultData>
  | ChatEvent<ApprovalRequiredData>
  | ChatEvent<ErrorEventData>;

export interface PermissionCheckResult {
  allowed: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  requiresApproval: boolean;
  metadata?: Record<string, unknown>;
}

export interface ApprovalRequest {
  id: string;
  toolCall: ToolCall;
  expiresAt?: string;
  permissionCheck?: PermissionCheckResult;
}

export interface McpToolResponse {
  requestId?: string;
  success: boolean;
  data?: unknown;
  error?: string;
  approvalRequired?: boolean;
  approvalId?: string;
  expiresAt?: string;
  timestamp?: string;
  executionTime?: number;
  toolCall?: ToolCall;
  permissionCheck?: PermissionCheckResult;
}

export interface RobotoClientConfig {
  backendBaseUrl: string;
  osAgentBaseUrl: string;
  defaultHeaders?: Record<string, string>;
  userId?: string;
}

export interface McpServer {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  connected: boolean;
  toolsCount: number;
  tools: McpTool[];
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  context?: Record<string, unknown>;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
