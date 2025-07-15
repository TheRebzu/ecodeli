import React, { useEffect, useRef, useState } from 'react';

interface ChatBoxProps {
  contextType: 'DELIVERY' | 'BOOKING' | 'SUPPORT' | 'CONTRACT' | 'GENERAL';
  contextId: string;
  className?: string;
}

interface ChatMessage {
  id: string;
  sender: {
    id: string;
    name?: string | null;
    role: string;
    profile?: { avatar?: string };
  };
  message: string;
  createdAt: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ contextType, contextId, className }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Récupère les messages
  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chat?contextType=${contextType}&contextId=${contextId}`);
      if (!res.ok) throw new Error('Erreur chargement messages');
      const data = await res.json();
      setMessages(data);
      setError(null);
    } catch (e) {
      setError('Impossible de charger les messages');
    } finally {
      setLoading(false);
    }
  };

  // Envoi d'un message
  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextType, contextId, message: input }),
      });
      if (!res.ok) throw new Error('Erreur envoi message');
      setInput('');
      await fetchMessages();
    } catch (e) {
      setError('Erreur lors de l\'envoi du message');
    } finally {
      setSending(false);
    }
  };

  // Polling
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [contextType, contextId]);

  // Scroll auto uniquement lors de l'envoi d'un message
  const prevMessagesLength = useRef<number>(0);
  useEffect(() => {
    // Scroll uniquement si un message a été ajouté (envoi utilisateur)
    if (messages.length > prevMessagesLength.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLength.current = messages.length;
  }, [messages]);

  return (
    <div className={`border rounded-lg bg-white shadow p-4 flex flex-col h-96 ${className || ''}`}>
      <div className="font-bold mb-2">Chat</div>
      <div className="flex-1 overflow-y-auto mb-2 bg-gray-50 rounded p-2">
        {loading ? (
          <div className="text-gray-400 text-center">Chargement...</div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : messages.length === 0 ? (
          <div className="text-gray-400 text-center">Aucun message</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`mb-2 flex ${msg.sender.role === 'CLIENT' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs px-3 py-2 rounded-lg shadow text-sm ${msg.sender.role === 'CLIENT' ? 'bg-blue-100 text-blue-900' : msg.sender.role === 'DELIVERER' ? 'bg-green-100 text-green-900' : 'bg-gray-200 text-gray-800'}`}>
                <div className="font-semibold mb-1 flex items-center gap-2">
                  {msg.sender.profile?.avatar && (
                    <img src={msg.sender.profile.avatar} alt="avatar" className="w-5 h-5 rounded-full" />
                  )}
                  {msg.sender.name || msg.sender.role}
                </div>
                <div>{msg.message}</div>
                <div className="text-xs text-gray-400 mt-1 text-right">{new Date(msg.createdAt).toLocaleTimeString()}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="flex gap-2 mt-2">
        <input
          type="text"
          className="flex-1 border rounded px-2 py-1"
          placeholder="Votre message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
          maxLength={500}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50"
          disabled={sending || !input.trim()}
        >
          Envoyer
        </button>
      </form>
    </div>
  );
};

export default ChatBox; 