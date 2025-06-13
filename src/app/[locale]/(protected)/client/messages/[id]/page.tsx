"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  Image as ImageIcon,
  Check,
  CheckCheck,
} from "lucide-react";

// UI Components
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

import { api } from "@/trpc/react";

// Types
interface Message {
  id: string;
  content: string;
  timestamp: Date;
  isFromMe: boolean;
  isRead: boolean;
  type: "text" | "image" | "file";
  attachments?: {
    name: string;
    url: string;
    type: string;
  }[];
}

interface Conversation {
  id: string;
  participant: {
    id: string;
    name: string;
    image?: string;
    isOnline: boolean;
    lastSeen?: Date;
  };
  messages: Message[];
  lastMessage?: Message;
  isTyping: boolean;
}

export default async function ClientMessageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = useTranslations("messages");
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Utilisation de tRPC pour récupérer la conversation
  const conversationQuery = api.client.messages.getConversation.useQuery(
    { conversationId: id },
    {
      refetchOnWindowFocus: false,
      refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
    },
  );

  const sendMessageMutation = api.client.messages.sendMessage.useMutation({
    onSuccess: () => {
      conversationQuery.refetch();
    },
  });

  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const conversation = conversationQuery.data;

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isLoading || !conversation) return;

    setIsLoading(true);
    setNewMessage("");

    try {
      await sendMessageMutation.mutateAsync({
        conversationId: conversation.id,
        content: newMessage.trim(),
        type: "text",
      });
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
      // Restaurer le message en cas d'erreur
      setNewMessage(newMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return format(date, "HH:mm");
  };

  const formatLastSeen = (date: Date) => {
    return format(date, "d MMM 'à' HH:mm", { locale: fr });
  };

  if (conversationQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">
            {t("loadingConversation")}
          </p>
        </div>
      </div>
    );
  }

  if (conversationQuery.error || !conversation) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive">{t("errorLoadingConversation")}</p>
          <Button
            variant="outline"
            onClick={() => conversationQuery.refetch()}
            className="mt-2"
          >
            {t("retry")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* En-tête de la conversation */}
      <Card className="rounded-b-none border-b-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <Avatar className="h-10 w-10">
                <AvatarImage src={conversation.participant.image} />
                <AvatarFallback>
                  {conversation.participant.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold">
                    {conversation.participant.name}
                  </h1>
                  {conversation.participant.isOnline && (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800"
                    >
                      {t("online")}
                    </Badge>
                  )}
                </div>
                {!conversation.participant.isOnline &&
                  conversation.participant.lastSeen && (
                    <p className="text-sm text-muted-foreground">
                      {t("lastSeen")}{" "}
                      {formatLastSeen(conversation.participant.lastSeen)}
                    </p>
                  )}
                {conversation.isTyping && (
                  <p className="text-sm text-blue-600">{t("typing")}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Video className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Zone des messages */}
      <Card className="flex-1 rounded-none border-y-0 flex flex-col">
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {conversation.messages.map((message, index) => {
                const showTimestamp =
                  index === 0 ||
                  conversation.messages[index - 1].timestamp.getTime() -
                    message.timestamp.getTime() >
                    300000; // 5 minutes

                return (
                  <div key={message.id}>
                    {showTimestamp && (
                      <div className="text-center my-4">
                        <span className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                          {format(
                            message.timestamp,
                            "EEEE d MMMM yyyy 'à' HH:mm",
                            { locale: fr },
                          )}
                        </span>
                      </div>
                    )}

                    <div
                      className={`flex ${message.isFromMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] ${message.isFromMe ? "order-2" : "order-1"}`}
                      >
                        <div
                          className={`p-3 rounded-lg ${
                            message.isFromMe
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>

                        <div
                          className={`flex items-center gap-1 mt-1 ${
                            message.isFromMe ? "justify-end" : "justify-start"
                          }`}
                        >
                          <span className="text-xs text-muted-foreground">
                            {formatTime(message.timestamp)}
                          </span>
                          {message.isFromMe && (
                            <div className="text-muted-foreground">
                              {message.isRead ? (
                                <CheckCheck className="h-3 w-3 text-blue-500" />
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
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Zone de saisie */}
      <Card className="rounded-t-none border-t-0">
        <CardContent className="p-4">
          <div className="flex items-end gap-2">
            <Button variant="ghost" size="sm">
              <Paperclip className="h-4 w-4" />
            </Button>

            <div className="flex-1">
              <Input
                placeholder={t("typeMessage")}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
            </div>

            <Button variant="ghost" size="sm">
              <Smile className="h-4 w-4" />
            </Button>

            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isLoading}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
