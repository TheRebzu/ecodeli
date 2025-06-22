"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Icons
import {
  Send,
  Search,
  MessageCircle,
  User,
  Clock,
  Loader2,
  AlertCircle,
  CheckCheck,
  Check} from "lucide-react";

// Types
interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  conversationId: string;
  createdAt: Date;
  readAt?: Date;
  sender: {
    id: string;
    name: string;
    image?: string;
  };
}

interface Conversation {
  id: string;
  participants: Array<{
    id: string;
    name: string;
    image?: string;
    role: string;
  }>;
  lastMessage?: {
    content: string;
    createdAt: Date;
    senderId: string;
  };
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Composant pour la liste des conversations
const ConversationList = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  searchTerm,
  onSearchChange,
  isLoading}: {
  conversations: Conversation[];
  selectedConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isLoading: boolean;
}) => {
  const t = useTranslations("messages");
  const { data } = useSession();

  const filteredConversations = conversations.filter((conversation) =>
    conversation.participants.some((participant) =>
      participant.name.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find((p) => p.id !== data?.user?.id);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"});
    } else if (diffInHours < 168) {
      // 7 days
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          {t("conversations")}
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchConversations")}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchTerm ? t("noConversationsFound") : t("noConversations")}
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const otherParticipant = getOtherParticipant(conversation);
              const isSelected = conversation.id === selectedConversationId;

              return (
                <div key={conversation.id}>
                  <button
                    onClick={() => onSelectConversation(conversation.id)}
                    className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                      isSelected ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={otherParticipant?.image} />
                        <AvatarFallback>
                          {otherParticipant?.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium truncate">
                            {otherParticipant?.name}
                          </p>
                          {conversation.lastMessage && (
                            <span className="text-xs text-muted-foreground">
                              {formatTime(conversation.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage?.content ||
                              t("noMessages")}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {otherParticipant?.role}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </button>
                  <Separator />
                </div>
              );
            })
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// Composant pour afficher les messages d'une conversation
const MessageView = ({
  conversationId,
  messages,
  onSendMessage,
  isLoading,
  isSending}: {
  conversationId: string;
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  isSending: boolean;
}) => {
  const t = useTranslations("messages");
  const { data } = useSession();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth"  });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim() && !isSending) {
      onSendMessage(newMessage.trim());
      setNewMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isMyMessage = (message: Message) => {
    return message.senderId === data?.user?.id;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle>{t("messages")}</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              {t("noMessagesYet")}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isMyMsg = isMyMessage(message);
                return (
                  <div
                    key={message.id}
                    className={`flex ${isMyMsg ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex items-start gap-2 max-w-[80%] ${isMyMsg ? "flex-row-reverse" : ""}`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.sender.image} />
                        <AvatarFallback className="text-xs">
                          {message.sender.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div
                        className={`rounded-lg p-3 ${
                          isMyMsg
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <div
                          className={`flex items-center gap-1 mt-1 ${
                            isMyMsg ? "justify-end" : "justify-start"
                          }`}
                        >
                          <span
                            className={`text-xs ${
                              isMyMsg
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatMessageTime(message.createdAt)}
                          </span>
                          {isMyMsg && (
                            <div className="text-primary-foreground/70">
                              {message.readAt ? (
                                <CheckCheck className="h-3 w-3" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <Separator className="my-4" />

        <div className="flex gap-2">
          <Textarea
            placeholder={t("typeMessage")}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="resize-none"
            rows={2}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
            size="sm"
            className="self-end"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Composant principal
export function ClientMessaging() {
  const t = useTranslations("messages");
  const router = useRouter();
  const [selectedConversationId, setSelectedConversationId] =
    useState<string>();
  const [searchTerm, setSearchTerm] = useState("");

  // Récupérer les conversations
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    refetch: refetchConversations} = api.common.messaging.getConversations.useQuery();

  // Récupérer les messages de la conversation sélectionnée
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    refetch: refetchMessages} = api.common.messaging.getMessages.useQuery(
    { conversationId: selectedConversationId! },
    { enabled: !!selectedConversationId },
  );

  // Mutation pour envoyer un message
  const sendMessageMutation = api.common.messaging.sendMessage.useMutation({
    onSuccess: () => {
      refetchMessages();
      refetchConversations();
    }});

  // Mutation pour marquer comme lu
  const markAsReadMutation = api.common.messaging.markAsRead.useMutation({
    onSuccess: () => {
      refetchConversations();
    }});

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    // Marquer comme lu
    markAsReadMutation.mutate({ conversationId  });
  };

  const handleSendMessage = (content: string) => {
    if (selectedConversationId) {
      sendMessageMutation.mutate({ conversationId: selectedConversationId,
        content });
    }
  };

  // Sélectionner automatiquement la première conversation
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Liste des conversations */}
      <div className="lg:col-span-1">
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          isLoading={isLoadingConversations}
        />
      </div>

      {/* Vue des messages */}
      <div className="lg:col-span-2">
        {selectedConversationId ? (
          <MessageView
            conversationId={selectedConversationId}
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoadingMessages}
            isSending={sendMessageMutation.isPending}
          />
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">{t("selectConversation")}</p>
              <p className="text-sm">{t("selectConversationHint")}</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
