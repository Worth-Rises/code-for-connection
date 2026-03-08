import React, { useState, useEffect, useRef } from "react"
import { Routes, Route, useNavigate, useParams } from "react-router-dom"
import { Button, Card } from "@openconnect/ui"
import { PhotoUploadButton } from "./components/PhotoUploadButton"
import Picker from "@emoji-mart/react"
import data from "@emoji-mart/data"

interface Conversation {
  id: string
  familyMember: { firstName: string; lastName: string }
  messages: {
    id: string
    body: string
    senderType: "incarcerated" | "family"
  }[]
}

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission()
  }
}

function fireNotification(title: string, body: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body })
  }
}

interface Message {
  id: string
  senderType: "incarcerated" | "family"
  body: string
  status: string
  createdAt: Date
  attachments?: {
    status: string, fileUrl: string 
}[]
}

interface GalleryPhoto {
  id: string
  url: string
  thumbnail: string
  date: string
  sender: string
  status: string
}

interface GalleryViewProps {
  photos: GalleryPhoto[]
  participantLabel: string
}

function GalleryView({ photos, participantLabel }: GalleryViewProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(
    null,
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPhotoIndex === null) return
      if (e.key === "Escape") {
        setSelectedPhotoIndex(null)
      } else if (e.key === "ArrowLeft") {
        setSelectedPhotoIndex((prev) => {
          if (prev === null) return prev
          let next = prev - 1
          while (next >= 0 && photos[next].status === "pending_review") {
            next -= 1
          }
          return next >= 0 ? next : prev
        })
      } else if (e.key === "ArrowRight") {
        setSelectedPhotoIndex((prev) => {
          if (prev === null) return prev
          let next = prev + 1
          while (
            next < photos.length &&
            photos[next].status === "pending_review"
          ) {
            next += 1
          }
          return next < photos.length ? next : prev
        })
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [photos.length, selectedPhotoIndex])

  const selectedPhoto =
    selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : null

  return (
    <div className="flex flex-col bg-gray-50 rounded-xl">
      <div className="px-6 max-w-6xl mx-auto w-full">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Shared Photos</h2>
          <p className="text-gray-500 mt-1">
            Images shared in your conversation with {participantLabel}
          </p>
        </div>

        {photos.length === 0 ? (
          <p className="text-gray-400 text-sm">
            No photos have been shared in this conversation yet.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => {
              const isPending = photo.status === "pending_review"
              const isRemoved = photo.status === "rejected" || photo.status === "blocked"
              if (isRemoved) {
                return (
                  <div key={photo.id} className="aspect-square rounded-lg bg-black flex items-center justify-center">
                    <span className="text-xs font-medium text-white/60">Media removed</span>
                  </div>
                )
              }
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={
                    isPending ? undefined : () => setSelectedPhotoIndex(index)
                  }
                  disabled={isPending}
                  aria-disabled={isPending}
                  className={`relative aspect-square overflow-hidden rounded-lg bg-gray-100 ${
                    isPending ? "cursor-default" : "cursor-pointer"
                  }`}
                >
                  <img
                    src={photo.thumbnail}
                    alt={`Shared by ${photo.sender}`}
                    className={`w-full h-full object-cover transition-all duration-300 ${
                      isPending ? "blur-md scale-110" : ""
                    }`}
                    loading="lazy"
                  />
                  {isPending && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-white bg-black/50 px-2 py-1 rounded-full">
                        Pending review
                      </span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <button
            onClick={() => setSelectedPhotoIndex(null)}
            className="absolute top-6 right-6 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50"
            aria-label="Close lightbox"
          >
            <span className="text-3xl leading-none">&times;</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              setSelectedPhotoIndex((prev) =>
                prev !== null && prev > 0 ? prev - 1 : prev,
              )
            }}
            disabled={selectedPhotoIndex === 0}
            className="absolute left-6 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-50"
            aria-label="Previous photo"
          >
            <span className="text-4xl leading-none">&#8249;</span>
          </button>

          <div className="relative max-w-5xl max-h-[85vh] w-full px-16 flex flex-col items-center justify-center">
            <img
              src={selectedPhoto.url}
              alt={`Full size shared by ${selectedPhoto.sender}`}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="mt-4 text-center">
              <p className="text-white font-medium">
                Shared by {selectedPhoto.sender}
              </p>
              <p className="text-gray-400 text-sm">{selectedPhoto.date}</p>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              setSelectedPhotoIndex((prev) =>
                prev !== null && prev < photos.length - 1 ? prev + 1 : prev,
              )
            }}
            disabled={selectedPhotoIndex === photos.length - 1}
            className="absolute right-6 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-50"
            aria-label="Next photo"
          >
            <span className="text-4xl leading-none">&#8250;</span>
          </button>
        </div>
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function apiFetch(path: string, options?: RequestInit): Promise<any> {
  const token = localStorage.getItem("token")
  const isFormData = options?.body instanceof FormData
  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    ...options?.headers,
  }
  if (!isFormData) {
    ;(headers as Record<string, string>)["Content-Type"] = "application/json"
  }
  return fetch(`/api${path}`, {
    ...options,
    headers,
  }).then((r) => r.json())
}

function ConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [unread, setUnread] = useState<Set<string>>(new Set())
  const lastMsgIdRef = useRef<Map<string, string>>(new Map())
  const navigate = useNavigate()

  useEffect(() => {
    requestNotificationPermission()

    const fetchConvs = () => {
      apiFetch("/messaging/conversations").then((data) => {
        if (!data.success) return
        const convs: Conversation[] = data.data
        setConversations(convs)

        const newUnread: string[] = []
        convs.forEach((conv) => {
          const lastMsg = conv.messages[0]
          if (!lastMsg) return
          const prevId = lastMsgIdRef.current.get(conv.id)
          if (
            prevId !== undefined &&
            prevId !== lastMsg.id &&
            lastMsg.senderType === "family"
          ) {
            newUnread.push(conv.id)
            fireNotification(
              `New message from ${conv.familyMember.firstName}`,
              lastMsg.body,
            )
          }
          lastMsgIdRef.current.set(conv.id, lastMsg.id)
        })

        if (newUnread.length > 0) {
          setUnread((prev) => new Set([...prev, ...newUnread]))
        }
      })
    }

    fetchConvs()
    const interval = setInterval(fetchConvs, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
      {conversations.length === 0 ? (
        <Card padding="lg">
          <p className="text-center text-gray-500 py-8">No conversations yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => {
                setUnread((prev) => {
                  const next = new Set(prev)
                  next.delete(conv.id)
                  return next
                })
                navigate(conv.id)
              }}
              className="w-full text-left"
            >
              <Card
                padding="md"
                className="hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className=" min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {conv.familyMember.firstName}{" "}
                        {conv.familyMember.lastName}
                      </p>
                      {unread.has(conv.id) && (
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </div>
                    {conv.messages[0] && (
                      <p
                        className={`text-sm mt-1 truncate ${unread.has(conv.id) ? "text-gray-900 font-medium" : "text-gray-500"}`}
                      >
                        {conv.messages[0].body}
                      </p>
                    )}
                  </div>
                  <span className="text-gray-400 text-lg ml-2">›</span>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const PAGE_SIZE = 50

function ConversationThread() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const [conv, setConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [oldestPage, setOldestPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [activeTab, setActiveTab] = useState<"chat" | "gallery" | "notepad">("chat")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [noteContent, setNoteContent] = useState("")
  const [noteSaved, setNoteSaved] = useState(true)
  const noteSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [contextMenu, setContextMenu] = useState<{ msgId: string; body: string; x: number; y: number } | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevTotalRef = useRef(0)
  const shouldScrollRef = useRef(true)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showEmojiPicker) return
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showEmojiPicker])

  useEffect(() => {
    if (!contextMenu) return
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [contextMenu])

  useEffect(() => {
    if (!conversationId) return
    apiFetch(`/messaging/conversations/${conversationId}/read`, { method: 'PATCH' })
  }, [conversationId])

  useEffect(() => {
    if (activeTab === "notepad" && conversationId) {
      apiFetch(`/messaging/conversations/${conversationId}/note`).then((data) => {
        if (data.success) { setNoteContent(data.data.content); setNoteSaved(true) }
      })
    }
  }, [activeTab, conversationId])

  const handleNoteChange = (value: string) => {
    setNoteContent(value)
    setNoteSaved(false)
    if (noteSaveTimerRef.current) clearTimeout(noteSaveTimerRef.current)
    noteSaveTimerRef.current = setTimeout(() => {
      apiFetch(`/messaging/conversations/${conversationId}/note`, {
        method: "PUT",
        body: JSON.stringify({ content: value }),
      }).then((data) => { if (data.success) setNoteSaved(true) })
    }, 1500)
  }

  useEffect(() => {
    if (!conversationId) return
    shouldScrollRef.current = true
    apiFetch("/messaging/conversations").then((data) => {
      if (data.success)
        setConv(
          data.data.find((c: Conversation) => c.id === conversationId) ?? null,
        )
    })
    apiFetch(
      `/messaging/conversations/${conversationId}/messages?page=1&pageSize=${PAGE_SIZE}`,
    ).then(async (data) => {
      if (!data.success) return
      const tp = Math.max(1, data.pagination.totalPages)
      setTotalPages(tp)
      prevTotalRef.current = data.pagination.total
      if (tp === 1) {
        setMessages(data.data)
        setOldestPage(1)
        setHasMore(false)
      } else {
        const last = await apiFetch(
          `/messaging/conversations/${conversationId}/messages?page=${tp}&pageSize=${PAGE_SIZE}`,
        )
        if (last.success) {
          setMessages(last.data)
          setOldestPage(tp)
          setHasMore(true)
        }
      }
    })
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) return
    const poll = async () => {
      const data = await apiFetch(
        `/messaging/conversations/${conversationId}/messages?page=1&pageSize=${PAGE_SIZE}`,
      )
      if (!data.success) return
      const newTotal: number = data.pagination.total
      const newTotalPages: number = Math.max(1, data.pagination.totalPages)
      const last = await apiFetch(
        `/messaging/conversations/${conversationId}/messages?page=${newTotalPages}&pageSize=${PAGE_SIZE}`,
      )
      if (last.success) {
        const polledMsgs: Message[] = last.data
        const hasNew = newTotal > prevTotalRef.current
        if (hasNew) shouldScrollRef.current = true
        setMessages((prev) => {
          const polledById = new Map(polledMsgs.map((m) => [m.id, m]))
          const updated = prev.map((m) =>
            polledById.has(m.id) ? { ...m, status: polledById.get(m.id)!.status, attachments: polledById.get(m.id)!.attachments } : m
          )
          const existingIds = new Set(prev.map((m) => m.id))
          const toAdd = polledMsgs.filter((m) => !existingIds.has(m.id))
          if (toAdd.length > 0) {
            const incoming = toAdd.filter((m) => m.senderType === "family")
            if (incoming.length > 0)
              fireNotification("New message", incoming[incoming.length - 1].body)
          }
          return [...updated, ...toAdd]
        })
        if (newTotalPages > totalPages) setTotalPages(newTotalPages)
        prevTotalRef.current = newTotal
        apiFetch(`/messaging/conversations/${conversationId}/read`, { method: 'PATCH' })
      }
    }
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [conversationId, totalPages])

  useEffect(() => {
    if (shouldScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
      shouldScrollRef.current = false
    }
  }, [messages])

  const loadMore = async () => {
    if (loadingMore || oldestPage <= 1 || !conversationId) return
    setLoadingMore(true)
    const container = containerRef.current
    const prevScrollHeight = container?.scrollHeight ?? 0
    const prevPage = oldestPage - 1
    const data = await apiFetch(
      `/messaging/conversations/${conversationId}/messages?page=${prevPage}&pageSize=${PAGE_SIZE}`,
    )
    if (data.success) {
      shouldScrollRef.current = false
      setMessages((prev) => [...data.data, ...prev])
      setOldestPage(prevPage)
      setHasMore(prevPage > 1)
      requestAnimationFrame(() => {
        if (container)
          container.scrollTop = container.scrollHeight - prevScrollHeight
      })
    }
    setLoadingMore(false)
  }

  const handleScroll = () => {
    const container = containerRef.current
    if (container && container.scrollTop < 50 && !loadingMore && hasMore)
      loadMore()
  }

  const galleryPhotos: GalleryPhoto[] = messages.flatMap((msg) => {
    if (!msg.attachments || msg.attachments.length === 0) return []
    const senderLabel =
      msg.senderType === "incarcerated"
        ? "You"
        : conv
          ? `${conv.familyMember.firstName} ${conv.familyMember.lastName}`
          : "Family"

    return msg.attachments.map((att, index) => ({
      id: `${msg.id}-${index}`,
      url: att.fileUrl,
      thumbnail: att.fileUrl,
      date: new Date(msg.createdAt).toLocaleDateString(),
      sender: senderLabel,
      status: msg.status === 'blocked' ? 'blocked' : att.status,
    }))
  })

  const send = async () => {
    if ((!text.trim() && selectedFiles.length === 0) || !conversationId) return
    const formData = new FormData()
    formData.append("conversationId", conversationId)
    formData.append("body", text.trim())
    selectedFiles.forEach((file) => {
      formData.append("images", file) // "images" — plural, matches backend
    })
    setSending(true)
    const data = await apiFetch("/messaging/send", {
      method: "POST",
      body: formData,
    })
    if (data.success) {
      shouldScrollRef.current = true
      setMessages((prev) => [...prev, data.data.message])
      setText("")
      setSelectedFiles([])
    }
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 space-y-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            &lt; Back
          </button>
          {conv && (
            <h1 className="text-xl font-bold text-gray-900">
              {conv.familyMember.firstName} {conv.familyMember.lastName}
            </h1>
          )}
        </div>

        <div className="border-b border-gray-200 gap-y-2">
          <nav className="flex gap-6 text-sm font-medium gap-y-2">
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={`relative -mb-px pb-3 pt-2 border-b-2 transition-colors ${
                activeTab === "chat"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("gallery")}
              className={`relative -mb-px pb-3 pt-2 border-b-2 transition-colors ${
                activeTab === "gallery"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              Gallery
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("notepad")}
              className={`relative -mb-px pb-3 pt-2 border-b-2 transition-colors ${
                activeTab === "notepad"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              Notepad
            </button>
          </nav>
        </div>
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-200 py-1 min-w-[180px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="w-full text-left px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 active:bg-gray-100"
            onClick={() => {
              const newContent = noteContent ? `${noteContent}\n\n${contextMenu.body}` : contextMenu.body
              handleNoteChange(newContent)
              setContextMenu(null)
            }}
          >
            Copy to notepad
          </button>
          <button
            className="w-full text-left px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 active:bg-gray-100"
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.body)
              setContextMenu(null)
            }}
          >
            Copy text
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 pt-2">
      {activeTab === "chat" && (
        <Card padding="none" className="h-full">
            <div className="flex flex-col h-full">
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
          >
          {loadingMore && (
            <p className="text-center text-xs text-gray-400 py-2">
              Loading older messages...
            </p>
          )}
          {hasMore && !loadingMore && (
            <p className="text-center text-xs text-gray-300 py-1">
              Scroll up for older messages
            </p>
          )}
            {messages.length === 0 && !loadingMore && (
              <p className="text-center text-gray-400 text-sm mt-8">
                No messages yet. Say hello!
              </p>
            )}
          {messages.map((msg, index) => {
            const msgDate = new Date(msg.createdAt)
            const prevMsg = messages[index - 1]
            const prevDate = prevMsg ? new Date(prevMsg.createdAt) : null
            const isBlocked = msg.status === "blocked"
            const isPending = msg.status === "pending_review"
            const isSender = msg.senderType === "incarcerated"
            const shouldHideContent = isBlocked || (isPending && !isSender)

            const isNewDay =
              !prevDate || msgDate.toDateString() !== prevDate.toDateString()

            const formatDateLabel = (date: Date) => {
              const today = new Date()
              const yesterday = new Date(today)
              yesterday.setDate(today.getDate() - 1)

              if (date.toDateString() === today.toDateString()) return "Today"
              if (date.toDateString() === yesterday.toDateString())
                return "Yesterday"
              return date.toLocaleDateString([], {
                month: "long",
                day: "numeric",
                year:
                  date.getFullYear() !== today.getFullYear()
                    ? "numeric"
                    : undefined,
              })
            }

            return (
              <div key={msg.id}>
                {isNewDay && (
                  <div className="flex items-center justify-center my-3">
                    <div className="bg-gray-200 text-gray-500 text-xs font-medium px-3 py-1 rounded-full shadow-sm">
                      {formatDateLabel(msgDate)}
                    </div>
                  </div>
                )}
                <div
                  className={`flex ${isSender ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-sm px-3 py-2 rounded-2xl text-sm ${
                      msg.senderType === "incarcerated"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                    onContextMenu={msg.body && !isBlocked ? (e) => {
                      e.preventDefault()
                      setContextMenu({ msgId: msg.id, body: msg.body, x: e.clientX, y: e.clientY })
                    } : undefined}
                  >
                    {!shouldHideContent &&
                      msg.attachments &&
                      msg.attachments.length > 0 && (
                      <div className="mb-1 space-y-1">
                        {msg.attachments.map((att, i) => {
                          const isPending = att.status === 'pending_review';
                          const isRejected = att.status === 'rejected';
                          if (isRejected) {
                            return (
                              <div key={i} className="w-full h-24 rounded-lg bg-black flex items-center justify-center">
                                <span className="text-xs font-medium text-white/60">Media removed</span>
                              </div>
                            );
                          }
                          return (
                            <div key={i} className="relative">
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
                    {shouldHideContent
                      ? <p className="italic opacity-50">{isBlocked ? 'Message not approved' : 'Pending review'}</p>
                      : msg.body && <p>{msg.body}</p>
                    }
                    <div className="flex items-center justify-between text-xs mt-1">
                      <p
                        className={`${msg.senderType === "incarcerated" ? "text-blue-200" : "text-gray-400"}`}
                      >
                        {msg.status === "pending_review" ? "🕐 Pending review"
                          : msg.status === "blocked" ? "✕ Not approved"
                          : msg.status === "sent" ? "✓ Sent"
                          : msg.status === "read" ? "✓✓ Read"
                          : msg.status}
                      </p>
                      <p
                        className={`ml-2 ${msg.senderType === "incarcerated" ? "text-blue-200" : "text-gray-400"}`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
            <div ref={bottomRef} />
          </div>
          {/* Input bar — fixed at bottom, never pushed off */}
          <div className="relative border-t p-3 flex flex-col gap-2 flex-shrink-0">
            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="absolute bottom-20 left-3 z-50">
                <Picker
                  data={data}
                  onEmojiSelect={(emoji: { native: string }) => {
                    setText((prev) => prev + emoji.native)
                    setShowEmojiPicker(false)
                  }}
                  theme="light"
                  previewPosition="none"
                />
              </div>
            )}
            {selectedFiles.length > 0 && (
              <div className="pt-1 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {selectedFiles.map((file, i) => (
                  <div key={i} className="relative flex-shrink-0">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFiles((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full flex items-center justify-center w-4 h-4 leading-none text-xs p-0 m-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-end">
              <PhotoUploadButton
                onFileSelect={(files) => setSelectedFiles(files)}
              />
              <button
                type="button"
                onClick={() => setShowEmojiPicker((v) => !v)}
                className="text-gray-400 hover:text-gray-600 p-1 shrink-0 text-2xl leading-none"
              >
                😊
              </button>
              <textarea
                className="flex-1 border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
              />
              <Button
                onClick={send}
                loading={sending}
                disabled={!text.trim() && selectedFiles.length === 0}
              >
                Send
              </Button>
            </div>
          </div>
          </div>
        </Card>
      )}

      {activeTab === "notepad" && (
        <Card padding="md" className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <p className="text-sm font-medium text-gray-700">Shared notepad</p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{noteSaved ? "Saved" : "Saving…"}</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(noteContent)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Copy all
              </button>
            </div>
          </div>
          <textarea
            className="flex-1 w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Paste or type notes here… both sides can see and edit this."
            value={noteContent}
            onChange={(e) => handleNoteChange(e.target.value)}
          />
        </Card>
      )}

      {activeTab === "gallery" && (
        <Card padding="none" className="h-full">
          <div className="h-full overflow-y-auto p-4">
            <GalleryView
              photos={galleryPhotos}
              participantLabel={
                conv
                  ? `${conv.familyMember.firstName} ${conv.familyMember.lastName}`
                  : "this contact"
              }
            />
          </div>
        </Card>
      )}
      </div>
    </div>
  )
}

export default function MessagingIncarcerated() {
  return (
    <Routes>
      <Route index element={<ConversationList />} />
      <Route path=":conversationId" element={<ConversationThread />} />
    </Routes>
  )
}
