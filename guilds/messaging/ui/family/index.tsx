import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Button, Card } from '@openconnect/ui';

interface Conversation {
  id: string;
  incarceratedPerson: { firstName: string; lastName: string };
  messages: { body: string }[];
}

interface Message {
  id: string;
  senderType: 'incarcerated' | 'family';
  body: string;
  status: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function apiFetch(path: string, options?: RequestInit): Promise<any> {
  const token = localStorage.getItem('token');
  return fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  }).then(r => r.json());
}

function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newPersonId, setNewPersonId] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch('/auth/me').then(data => {
      if (data.success) setUserId(data.data.id);
    });
    apiFetch('/messaging/conversations').then(data => {
      if (data.success) setConversations(data.data);
    });
  }, []);

  const startConversation = async () => {
    if (!newPersonId.trim() || !userId) return;
    const data = await apiFetch('/messaging/conversations', {
      method: 'POST',
      body: JSON.stringify({ incarceratedPersonId: newPersonId, familyMemberId: userId }),
    });
    if (data.success) {
      setShowNew(false);
      setNewPersonId('');
      navigate(data.data.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <Button size="sm" onClick={() => setShowNew(v => !v)}>New Message</Button>
      </div>

      {showNew && (
        <Card padding="md">
          <p className="text-sm font-medium text-gray-700 mb-2">Start a new conversation</p>
          <p className="text-xs text-gray-500 mb-2">Enter the ID of the incarcerated person you want to message:</p>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={newPersonId}
            onChange={e => setNewPersonId(e.target.value)}
            placeholder="Incarcerated person ID"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={startConversation} disabled={!newPersonId.trim()}>Start</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {conversations.length === 0 && !showNew ? (
        <Card padding="lg">
          <p className="text-center text-gray-500 py-8">No conversations yet. Click "New Message" to get started.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map(conv => (
            <button key={conv.id} onClick={() => navigate(conv.id)} className="w-full text-left">
              <Card padding="md" className="hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {conv.incarceratedPerson.firstName} {conv.incarceratedPerson.lastName}
                    </p>
                    {conv.messages[0] && (
                      <p className="text-sm text-gray-500 mt-1 truncate">{conv.messages[0].body}</p>
                    )}
                  </div>
                  <span className="text-gray-400 text-lg">›</span>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ConversationThread() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) return;
    apiFetch('/messaging/conversations').then(data => {
      if (data.success) setConv(data.data.find((c: Conversation) => c.id === conversationId) ?? null);
    });
    apiFetch(`/messaging/conversations/${conversationId}/messages`).then(data => {
      if (data.success) setMessages(data.data);
    });
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || !conversationId) return;
    setSending(true);
    const data = await apiFetch('/messaging/send', {
      method: 'POST',
      body: JSON.stringify({ conversationId, body: text }),
    });
    if (data.success) {
      setMessages(prev => [...prev, data.data]);
      setText('');
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
          ← Back
        </button>
        {conv && (
          <h1 className="text-xl font-bold text-gray-900">
            {conv.incarceratedPerson.firstName} {conv.incarceratedPerson.lastName}
          </h1>
        )}
      </div>

      <Card padding="none">
        <div className="h-[500px] overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-gray-400 text-sm mt-8">No messages yet. Say hello!</p>
          )}
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.senderType === 'family' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-sm px-3 py-2 rounded-2xl text-sm ${
                  msg.senderType === 'family'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p>{msg.body}</p>
                <p className={`text-xs mt-1 ${msg.senderType === 'family' ? 'text-blue-200' : 'text-gray-400'}`}>
                  {msg.status === 'pending_review' ? 'Pending review' : msg.status}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="border-t p-3 flex gap-2 items-end">
          <textarea
            className="flex-1 border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button onClick={send} loading={sending} disabled={!text.trim()}>
            Send
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function MessagingFamily() {
  return (
    <Routes>
      <Route index element={<ConversationList />} />
      <Route path=":conversationId" element={<ConversationThread />} />
    </Routes>
  );
}
