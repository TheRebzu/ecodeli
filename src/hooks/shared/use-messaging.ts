import { useEffect } from "react";
import { api } from "@/hooks/system/use-trpc";
import { useMessagingStore } from "@/store/use-verification-store";
import { useSocket } from "@/hooks/system/use-socket";

export function useMessaging(conversationId?: string) {
  const socket = useSocket();
  const { setConversations, setMessages, addMessage } = useMessagingStore();

  // Requêtes tRPC
  const conversationsQuery = api.messaging.getConversations.useQuery();
  const messagesQuery = conversationId
    ? api.messaging.getMessages.useQuery({ conversationId })
    : { data: undefined, isLoading: false };

  // Mutation pour envoyer un message
  const sendMessageMutation = api.messaging.sendMessage.useMutation();

  useEffect(() => {
    if (conversationsQuery.data) {
      setConversations(conversationsQuery.data);
    }
  }, [conversationsQuery.data, setConversations]);

  useEffect(() => {
    if (messagesQuery.data) {
      setMessages(conversationId!, messagesQuery.data);
    }
  }, [messagesQuery.data, conversationId, setMessages]);

  // Écouter les nouveaux messages via socket
  useEffect(() => {
    if (socket && conversationId) {
      socket.on("message", (message) => {
        addMessage(conversationId, message);
      });

      return () => {
        socket.off("message");
      };
    }
  }, [socket, conversationId, addMessage]);

  const sendMessage = async (content: string) => {
    if (!conversationId) return;

    await sendMessageMutation.mutateAsync({
      conversationId,
      content,
    });
  };

  return {
    conversations: conversationsQuery.data,
    messages: messagesQuery.data,
    isLoadingConversations: conversationsQuery.isLoading,
    isLoadingMessages: messagesQuery.isLoading,
    sendMessage,
    createConversation: api.messaging.createConversation.useMutation(),
  };
}
