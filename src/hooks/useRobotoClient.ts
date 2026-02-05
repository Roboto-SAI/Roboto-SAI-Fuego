import { useCallback, useEffect, useState } from 'react';
import {
  ApprovalRequiredData,
  ChatEventPayload,
  McpServer,
  RobotoClient,
  RobotoClientConfig
} from '../../sdk/src';

const ROBOTO_CONFIG: RobotoClientConfig = {
  backendBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  osAgentBaseUrl: import.meta.env.VITE_OS_AGENT_URL || 'http://localhost:5055'
};

const TOOL_STATE_STORAGE_KEY = 'roboto_mcp_tool_allowlist';

const buildToolKey = (serverId: string, toolName: string) => `${serverId}:${toolName}`;

const loadStoredToolState = () => {
  if (typeof window === 'undefined') {
    return {} as Record<string, boolean>;
  }
  try {
    const raw = window.localStorage.getItem(TOOL_STATE_STORAGE_KEY);
    if (!raw) {
      return {} as Record<string, boolean>;
    }
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {} as Record<string, boolean>;
  }
};

interface ChatStreamRequest {
  message: string;
  sessionId?: string;
  context?: Record<string, unknown>;
  reasoningEffort?: string;
  userId?: string;
}

export function useRobotoClient() {
  const [client] = useState(() => new RobotoClient(ROBOTO_CONFIG));
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [events, setEvents] = useState<ChatEventPayload[]>([]);
  const [pendingApproval, setPendingApproval] = useState<ApprovalRequiredData | null>(null);
  const [servers, setServers] = useState<McpServer[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [togglingServers, setTogglingServers] = useState<Record<string, boolean>>({});
  const [allowedTools, setAllowedTools] = useState<Record<string, boolean>>(loadStoredToolState);

  const refreshConnections = useCallback(async () => {
    setIsChecking(true);
    try {
      const [backendOk, osAgentOk] = await Promise.all([client.testBackend(), client.testOsAgent()]);
      setIsConnected(backendOk && osAgentOk);
    } catch (error) {
      console.error('Connection test failed', error);
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  }, [client]);

  useEffect(() => {
    void refreshConnections();
  }, [refreshConnections]);

  useEffect(() => {
    client.setToolPolicy((toolCall) => {
      const key = buildToolKey(toolCall.serverId ?? 'mcp', toolCall.toolName);
      if (allowedTools[key] === false) {
        return {
          allowed: false,
          reason: `Tool disabled in MCP dashboard: ${toolCall.toolName}`
        };
      }
      return { allowed: true };
    });
  }, [client, allowedTools]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(TOOL_STATE_STORAGE_KEY, JSON.stringify(allowedTools));
  }, [allowedTools]);

  const handleEvent = useCallback((event: ChatEventPayload) => {
    setEvents((prev) => [...prev, event].slice(-80));
    if (event.type === 'approval_required') {
      setPendingApproval(event.data);
    } else if (event.type === 'tool_result') {
      setPendingApproval(null);
    }
  }, []);

  const sendMessage = useCallback(async (
    payload: ChatStreamRequest,
    onEvent?: (event: ChatEventPayload) => void
  ) => {
    try {
      for await (const event of client.streamChat(payload)) {
        handleEvent(event);
        onEvent?.(event);
      }
    } catch (error) {
      handleEvent({
        type: 'error',
        id: `err_${Date.now()}`,
        timestamp: Date.now(),
        data: {
          message: (error as Error).message,
          details: error
        }
      });
    }
  }, [client, handleEvent]);

  const approveAction = useCallback(async (approvalId: string) => {
    try {
      const result = await client.approveAction(approvalId);
      handleEvent({
        type: 'tool_result',
        id: `approval_success_${approvalId}`,
        timestamp: Date.now(),
        data: {
          toolCall: pendingApproval?.toolCall ?? {
            id: approvalId,
            source: 'mcp',
            toolName: '',
            args: {}
          },
          result: result.data,
          raw: result
        }
      });
      setPendingApproval(null);
      return result;
    } catch (error) {
      handleEvent({
        type: 'error',
        id: `approval_error_${approvalId}`,
        timestamp: Date.now(),
        data: {
          message: (error as Error).message,
          details: error
        }
      });
      throw error;
    }
  }, [client, handleEvent, pendingApproval]);

  const denyAction = useCallback(async (approvalId: string) => {
    try {
      await client.denyAction(approvalId);
      setPendingApproval(null);
    } catch (error) {
      handleEvent({
        type: 'error',
        id: `approval_reject_error_${approvalId}`,
        timestamp: Date.now(),
        data: {
          message: (error as Error).message,
          details: error
        }
      });
      throw error;
    }
  }, [client, handleEvent]);

  const toggleTool = useCallback((serverId: string, toolName: string, enabled: boolean) => {
    const key = buildToolKey(serverId, toolName);
    setAllowedTools((prev) => ({
      ...prev,
      [key]: enabled
    }));
  }, []);

  const fetchServers = useCallback(async () => {
    try {
      const list = await client.listMcpServers();
      setServers(list);
      setServerError(null);
    } catch (error) {
      console.error('Failed to load MCP servers', error);
      setServerError((error as Error).message);
    }
  }, [client]);

  const toggleServer = useCallback(async (serverId: string, enabled: boolean) => {
    setTogglingServers((prev) => ({ ...prev, [serverId]: true }));
    try {
      const updated = await client.setMcpServerEnabled(serverId, enabled);
      setServers((prev) =>
        prev.map((server) =>
          server.id === serverId && updated
            ? { ...server, ...updated }
            : server
        )
      );
      setServerError(null);
      return updated;
    } catch (error) {
      setServerError((error as Error).message);
      throw error;
    } finally {
      setTogglingServers((prev) => ({ ...prev, [serverId]: false }));
    }
  }, [client]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return {
    client,
    isConnected,
    isChecking,
    events,
    pendingApproval,
    servers,
    serverError,
    togglingServers,
    allowedTools,
    refreshConnections,
    fetchServers,
    toggleServer,
    sendMessage,
    approveAction,
    denyAction,
    clearEvents,
    toggleTool
  };
}
