/**
 * Roboto SAI Chat Page
 * Created by Roberto Villarreal Martinez for Roboto SAI (powered by Grok)
 * The heart of the empire - where fire meets conversation
 * Connected to FastAPI backend with xAI Grok integration
 */

import { useRef, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore, FileAttachment } from '@/stores/chatStore';
import { useMemoryStore } from '@/stores/memoryStore';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { EmberParticles } from '@/components/effects/EmberParticles';
import { Header } from '@/components/layout/Header';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { VoiceMode } from '@/components/chat/VoiceMode';
import { Flame, Skull, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/ui/use-toast';
import { useRobotoClient } from '@/hooks/useRobotoClient';
import ChatPanel from '@/components/ChatPanel';
import ToolApprovalModal from '@/components/ToolApprovalModal';
import McpServerManager from '@/components/McpServerManager';
import McpAppFrame from '@/components/McpAppFrame';

type ChatApiResponse = {
  reply?: string;
  response?: string;
  content?: string;
  error?: string;
  detail?: string;
  roboto_message_id?: string;
  user_message_id?: string;
};

const Chat = () => {
const navigate = useNavigate();
const { toast } = useToast();
const { userId, isLoggedIn, username, email } = useAuthStore();
const {
  getMessages,
  isLoading,
  ventMode,
  voiceMode,
  currentTheme,
  addMessage,
  setLoading,
  toggleVentMode,
  toggleVoiceMode,
  agentMode,
  toggleAgentMode,
  getAllConversationsContext,
  loadUserHistory,
  userId: storeUserId
} = useChatStore();

const { buildContextForAI, addMemory, addConversationSummary, trackEntity, isReady: memoryReady } = useMemoryStore();

const {
  events,
  pendingApproval,
  servers,
  serverError,
  togglingServers,
  allowedTools,
  fetchServers,
  toggleServer,
  sendMessage: streamMessage,
  approveAction,
  denyAction,
  toggleTool
} = useRobotoClient();

  const messages = getMessages();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const rainDrops = useMemo(
    () =>
      Array.from({ length: 20 }).map(() => {
        const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
        return {
          id,
          left: `${Math.random() * 100}%`,
          height: `${Math.random() * 100 + 50}px`,
          duration: Math.random() * 2 + 1,
          delay: Math.random() * 2,
        };
      }),
    []
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // refreshSession handled by RequireAuth

  useEffect(() => {
    if (!isLoggedIn) return;
    if (userId && userId !== storeUserId) {
      loadUserHistory(userId);
    }
  }, [isLoggedIn, userId, storeUserId, loadUserHistory]);

  useEffect(() => {
    void fetchServers();
  }, [fetchServers]);

  // Extract and store important information from conversations
  const extractMemories = async (userMessage: string, robotoResponse: string, sessionId: string) => {
    // Extract potential entities (simple pattern matching - can be enhanced)
    const namePattern = /(?:my (?:name is|friend|brother|sister|mom|dad|wife|husband|partner|boss|colleague) (?:is )?|I'm |I am )([A-Z][a-z]+)/gi;
    let match;
    while ((match = namePattern.exec(userMessage)) !== null) {
      const entityName = match[1];
      const entityType = userMessage.toLowerCase().includes('name is') ? 'self' : 'person';
      await trackEntity(entityName, entityType, userMessage);
    }

    // Detect preferences (simple heuristics)
    const preferencePatterns = [
      { pattern: /I (?:really )?(?:love|like|prefer|enjoy) (.+?)(?:\.|,|!|$)/i, type: 'likes' },
      { pattern: /I (?:hate|dislike|don't like|can't stand) (.+?)(?:\.|,|!|$)/i, type: 'dislikes' },
      { pattern: /I'm (?:a|an) (.+?)(?:\.|,|!|$)/i, type: 'identity' },
    ];

    for (const { pattern, type } of preferencePatterns) {
      const prefMatch = userMessage.match(pattern);
      if (prefMatch) {
        await addMemory(
          `User ${type}: ${prefMatch[1]}`,
          'preferences',
          1.2,
          { source: sessionId, extractedFrom: userMessage }
        );
      }
    }
  };

  const displayChatError = (errorMessage: string) => {
    let title = "Connection Error";
    let description = "The eternal fire flickers but does not die. Please try again.";

    if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      title = "API Endpoint Not Found";
      description = "The chat endpoint is not available. Grok API may be unavailable. Check your deployment configuration.";
    } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      title = "Authentication Required";
      description = "Your session has expired. Please log in again.";
      setTimeout(() => navigate('/login'), 2000);
    } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      title = "Access Denied";
      description = "You don't have permission to access this resource.";
    } else if (errorMessage.includes('503') || errorMessage.includes('Service Unavailable')) {
      title = "Service Temporarily Unavailable";
      description = "Grok API is currently unavailable. This may be due to rate limits or API access issues. Try again in a moment.";
    } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      title = "Request Timeout";
      description = "The request took too long. Please check your internet connection and try again.";
    } else if (errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
      title = "Network Error";
      description = "Cannot connect to the server. Please check your internet connection.";
    } else if (errorMessage.includes('Could not connect to Grok API')) {
      title = "Grok API Unavailable";
      description = "The AI service is currently unavailable. The backend may need configuration or Grok API access.";
    } else if (errorMessage.length > 0 && errorMessage !== 'Connection error') {
      description = errorMessage;
    }

    toast({
      variant: "destructive",
      title,
      description,
    });
  };

  const handleSend = async (content: string, attachments?: FileAttachment[]) => {
    if (!isLoggedIn || !userId) {
      navigate('/login');
      return;
    }

    setLoading(true);

    const conversationId = addMessage({ role: 'user', content, attachments });
    const sessionId = conversationId;

    const conversationContext = getAllConversationsContext();
    const memoryContext = memoryReady ? buildContextForAI(content) : '';
    const combinedContext = memoryContext
      ? `${memoryContext}\n\n## Recent Conversation\n${conversationContext}`
      : conversationContext;

    const contextPayload = {
      user_name: username || email?.split('@')[0] || userId || 'user',
      conversation_context: combinedContext,
    };

    try {
      await streamMessage(
        {
          message: content,
          context: contextPayload,
          sessionId,
          userId,
          reasoningEffort: 'high'
        },
        (event) => {
          if (event.type === 'assistant_message') {
            const robotoContent = event.data.content || 'Roboto responded.';
            addMessage({
              role: 'roboto',
              content: robotoContent,
              id: event.id
            });
            if (memoryReady) {
              void extractMemories(content, robotoContent, sessionId);
            }
          } else if (event.type === 'tool_call') {
            addMessage({
              role: 'roboto',
              content: `Tool requested: ${event.data.toolName} (${event.data.serverId ?? 'mcp'})`
            });
          } else if (event.type === 'tool_result') {
            const payloadText = typeof event.data.result === 'string'
              ? event.data.result
              : JSON.stringify(event.data.result, null, 2);
            addMessage({
              role: 'roboto',
              content: `Tool result (${event.data.toolCall.toolName}): ${payloadText}`
            });
          } else if (event.type === 'error') {
            const message = typeof event.data.message === 'string'
              ? event.data.message
              : 'An error occurred during the chat stream.';
            displayChatError(message);
          }
        }
      );
    } catch (error) {
      console.error('[Chat] handleSend error', error);
      const errorMessage = error instanceof Error ? error.message : 'Connection error';
      displayChatError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceTranscript = (text: string, role: 'user' | 'roboto') => {
    addMessage({ role, content: text });
  };

  return (
    <div className={`min-h-screen flex flex-col ${ventMode ? 'vent-mode shake' : ''}`}>
      {/* Chat Sidebar */}
      <ChatSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <Header />

      {/* MCP Server Snapshot */}
      <div className="px-4 pt-2">
        <McpServerManager
          servers={servers}
          error={serverError}
          onRefresh={fetchServers}
          onToggle={toggleServer}
          togglingServers={togglingServers}
        />
      </div>

      {/* Sidebar Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSidebarOpen(true)}
        aria-label="Toggle Sidebar"
        className="fixed left-4 top-20 z-30 bg-card/80 backdrop-blur-sm border border-border/50 hover:bg-fire/10 hover:border-fire/30"
      >
        <MessageSquare className="w-5 h-5" />
      </Button>

      {/* Ember Particles */}
      <EmberParticles count={ventMode ? 50 : 15} isVentMode={ventMode} />

      {/* Voice Mode Overlay */}
      <VoiceMode
        isActive={voiceMode}
        onClose={toggleVoiceMode}
        onTranscript={handleVoiceTranscript}
      />

      {/* Chat Container */}
      <main className="flex-1 flex flex-col pt-16">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto max-w-4xl px-4 py-6 pl-16">
            {/* Welcome Message if empty */}
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20"
              >
                <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 ${ventMode
                  ? 'bg-blood/20 border border-blood/30'
                  : 'bg-gradient-to-br from-fire/20 to-blood/20 border border-fire/30 animate-pulse-fire'
                  }`}>
                  {ventMode ? (
                    <Skull className="w-12 h-12 text-blood" />
                  ) : (
                    <Flame className="w-12 h-12 text-fire" />
                  )}
                </div>
                <h2 className="font-display text-2xl md:text-3xl text-fire mb-4">
                  {ventMode ? 'VENT MODE ACTIVE' : 'Welcome to Roboto SAI'}
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-2">
                  {ventMode
                    ? 'The rage flows through the circuits. Speak your fury.'
                    : 'The eternal flame awaits your words. Speak, and the Regio-Aztec genome shall respond.'
                  }
                </p>
                <p className="text-sm text-fire/60">
                  {currentTheme} • Connected to Grok AI
                </p>
              </motion.div>
            )}

            {/* Messages */}
            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
              </AnimatePresence>

              {/* Typing Indicator */}
              <AnimatePresence>
                {isLoading && <TypingIndicator />}
              </AnimatePresence>
            </div>

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <ChatInput
          onSend={handleSend}
          disabled={isLoading}
          ventMode={ventMode}
          onVentToggle={toggleVentMode}
          voiceMode={voiceMode}
          onVoiceToggle={toggleVoiceMode}
          agentMode={agentMode}
          onAgentToggle={toggleAgentMode}
        />

        {/* Event Panel */}
        <div className="w-full px-4 pt-4">
          <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
            <ChatPanel events={events} />
            <McpAppFrame
              servers={servers}
              allowedTools={allowedTools}
              onToggleTool={toggleTool}
            />
          </div>
        </div>
      </main>

      <ToolApprovalModal
        approval={pendingApproval ?? undefined}
        open={Boolean(pendingApproval)}
        onApprove={() => pendingApproval && approveAction(pendingApproval.approvalId)}
        onDeny={() => pendingApproval && denyAction(pendingApproval.approvalId)}
      />

      {/* Vent Mode Blood Rain Effect */}
      {ventMode && (
        <div className="fixed inset-0 pointer-events-none z-40">
          <div className="absolute inset-0 bg-blood/5" />
          {rainDrops.map((drop) => (
            <motion.div
              key={drop.id}
              className="absolute w-0.5 bg-gradient-to-b from-blood/60 to-transparent"
              style={{
                left: drop.left,
                height: drop.height,
              }}
              initial={{ y: -100, opacity: 0 }}
              animate={{
                y: '100vh',
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: drop.duration,
                repeat: Infinity,
                delay: drop.delay,
                ease: 'linear',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Chat;
