/**
 * Hook unifié pour la gestion de la messagerie client
 * Conforme au cahier des charges avec support temps réel
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { 
  type Conversation, 
  type Message, 
  type CreateMessageData,
  type CreateConversationData,
  type MessageFilters,
  type ConversationFilters,
  type TypingIndicator,
  type PresenceStatus,
  type MessagingPreferences,
  type BulkMessageAction,
  formatMessageTime
} from "@/types/client/messaging";

interface UseClientMessagingOptions {
  enableRealTime?: boolean;
  autoMarkAsRead?: boolean;
  refreshInterval?: number;
}

export function useClientMessaging(options: UseClientMessagingOptions = {}) {
  const {
    enableRealTime = true,
    autoMarkAsRead = true,
    refreshInterval = 30000
  } = options;

  const { data: session } = useSession();
  const { toast } = useToast();

  // État local pour la gestion temps réel
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<PresenceStatus[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "disconnected">("disconnected");
  
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const wsRef = useRef<WebSocket | null>(null);

  // Filtres pour les conversations et messages
  const [conversationFilters, setConversationFilters] = useState<ConversationFilters>({});
  const [messageFilters, setMessageFilters] = useState<MessageFilters>({});

  // API Queries pour les conversations
  const {
    data: conversationsData,
    isLoading: isLoadingConversations,
    error: conversationsError,
    refetch: refetchConversations
  } = api.client.messaging.getConversations.useQuery(
    { 
      filters: conversationFilters,
      page: 1,
      limit: 50
    },
    {
      refetchInterval,
      staleTime: 30000
    }
  );

  // API Query pour les messages de la conversation sélectionnée
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    error: messagesError,
    refetch: refetchMessages
  } = api.client.messaging.getMessages.useQuery(
    {
      conversationId: selectedConversationId!,
      filters: messageFilters,
      page: 1,
      limit: 50
    },
    {
      enabled: !!selectedConversationId,
      refetchInterval: enableRealTime ? refreshInterval : false,
      staleTime: 10000
    }
  );

  // API Query pour les préférences de messagerie
  const {
    data: preferences,
    isLoading: isLoadingPreferences,
    refetch: refetchPreferences
  } = api.client.messaging.getPreferences.useQuery(undefined, {
    staleTime: 300000 // 5 minutes
  });

  // API Query pour les statistiques
  const {
    data: stats,
    isLoading: isLoadingStats,
    refetch: refetchStats
  } = api.client.messaging.getStats.useQuery(undefined, {
    staleTime: 60000 // 1 minute
  });

  // Mutations pour les actions de messagerie
  const sendMessageMutation = api.client.messaging.sendMessage.useMutation({
    onSuccess: (data) => {
      refetchMessages();
      refetchConversations();
      toast({
        title: "Message envoyé",
        description: "Votre message a été envoyé avec succès"
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erreur d'envoi",
        description: error.message || "Impossible d'envoyer le message"
      });
    }
  });

  const createConversationMutation = api.client.messaging.createConversation.useMutation({
    onSuccess: (data) => {
      refetchConversations();
      setSelectedConversationId(data.id);
      toast({
        title: "Conversation créée",
        description: "Nouvelle conversation démarrée"
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erreur de création",
        description: error.message || "Impossible de créer la conversation"
      });
    }
  });

  const markAsReadMutation = api.client.messaging.markAsRead.useMutation({
    onSuccess: () => {
      refetchConversations();
      refetchMessages();
    },
    onError: (error) => {
      console.error("Error marking as read:", error);
    }
  });

  const archiveConversationMutation = api.client.messaging.archiveConversation.useMutation({
    onSuccess: () => {
      refetchConversations();
      toast({
        title: "Conversation archivée",
        description: "La conversation a été archivée"
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erreur d'archivage",
        description: error.message || "Impossible d'archiver la conversation"
      });
    }
  });

  const deleteMessageMutation = api.client.messaging.deleteMessage.useMutation({
    onSuccess: () => {
      refetchMessages();
      refetchConversations();
      toast({
        title: "Message supprimé",
        description: "Le message a été supprimé"
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erreur de suppression",
        description: error.message || "Impossible de supprimer le message"
      });
    }
  });

  const updatePreferencesMutation = api.client.messaging.updatePreferences.useMutation({
    onSuccess: () => {
      refetchPreferences();
      toast({
        title: "Préférences mises à jour",
        description: "Vos préférences de messagerie ont été sauvegardées"
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erreur de sauvegarde",
        description: error.message || "Impossible de sauvegarder les préférences"
      });
    }
  });

  const bulkActionMutation = api.client.messaging.bulkAction.useMutation({
    onSuccess: (result) => {
      refetchConversations();
      refetchMessages();
      toast({
        title: "Action effectuée",
        description: `${result.affectedCount} élément(s) traité(s)`
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erreur d'action groupée",
        description: error.message || "Impossible d'effectuer l'action"
      });
    }
  });

  // WebSocket connection pour le temps réel
  const connectWebSocket = useCallback(() => {
    if (!enableRealTime || !session?.user?.id) return;

    try {
      setConnectionStatus("connecting");
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001"}/messaging`;
      wsRef.current = new WebSocket(`${wsUrl}?userId=${session.user.id}`);

      wsRef.current.onopen = () => {
        setConnectionStatus("connected");
        console.log("WebSocket connected for messaging");
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onclose = () => {
        setConnectionStatus("disconnected");
        console.log("WebSocket disconnected");
        // Tentative de reconnexion après 5 secondes
        setTimeout(connectWebSocket, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionStatus("disconnected");
      };
    } catch (error) {
      console.error("Error connecting WebSocket:", error);
      setConnectionStatus("disconnected");
    }
  }, [enableRealTime, session?.user?.id]);

  // Gestionnaire des messages WebSocket
  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case "new_message":
        refetchMessages();
        refetchConversations();
        if (preferences?.enableSoundNotifications) {
          // Play notification sound
          const audio = new Audio("/sounds/message.mp3");
          audio.play().catch(() => {/* Ignore audio errors */});
        }
        break;

      case "message_read":
        refetchMessages();
        refetchConversations();
        break;

      case "typing_start":
        setTypingUsers(prev => {
          const filtered = prev.filter(t => t.userId !== data.userId);
          return [...filtered, data];
        });
        break;

      case "typing_stop":
        setTypingUsers(prev => prev.filter(t => t.userId !== data.userId));
        break;

      case "user_online":
      case "user_offline":
        setOnlineUsers(prev => {
          const filtered = prev.filter(p => p.userId !== data.userId);
          return [...filtered, data];
        });
        break;

      default:
        console.log("Unknown WebSocket message type:", data.type);
    }
  }, [preferences?.enableSoundNotifications, refetchMessages, refetchConversations]);

  // Fonction pour envoyer un message
  const sendMessage = useCallback(async (data: CreateMessageData) => {
    return sendMessageMutation.mutateAsync(data);
  }, [sendMessageMutation]);

  // Fonction pour créer une conversation
  const createConversation = useCallback(async (data: CreateConversationData) => {
    return createConversationMutation.mutateAsync(data);
  }, [createConversationMutation]);

  // Fonction pour sélectionner une conversation
  const selectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
    
    if (autoMarkAsRead) {
      markAsReadMutation.mutate({ conversationId });
    }
  }, [autoMarkAsRead, markAsReadMutation]);

  // Fonction pour indiquer qu'on tape
  const startTyping = useCallback((conversationId: string) => {
    if (!enableRealTime || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    setIsTyping(true);
    wsRef.current.send(JSON.stringify({
      type: "typing_start",
      conversationId,
      userId: session?.user?.id,
      userName: session?.user?.name
    }));

    // Arrêter l'indication de frappe après 3 secondes
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(conversationId);
    }, 3000);
  }, [enableRealTime, session?.user?.id, session?.user?.name]);

  // Fonction pour arrêter l'indication de frappe
  const stopTyping = useCallback((conversationId: string) => {
    if (!enableRealTime || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    setIsTyping(false);
    wsRef.current.send(JSON.stringify({
      type: "typing_stop",
      conversationId,
      userId: session?.user?.id
    }));

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [enableRealTime, session?.user?.id]);

  // Fonction pour marquer comme lu
  const markAsRead = useCallback((conversationId: string) => {
    markAsReadMutation.mutate({ conversationId });
  }, [markAsReadMutation]);

  // Fonction pour archiver une conversation
  const archiveConversation = useCallback((conversationId: string) => {
    archiveConversationMutation.mutate({ conversationId });
  }, [archiveConversationMutation]);

  // Fonction pour supprimer un message
  const deleteMessage = useCallback((messageId: string) => {
    deleteMessageMutation.mutate({ messageId });
  }, [deleteMessageMutation]);

  // Fonction pour mettre à jour les préférences
  const updatePreferences = useCallback((newPreferences: Partial<MessagingPreferences>) => {
    updatePreferencesMutation.mutate(newPreferences);
  }, [updatePreferencesMutation]);

  // Fonction pour les actions en lot
  const performBulkAction = useCallback((action: BulkMessageAction) => {
    bulkActionMutation.mutate(action);
  }, [bulkActionMutation]);

  // Fonction pour actualiser toutes les données
  const refreshAll = useCallback(async () => {
    await Promise.all([
      refetchConversations(),
      refetchMessages(),
      refetchPreferences(),
      refetchStats()
    ]);
  }, [refetchConversations, refetchMessages, refetchPreferences, refetchStats]);

  // Connexion WebSocket au montage
  useEffect(() => {
    if (enableRealTime) {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [connectWebSocket, enableRealTime]);

  // Nettoyage des indicateurs de frappe obsolètes
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers(prev => prev.filter(t => {
        const age = Date.now() - t.timestamp.getTime();
        return age < 5000; // Supprimer après 5 secondes
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Données dérivées
  const conversations = conversationsData?.conversations || [];
  const messages = messagesData?.messages || [];
  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const unreadCount = conversationsData?.unreadTotal || 0;

  return {
    // Données
    conversations,
    messages,
    selectedConversation,
    selectedConversationId,
    unreadCount,
    preferences,
    stats,
    typingUsers: typingUsers.filter(t => t.conversationId === selectedConversationId),
    onlineUsers,
    connectionStatus,

    // États de chargement
    isLoadingConversations,
    isLoadingMessages,
    isLoadingPreferences,
    isLoadingStats,
    isSending: sendMessageMutation.isPending,
    isCreatingConversation: createConversationMutation.isPending,

    // Erreurs
    conversationsError,
    messagesError,
    error: conversationsError || messagesError,

    // Actions
    sendMessage,
    createConversation,
    selectConversation,
    markAsRead,
    archiveConversation,
    deleteMessage,
    updatePreferences,
    performBulkAction,
    startTyping,
    stopTyping,
    refreshAll,

    // Filtres
    conversationFilters,
    setConversationFilters,
    messageFilters,
    setMessageFilters,

    // Utilitaires
    formatMessageTime,
    
    // WebSocket
    reconnectWebSocket: connectWebSocket
  };
}

export type ClientMessagingHook = ReturnType<typeof useClientMessaging>;