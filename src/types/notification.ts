export type NotificationType =
  | 'DOCUMENT_SUBMISSION'
  | 'DOCUMENT_APPROVED'
  | 'DOCUMENT_REJECTED'
  | 'SYSTEM'
  | 'USER'
  | 'ANNOUNCEMENT'
  | 'DELIVERY'
  | 'VERIFICATION';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string | null;
  data?: string | null;
  read: boolean;
  readAt?: Date | null;
  createdAt: Date;
}
