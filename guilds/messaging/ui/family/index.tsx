import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Card, Button, LoadingSpinner } from '@openconnect/ui';
import { useGuildApi } from '../../../shared/hooks/useGuildApi';

interface IncarceratedPerson {
  firstName: string;
  lastName: string;
}

interface Conversation {
  id: string;
  incarceratedPerson: IncarceratedPerson;
  messages: { body: string; createdAt: string }[];
}

interface Message {
  id: string;
  body: string;
  createdAt: string;
  senderType: 'incarcerated' | 'family';
  status: string;
}

function ConversationList() {
  const { get } = useGuildApi('/api/messaging');
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get('/conversations')
      .then((res) => setConversations(res.data || []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, [get]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
      {conversations.length === 0 ? (
        <Card padding="lg">
          <p className="text-center py-8 text-gray-500">No conversations yet.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => navigate(conv.id)}
              className="w-full text-left bg-white rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    {conv.incarceratedPerson.firstName} {conv.incarceratedPerson.lastName}
                  </p>
                  {conv.messages[0] && (
                    <p className="text-sm text-gray-500 mt-1">
                      {conv.messages[0].body.length > 40
                        ? `${conv.messages[0].body.slice(0, 40)}...`
                        : conv.messages[0].body}
                    </p>
                  )}
                </div>
                {conv.messages[0] && (
                  <span className="text-xs text-gray-400 shrink-0 ml-4">
                    {new Date(conv.messages[0].createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusIndicator({ status }: { status: string }) {
  switch (status) {
    case 'pending_review':
      return <span className="text-xs text-gray-400">(reviewing)</span>;
    case 'approved':
      return <span className="text-xs text-green-500">&#10003;</span>;
    case 'delivered':
      return <span className="text-xs text-blue-500">&#10003;&#10003;</span>;
    case 'read':
      return <span className="text-xs text-blue-500">read</span>;
    default:
      return null;
  }
}

function MessageThread() {
  const { get, post } = useGuildApi('/api/messaging');
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchMessages = useCallback(
    async (targetPage: number, append = false) => {
      try {
        const res = await get(
          `/conversations/${conversationId}/messages?page=${targetPage}&pageSize=30`
        );
        const fetched: Message[] = res.data || [];
        setHasMore(fetched.length === 30);
        if (append) {
          setMessages((prev) => [...fetched, ...prev]);
        } else {
          setMessages(fetched);
        }
      } catch {
        if (!append) setMessages([]);
      } finally {
        setLoading(false);
      }
    },
    [get, conversationId]
  );

  useEffect(() => {
    fetchMessages(1);
  }, [fetchMessages]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages(1);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMessages(nextPage, true);
  };

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text) return;
    setSending(true);
    try {
      await post(`/conversations/${conversationId}/send`, { body: text });
      setMessageText('');
      await fetchMessages(1);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-full min-h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('..')}>
          &#8592; Back
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {hasMore && (
          <div className="text-center">
            <Button variant="secondary" size="sm" onClick={handleLoadMore}>
              Load more
            </Button>
          </div>
        )}

        {messages.map((msg) => {
          const isSent = msg.senderType === 'family';
          return (
            <div
              key={msg.id}
              className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl p-3 ${
                  isSent ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'
                }`}
              >
                <p>{msg.body}</p>
                <div className={`flex items-center gap-2 mt-1 ${isSent ? 'justify-end' : ''}`}>
                  <span className={`text-xs ${isSent ? 'text-blue-100' : 'text-gray-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isSent && <StatusIndicator status={msg.status} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-gray-300 p-2 text-sm resize-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            variant="primary"
            size="md"
            onClick={handleSend}
            loading={sending}
            disabled={!messageText.trim()}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MessagingFamily() {
  return (
    <Routes>
      <Route index element={<ConversationList />} />
      <Route path=":conversationId" element={<MessageThread />} />
    </Routes>
  );
}
