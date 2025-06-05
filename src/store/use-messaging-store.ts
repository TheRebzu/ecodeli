import { create } from 'zustand';

interface MessagingState {
  conversations: any[];
  messagesByConversation: Record<string, any[]>;
  setConversations: (conversations: any[]) => void;
  setMessages: (conversationId: string, messages: any[]) => void;
  addMessage: (conversationId: string, message: any) => void;
}

export const useMessagingStore = create<MessagingState>((set) => ({
  conversations: [],
  messagesByConversation: {},
  setConversations: (conversations) => set({ conversations }),
  setMessages: (conversationId, messages) => set((state) => ({
    messagesByConversation: {
      ...state.messagesByConversation,
      [conversationId]: messages,
    },
  })),
  addMessage: (conversationId, message) => set((state) => {
    const currentMessages = state.messagesByConversation[conversationId] || [];
    return {
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [...currentMessages, message],
      },
    };
  }),
}));