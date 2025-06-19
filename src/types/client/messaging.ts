/**
 * Types unifiés pour le système de messagerie client EcoDeli
 * Conforme au cahier des charges et aux besoins temps réel
 */

// Types de base pour les participants
export interface MessageParticipant {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: "CLIENT" | "DELIVERER" | "MERCHANT" | "PROVIDER" | "ADMIN";
  status: "online" | "offline" | "away";
  lastSeen?: Date;
}

// Types pour les messages
export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  conversationId: string;
  type: "text" | "image" | "file" | "location" | "delivery_update" | "system";
  createdAt: Date;
  updatedAt: Date;
  readAt?: Date;
  deliveredAt?: Date;
  editedAt?: Date;
  replyTo?: {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
  };
  attachments?: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    url: string;
    thumbnail?: string;
  }>;
  metadata?: {
    deliveryId?: string;
    announcementId?: string;
    serviceId?: string;
    coordinates?: {
      lat: number;
      lng: number;
      address: string;
    };
  };
  sender: MessageParticipant;
  receiver: MessageParticipant;
}

// Types pour les conversations
export interface Conversation {
  id: string;
  type: "direct" | "group" | "support";
  title?: string;
  description?: string;
  participants: MessageParticipant[];
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    createdAt: Date;
    type: Message["type"];
  };
  unreadCount: number;
  totalMessages: number;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
  mutedUntil?: Date;
  pinned: boolean;
  tags?: string[];
  metadata?: {
    deliveryId?: string;
    announcementId?: string;
    serviceId?: string;
    subject?: string;
    priority?: "low" | "normal" | "high" | "urgent";
  };
}

// Types pour l'état temps réel
export interface MessageStatus {
  messageId: string;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  timestamp: Date;
  error?: string;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: Date;
}

export interface PresenceStatus {
  userId: string;
  status: "online" | "offline" | "away";
  lastSeen: Date;
  deviceInfo?: {
    type: "mobile" | "desktop" | "tablet";
    browser?: string;
  };
}

// Types pour les filtres et la recherche
export interface MessageFilters {
  search?: string;
  participantId?: string;
  type?: Message["type"][];
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasAttachments?: boolean;
  isUnread?: boolean;
  tags?: string[];
}

export interface ConversationFilters {
  search?: string;
  type?: Conversation["type"][];
  hasUnreadMessages?: boolean;
  isArchived?: boolean;
  isPinned?: boolean;
  tags?: string[];
  participantRole?: MessageParticipant["role"][];
}

// Types pour les données de création
export interface CreateMessageData {
  conversationId: string;
  content: string;
  type?: Message["type"];
  replyToId?: string;
  attachments?: Array<{
    fileName: string;
    fileType: string;
    fileSize: number;
    content: string; // Base64 encoded
  }>;
  metadata?: Message["metadata"];
}

export interface CreateConversationData {
  type: Conversation["type"];
  participantIds: string[];
  title?: string;
  description?: string;
  metadata?: Conversation["metadata"];
}

// Types pour les réponses API
export interface MessagesResponse {
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  conversation: Conversation;
}

export interface ConversationsResponse {
  conversations: Conversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  unreadTotal: number;
}

// Types pour les notifications temps réel
export interface MessageNotification {
  id: string;
  type: "new_message" | "message_read" | "typing_start" | "typing_stop" | "user_online" | "user_offline";
  data: Message | MessageStatus | TypingIndicator | PresenceStatus;
  timestamp: Date;
}

// Types pour les paramètres de messagerie
export interface MessagingPreferences {
  enableSoundNotifications: boolean;
  enableDesktopNotifications: boolean;
  enableEmailNotifications: boolean;
  autoMarkAsRead: boolean;
  showReadReceipts: boolean;
  showTypingIndicators: boolean;
  showOnlineStatus: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string; // HH:mm format
  };
  blockedUsers: string[];
  archiveAfterDays?: number;
}

// Types pour les statistiques de messagerie
export interface MessagingStats {
  totalConversations: number;
  totalMessages: number;
  unreadMessages: number;
  averageResponseTime: number; // in minutes
  mostActiveConversation: {
    id: string;
    title: string;
    messageCount: number;
  };
  dailyMessageCount: Array<{
    date: Date;
    count: number;
  }>;
  messagesByType: Array<{
    type: Message["type"];
    count: number;
    percentage: number;
  }>;
}

// Helpers et utilitaires
export const getParticipantName = (conversation: Conversation, currentUserId: string): string => {
  if (conversation.type === "group") {
    return conversation.title || "Conversation de groupe";
  }
  
  const otherParticipant = conversation.participants.find(p => p.id !== currentUserId);
  return otherParticipant?.name || "Utilisateur inconnu";
};

export const getParticipantAvatar = (conversation: Conversation, currentUserId: string): string | undefined => {
  if (conversation.type === "group") {
    return undefined; // Use default group avatar
  }
  
  const otherParticipant = conversation.participants.find(p => p.id !== currentUserId);
  return otherParticipant?.image;
};

export const formatMessageTime = (date: Date): string => {
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInHours * 60);
    return diffInMinutes < 1 ? "À l'instant" : `Il y a ${diffInMinutes}min`;
  } else if (diffInHours < 24) {
    return date.toLocaleTimeString("fr-FR", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  } else if (diffInHours < 168) { // 7 days
    return date.toLocaleDateString("fr-FR", { 
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  } else {
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
};

export const getMessageStatusIcon = (status: MessageStatus["status"]) => {
  switch (status) {
    case "sending":
      return "⏳";
    case "sent":
      return "✓";
    case "delivered":
      return "✓✓";
    case "read":
      return "✓✓";
    case "failed":
      return "❌";
    default:
      return "";
  }
};

export const getPresenceStatusColor = (status: PresenceStatus["status"]) => {
  switch (status) {
    case "online":
      return "bg-green-500";
    case "away":
      return "bg-yellow-500";
    case "offline":
      return "bg-gray-400";
    default:
      return "bg-gray-400";
  }
};

export const isMessageRecent = (date: Date, minutesThreshold = 5): boolean => {
  const now = new Date();
  const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
  return diffInMinutes <= minutesThreshold;
};

export const groupMessagesByDate = (messages: Message[]): Record<string, Message[]> => {
  return messages.reduce((groups, message) => {
    const dateKey = message.createdAt.toLocaleDateString("fr-FR");
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    return groups;
  }, {} as Record<string, Message[]>);
};

// Types pour les actions en lot
export interface BulkMessageAction {
  action: "mark_read" | "mark_unread" | "archive" | "delete" | "mute" | "pin";
  messageIds?: string[];
  conversationIds?: string[];
  parameters?: Record<string, any>;
}

export interface BulkActionResult {
  success: boolean;
  affectedCount: number;
  errors?: Array<{
    id: string;
    error: string;
  }>;
}