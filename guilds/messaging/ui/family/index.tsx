import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Button, Card } from '@openconnect/ui';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

interface Conversation {
  id: string;
  incarceratedPerson: { id: string; firstName: string; lastName: string };
  messages: { id: string; body: string; senderType: 'incarcerated' | 'family' }[];
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function fireNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

interface ApprovedContact {
  id: string;
  incarceratedPerson: { id: string; firstName: string; lastName: string };
}

interface PendingContact {
  id: string;
  relationship: string;
  requestedAt: string;
  incarceratedPerson: { id: string; firstName: string; lastName: string; externalId: string | null };
}

interface Attachment {
  id: string;
  fileUrl: string;
  fileType: string;
  status: string;
}

interface GalleryItem {
  id: string;
  fileUrl: string;
  status: string;
  createdAt: string;
  message: {
    id: string;
    status: string;
    senderType: 'incarcerated' | 'family';
    conversationId: string;
    createdAt: string;
  };
}

interface Message {
  id: string;
  senderType: 'incarcerated' | 'family';
  body: string;
  status: string;
  attachments?: Attachment[];
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
  const [contacts, setContacts] = useState<ApprovedContact[]>([]);
  const [pendingContacts, setPendingContacts] = useState<PendingContact[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [unread, setUnread] = useState<Set<string>>(new Set());
  const lastMsgIdRef = useRef<Map<string, string>>(new Map());
  const [showRequest, setShowRequest] = useState(false);
  const [requestExternalId, setRequestExternalId] = useState('');
  const [requestRelationship, setRequestRelationship] = useState('');
  const [requestIsAttorney, setRequestIsAttorney] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    requestNotificationPermission();
    apiFetch('/auth/me').then(data => {
      if (data.success) setUserId(data.data.id);
    });

    const fetchConvs = () => {
      apiFetch('/messaging/conversations').then(data => {
        if (!data.success) return;
        const convs: Conversation[] = data.data;
        setConversations(convs);

        const newUnread: string[] = [];
        convs.forEach(conv => {
          const lastMsg = conv.messages[0];
          if (!lastMsg) return;
          const prevId = lastMsgIdRef.current.get(conv.id);
          if (prevId !== undefined && prevId !== lastMsg.id && lastMsg.senderType === 'incarcerated') {
            newUnread.push(conv.id);
            fireNotification(
              `New message from ${conv.incarceratedPerson.firstName}`,
              lastMsg.body
            );
          }
          lastMsgIdRef.current.set(conv.id, lastMsg.id);
        });

        if (newUnread.length > 0) {
          setUnread(prev => new Set([...prev, ...newUnread]));
        }
      });
    };

    fetchConvs();
    fetchPendingContacts();
    const interval = setInterval(fetchConvs, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingContacts = () => {
    apiFetch('/messaging/pending-contacts').then(data => {
      if (data.success) setPendingContacts(data.data);
    });
  };

  const openNew = () => {
    setShowNew(true);
    setShowRequest(false);
    setRequestExternalId('');
    setRequestRelationship('');
    setRequestIsAttorney(false);
    setRequestSent(false);
    setRequestError(null);
    apiFetch('/messaging/my-contacts').then(data => {
      if (data.success) setContacts(data.data);
    });
  };

  const submitContactRequest = async () => {
    if (!requestExternalId.trim() || !requestRelationship.trim()) return;
    const payload = {
      externalId: requestExternalId.trim(),
      relationship: requestRelationship.trim(),
      isAttorney: requestIsAttorney,
    };
    console.log('Contact request payload:', payload);
    const data = await apiFetch('/messaging/contact-request', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.success) {
      setRequestSent(true);
      setRequestError(null);
      fetchPendingContacts();
      setRequestExternalId('');
      setRequestRelationship('');
      setRequestIsAttorney(false);
    } else {
      setRequestError(data.error?.message ?? 'Something went wrong. Please try again.');
    }
  };

  const startConversation = async (incarceratedPersonId: string) => {
    if (!userId) return;
    const data = await apiFetch('/messaging/conversations', {
      method: 'POST',
      body: JSON.stringify({ incarceratedPersonId, familyMemberId: userId }),
    });
    if (data.success) {
      setShowNew(false);
      navigate(data.data.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={openNew}>New Message</Button>
      </div>

      {showNew && (
        <Card padding="md">
          <p className="text-sm font-medium text-gray-700 mb-3">Select someone to message:</p>
          {(() => {
            const existingIds = new Set(conversations.map(c => c.incarceratedPerson.id));
            const newContacts = contacts.filter(c => !existingIds.has(c.incarceratedPerson.id));
            return newContacts.length === 0 ? (
              <p className="text-sm text-gray-500">No new contacts to message.</p>
            ) : (
              <div className="space-y-2">
                {newContacts.map(c => (
                <button
                  key={c.id}
                  onClick={() => startConversation(c.incarceratedPerson.id)}
                  className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-sm transition-colors"
                >
                  {c.incarceratedPerson.firstName} {c.incarceratedPerson.lastName}
                </button>
              ))}
            </div>
            );
          })()}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              onClick={() => { setShowRequest(v => !v); setRequestSent(false); }}
            >
              {showRequest ? 'Hide' : '+ Request a new contact'}
            </button>
            {showRequest && (
              <div className="mt-3 space-y-3">
                {requestSent ? (
                  <p className="text-sm text-green-600 font-medium">Request submitted! An admin will review it.</p>
                ) : (
                  <>
                    <div>
                      <p className="text-sm text-gray-700 mb-1">Facility inmate ID (provided by the facility)</p>
                      <input
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={requestExternalId}
                        onChange={e => setRequestExternalId(e.target.value)}
                      />
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 mb-1">Your relationship to them</p>
                      <input
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={requestRelationship}
                        onChange={e => setRequestRelationship(e.target.value)}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requestIsAttorney}
                        onChange={e => setRequestIsAttorney(e.target.checked)}
                        className="rounded"
                      />
                      I am an attorney
                    </label>
                    {requestError && (
                      <p className="text-sm text-red-600">{requestError}</p>
                    )}
                    <Button
                      size="sm"
                      onClick={submitContactRequest}
                      disabled={!requestExternalId.trim() || !requestRelationship.trim()}
                    >
                      Submit Request
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
          <Button size="sm" variant="ghost" className="mt-3" onClick={() => setShowNew(false)}>Cancel</Button>
        </Card>
      )}

      {conversations.length > 0 && (
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Conversations</h2>
      )}

      {conversations.length === 0 && !showNew ? (
        <Card padding="lg">
          <p className="text-center text-gray-500 py-8">No conversations yet. Click "New Message" to get started.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => {
                setUnread(prev => { const next = new Set(prev); next.delete(conv.id); return next; });
                navigate(conv.id);
              }}
              className="w-full text-left"
            >
              <Card padding="md" className="hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {conv.incarceratedPerson.firstName} {conv.incarceratedPerson.lastName}
                      </p>
                      {unread.has(conv.id) && (
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </div>
                  </div>
                  <span className="text-gray-400 text-lg ml-2">›</span>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      {pendingContacts.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Pending Requests</h2>
          <div className="space-y-2">
            {pendingContacts.map(c => (
              <Card key={c.id} padding="md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {c.incarceratedPerson.firstName} {c.incarceratedPerson.lastName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{c.relationship} · {c.incarceratedPerson.externalId}</p>
                  </div>
                  <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">Pending</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 50;

function ConversationThread() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [view, setView] = useState<'messages' | 'gallery'>('messages');
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmojiPicker]);
  const [oldestPage, setOldestPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevTotalRef = useRef(0);
  const shouldScrollRef = useRef(true);

  useEffect(() => {
    if (view === 'gallery' && conversationId) {
      apiFetch(`/messaging/gallery?conversationId=${conversationId}`).then(data => {
        if (data.success) setGalleryItems(data.data);
      });
    }
  }, [view, conversationId]);

  // Mark messages as read when conversation opens
  useEffect(() => {
    if (!conversationId) return;
    apiFetch(`/messaging/conversations/${conversationId}/read`, { method: 'PATCH' });
  }, [conversationId]);

  // Initial load — fetch page info then jump to most recent page
  useEffect(() => {
    if (!conversationId) return;
    shouldScrollRef.current = true;
    apiFetch('/messaging/conversations').then(data => {
      if (data.success) setConv(data.data.find((c: Conversation) => c.id === conversationId) ?? null);
    });
    apiFetch(`/messaging/conversations/${conversationId}/messages?page=1&pageSize=${PAGE_SIZE}`).then(async data => {
      if (!data.success) return;
      const tp = Math.max(1, data.pagination.totalPages);
      setTotalPages(tp);
      prevTotalRef.current = data.pagination.total;
      if (tp === 1) {
        setMessages(data.data);
        setOldestPage(1);
        setHasMore(false);
      } else {
        const last = await apiFetch(`/messaging/conversations/${conversationId}/messages?page=${tp}&pageSize=${PAGE_SIZE}`);
        if (last.success) {
          setMessages(last.data);
          setOldestPage(tp);
          setHasMore(true);
        }
      }
    });
  }, [conversationId]);

  // Poll for new messages and status updates
  useEffect(() => {
    if (!conversationId) return;
    const poll = async () => {
      const data = await apiFetch(`/messaging/conversations/${conversationId}/messages?page=1&pageSize=${PAGE_SIZE}`);
      if (!data.success) return;
      const newTotal: number = data.pagination.total;
      const newTotalPages: number = Math.max(1, data.pagination.totalPages);
      const last = await apiFetch(`/messaging/conversations/${conversationId}/messages?page=${newTotalPages}&pageSize=${PAGE_SIZE}`);
      if (last.success) {
        const polledMsgs: Message[] = last.data;
        const hasNew = newTotal > prevTotalRef.current;
        if (hasNew) shouldScrollRef.current = true;
        setMessages(prev => {
          const polledById = new Map(polledMsgs.map(m => [m.id, m]));
          const updated = prev.map(m =>
            polledById.has(m.id) ? { ...m, status: polledById.get(m.id)!.status } : m
          );
          const existingIds = new Set(prev.map(m => m.id));
          const toAdd = polledMsgs.filter(m => !existingIds.has(m.id));
          if (toAdd.length > 0) {
            const incoming = toAdd.filter(m => m.senderType === 'incarcerated');
            if (incoming.length > 0) fireNotification('New message', incoming[incoming.length - 1].body);
          }
          return [...updated, ...toAdd];
        });
        if (newTotalPages > totalPages) setTotalPages(newTotalPages);
        prevTotalRef.current = newTotal;
        if (hasNew) apiFetch(`/messaging/conversations/${conversationId}/read`, { method: 'PATCH' });
      }
    };
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [conversationId, totalPages]);

  // Scroll to bottom only when new messages arrive (not when loading older ones)
  useEffect(() => {
    if (shouldScrollRef.current && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
      shouldScrollRef.current = false;
    }
  }, [messages]);

  // Load older messages when scrolled to top
  const loadMore = async () => {
    if (loadingMore || oldestPage <= 1 || !conversationId) return;
    setLoadingMore(true);
    const container = containerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    const prevPage = oldestPage - 1;
    const data = await apiFetch(`/messaging/conversations/${conversationId}/messages?page=${prevPage}&pageSize=${PAGE_SIZE}`);
    if (data.success) {
      shouldScrollRef.current = false;
      setMessages(prev => [...data.data, ...prev]);
      setOldestPage(prevPage);
      setHasMore(prevPage > 1);
      requestAnimationFrame(() => {
        if (container) container.scrollTop = container.scrollHeight - prevScrollHeight;
      });
    }
    setLoadingMore(false);
  };

  const handleScroll = () => {
    const container = containerRef.current;
    if (container && container.scrollTop < 50 && !loadingMore && hasMore) loadMore();
  };

  const send = async () => {
    if (!text.trim() && selectedFiles.length === 0) return;
    if (!conversationId) return;
    setSending(true);
    let data;
    if (selectedFiles.length > 0) {
      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('conversationId', conversationId);
      if (text.trim()) fd.append('body', text.trim());
      selectedFiles.forEach(f => fd.append('images', f));
      const res = await fetch('/api/messaging/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token ?? ''}` },
        body: fd,
      });
      data = await res.json();
    } else {
      data = await apiFetch('/messaging/send', {
        method: 'POST',
        body: JSON.stringify({ conversationId, body: text }),
      });
    }
    if (data.success) {
      shouldScrollRef.current = true;
      setMessages(prev => [...prev, data.data.message]);
      setText('');
      setSelectedFiles([]);
      setPreviewUrls([]);
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

      <div className="flex gap-6 border-b">
        <button
          onClick={() => setView('messages')}
          className={`text-sm pb-2 ${view === 'messages' ? 'font-semibold text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Messages
        </button>
        <button
          onClick={() => setView('gallery')}
          className={`text-sm pb-2 ${view === 'gallery' ? 'font-semibold text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Gallery
        </button>
      </div>

      {view === 'gallery' && (
        galleryItems.length === 0 ? (
          <Card padding="lg">
            <p className="text-center text-gray-500 py-8">No media in this conversation yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {galleryItems.map(item => {
              const isPending = item.status === 'pending_review';
              const isRejected = item.status === 'rejected';
              if (isRejected) {
                return (
                  <div key={item.id} className="aspect-square rounded-lg bg-black flex items-center justify-center">
                    <span className="text-xs font-medium text-white/60">Media removed</span>
                  </div>
                );
              }
              return (
                <div key={item.id} className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={item.fileUrl}
                    alt="media"
                    className={`w-full h-full object-cover transition-all duration-300 ${isPending ? 'blur-md scale-110' : ''}`}
                  />
                  {isPending && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-white bg-black/50 px-2 py-1 rounded-full">Pending review</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {view === 'messages' && <Card padding="none">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-[500px] overflow-y-auto p-4 space-y-3"
        >
          {loadingMore && <p className="text-center text-xs text-gray-400 py-2">Loading older messages...</p>}
          {hasMore && !loadingMore && <p className="text-center text-xs text-gray-300 py-1">Scroll up for older messages</p>}
          {messages.length === 0 && !loadingMore && (
            <p className="text-center text-gray-400 text-sm mt-8">No messages yet. Say hello!</p>
          )}
          {messages.map(msg => {
            const isBlocked = msg.status === 'blocked';
            const isPending = msg.status === 'pending_review';
            const isSender = msg.senderType === 'family';
            const shouldHideContent = isBlocked || (isPending && !isSender);

            return (
              <div
                key={msg.id}
                className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-sm px-3 py-2 rounded-2xl text-sm ${
                    isSender ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {!isBlocked && msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {msg.attachments.map(att => {
                        const isPending = att.status === 'pending_review';
                        const isRejected = att.status === 'rejected';
                        if (isRejected) {
                          return (
                            <div key={att.id} className="w-full h-24 rounded-lg bg-black flex items-center justify-center">
                              <span className="text-xs font-medium text-white/60">Media removed</span>
                            </div>
                          );
                        }
                        return (
                          <div key={att.id} className="relative">
                            <img
                              src={att.fileUrl}
                              alt="attachment"
                              className={`max-w-full rounded-lg ${isPending ? 'blur-md' : ''}`}
                            />
                            {isPending && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-medium text-white bg-black/50 px-2 py-1 rounded-full">Pending review</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {msg.status === 'blocked'
                    ? <p className="italic opacity-50">Message not approved</p>
                    : msg.body && <p>{msg.body}</p>
                  }
                  <p className={`text-xs mt-1 ${msg.senderType === 'family' ? 'text-blue-200' : 'text-gray-400'}`}>
                    {msg.status === 'blocked' && '✕ Not approved'}
                    {msg.status === 'pending_review' && '🕐 Pending review'}
                    {msg.status === 'approved' && '✓ Approved'}
                    {msg.status === 'sent' && '✓ Sent'}
                    {msg.status === 'delivered' && '✓✓ Delivered'}
                    {msg.status === 'read' && '✓✓ Read'}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <div className="border-t">
          {selectedFiles.length > 0 && (
            <div className="px-3 pt-3 flex flex-wrap gap-2">
              {selectedFiles.map((f, i) => (
                <div key={i} className="relative">
                  <img
                    src={previewUrls[i]}
                    alt={f.name}
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFiles(prev => prev.filter((_, j) => j !== i));
                      setPreviewUrls(prev => prev.filter((_, j) => j !== i));
                    }}
                    className="absolute -top-5 -right-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                    style={{ width: 16, height: 16, fontSize: 16 }}
                  >×</button>
                </div>
              ))}
            </div>
          )}
          <div className="relative p-3 flex gap-2 items-end">
            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="absolute bottom-16 left-3 z-50">
                <Picker
                  data={data}
                  onEmojiSelect={(emoji: { native: string }) => {
                    setText(prev => prev + emoji.native);
                    setShowEmojiPicker(false);
                  }}
                  theme="light"
                  previewPosition="none"
                />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files ?? []);
                console.log('Files selected:', files.map(f => f.name));
                const urls = files.map(f => URL.createObjectURL(f));
                setSelectedFiles(prev => [...prev, ...files]);
                setPreviewUrls(prev => [...prev, ...urls]);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-400 hover:text-gray-600 p-1 shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(v => !v)}
              className="text-gray-400 hover:text-gray-600 p-1 shrink-0 flex items-center justify-center"
              style={{ width: 44, height: 44, fontSize: 28 }}
            >
              😊
            </button>
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
            <Button onClick={send} loading={sending} disabled={!text.trim() && selectedFiles.length === 0}>
              Send
            </Button>
          </div>
        </div>
      </Card>}
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
