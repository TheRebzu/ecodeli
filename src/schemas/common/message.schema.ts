import { z } from "zod";

export const messageSchema = z.object({ conversationId: z.string(),
  content: z.string().min(1, "Le message ne peut pas être vide") });

export const conversationSchema = z.object({ recipientId: z.string(),
  initialMessage: z.string().optional() });

export type MessageSchemaType = z.infer<typeof messageSchema>;
export type ConversationSchemaType = z.infer<typeof conversationSchema>;
