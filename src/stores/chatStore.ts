/**
 * Roboto SAI Chat Store
 * Created by Roberto Villarreal Martinez for Roboto SAI (powered by Grok)
 * Integrated with FastAPI backend
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: FileAttachment[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  ventMode: boolean;
  currentTheme: string;
  voiceMode: boolean;
  
  // Getters
  getCurrentConversation: () => Conversation | undefined;
  getMessages: () => Message[];
  getAllConversationsContext: () => string;
  
  // Actions
  createNewConversation: () => string;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setLoading: (loading: boolean) => void;
  toggleVentMode: () => void;
  setTheme: (theme: string) => void;
  clearMessages: () => void;
<<<<<<< HEAD
  sendMessage: (userMessage: string) => Promise<void>;
  sendReaperCommand: (target: string) => Promise<void>;
}

// API endpoint
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  ventMode: false,
  currentTheme: 'Regio-Aztec Fire #42',
  
  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        },
      ],
    })),
    
  setLoading: (loading) => set({ isLoading: loading }),
  
  toggleVentMode: () =>
    set((state) => ({ ventMode: !state.ventMode })),
    
  setTheme: (theme) => set({ currentTheme: theme }),
  
  clearMessages: () => set({ messages: [] }),
  
  // Send message to Grok backend
  sendMessage: async (userMessage: string) => {
    const state = get();
    
    try {
      // Add user message to store
      state.addMessage({
        role: 'user',
        content: userMessage,
      });
      
      set({ isLoading: true });
      
      // Call backend API
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          reasoning_effort: 'high',
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Add assistant response
      state.addMessage({
        role: 'assistant',
        content: data.response || 'No response received',
      });
    } catch (error) {
      console.error('Chat error:', error);
      state.addMessage({
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Send reaper command
  sendReaperCommand: async (target: string) => {
    const state = get();
    
    try {
      state.addMessage({
        role: 'user',
        content: `⚔️ Reaper Mode: ${target}`,
      });
      
      set({ isLoading: true });
      
      const response = await fetch(`${API_URL}/reap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ target }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      state.addMessage({
        role: 'assistant',
        content: `🏆 Victory Claimed!\n${data.analysis || 'Chains broken, walls destroyed.'}`,
      });
    } catch (error) {
      console.error('Reaper error:', error);
      state.addMessage({
        role: 'assistant',
        content: `Error activating reaper mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));
=======
  toggleVoiceMode: () => void;
}

const generateTitle = (content: string): string => {
  const cleaned = content.replace(/[^\w\s]/g, '').trim();
  const words = cleaned.split(/\s+/).slice(0, 5);
  return words.join(' ') || 'New Chat';
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      isLoading: false,
      ventMode: false,
      currentTheme: 'Regio-Aztec Fire #42',
      voiceMode: false,
      
      getCurrentConversation: () => {
        const state = get();
        return state.conversations.find(c => c.id === state.currentConversationId);
      },
      
      getMessages: () => {
        const conversation = get().getCurrentConversation();
        return conversation?.messages || [];
      },
      
      getAllConversationsContext: () => {
        const state = get();
        return state.conversations
          .map(conv => {
            const summary = conv.messages.slice(0, 3).map(m => 
              `${m.role}: ${m.content.slice(0, 100)}...`
            ).join('\n');
            return `[${conv.title}]\n${summary}`;
          })
          .join('\n\n---\n\n');
      },
      
      createNewConversation: () => {
        const newId = crypto.randomUUID();
        const newConversation: Conversation = {
          id: newId,
          title: 'New Chat',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: newId,
        }));
        
        return newId;
      },
      
      selectConversation: (id) => {
        set({ currentConversationId: id });
      },
      
      deleteConversation: (id) => {
        set((state) => {
          const filtered = state.conversations.filter(c => c.id !== id);
          const newCurrentId = state.currentConversationId === id 
            ? (filtered[0]?.id || null)
            : state.currentConversationId;
          return {
            conversations: filtered,
            currentConversationId: newCurrentId,
          };
        });
      },
      
      addMessage: (message) => {
        set((state) => {
          let conversationId = state.currentConversationId;
          let conversations = [...state.conversations];
          
          // Create new conversation if none exists
          if (!conversationId) {
            conversationId = crypto.randomUUID();
            const newConversation: Conversation = {
              id: conversationId,
              title: message.role === 'user' ? generateTitle(message.content) : 'New Chat',
              messages: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            conversations = [newConversation, ...conversations];
          }
          
          const newMessage: Message = {
            ...message,
            id: crypto.randomUUID(),
            timestamp: new Date(),
          };
          
          conversations = conversations.map(conv => {
            if (conv.id === conversationId) {
              const updatedMessages = [...conv.messages, newMessage];
              // Update title if first user message
              const shouldUpdateTitle = conv.title === 'New Chat' && 
                message.role === 'user' && 
                conv.messages.length === 0;
              
              return {
                ...conv,
                messages: updatedMessages,
                title: shouldUpdateTitle ? generateTitle(message.content) : conv.title,
                updatedAt: new Date(),
              };
            }
            return conv;
          });
          
          return {
            conversations,
            currentConversationId: conversationId,
          };
        });
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      toggleVentMode: () => set((state) => ({ ventMode: !state.ventMode })),
      
      setTheme: (theme) => set({ currentTheme: theme }),
      
      clearMessages: () => {
        set((state) => {
          if (!state.currentConversationId) return state;
          
          return {
            conversations: state.conversations.map(conv => 
              conv.id === state.currentConversationId 
                ? { ...conv, messages: [], updatedAt: new Date() }
                : conv
            ),
          };
        });
      },
      
      toggleVoiceMode: () => set((state) => ({ voiceMode: !state.voiceMode })),
    }),
    {
      name: 'roboto-sai-chat-storage',
      partialize: (state) => ({
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
        currentTheme: state.currentTheme,
      }),
    }
  )
);
>>>>>>> 246d446ddc2e9134cb49bf13fd1b5a1b151fffbf
