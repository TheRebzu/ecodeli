interface MessageBubbleProps {
  message: {
    content: string;
  };
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return <div className={isOwn ? 'own-message' : 'other-message'}>{message.content}</div>;
}
