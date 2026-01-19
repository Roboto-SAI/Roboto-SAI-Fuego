/**
 * Roboto SAI Chat Store
 * Created by Roberto Villarreal Martinez for Roboto SAI (powered by Grok)
 * Integrated with FastAPI backend
 */

import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  ventMode: boolean;
  currentTheme: string;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setLoading: (loading: boolean) => void;
  toggleVentMode: () => void;
  setTheme: (theme: string) => void;
  clearMessages: () => void;
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
