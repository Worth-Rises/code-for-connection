import React, { useState, useEffect, useRef } from "react"
import { Routes, Route, useNavigate, useParams } from "react-router-dom"
import { Button, Card } from "@openconnect/ui"
import { PhotoUploadButton } from "./components/PhotoUploadButton"

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
  attachments?: { fileUrl: string }[]
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
  const navigate = useNavigate()
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevTotalRef = useRef(0)
  const shouldScrollRef = useRef(true)

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
      if (newTotal > prevTotalRef.current) {
        const last = await apiFetch(
          `/messaging/conversations/${conversationId}/messages?page=${newTotalPages}&pageSize=${PAGE_SIZE}`,
        )
        if (last.success) {
          const newMsgs: Message[] = last.data
          shouldScrollRef.current = true
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id))
            const toAdd = newMsgs.filter((m) => !existingIds.has(m.id))
            const incoming = toAdd.filter((m) => m.senderType === "family")
            if (incoming.length > 0)
              fireNotification(
                "New message",
                incoming[incoming.length - 1].body,
              )
            return [...prev, ...toAdd]
          })
          if (newTotalPages > totalPages) setTotalPages(newTotalPages)
          prevTotalRef.current = newTotal
        }
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
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Back
        </button>
        {conv && (
          <h1 className="text-xl font-bold text-gray-900">
            {conv.familyMember.firstName} {conv.familyMember.lastName}
          </h1>
        )}
      </div>

      <Card padding="none">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-[500px] overflow-y-auto p-4 space-y-3"
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
                  className={`flex ${msg.senderType === "incarcerated" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-sm px-3 py-2 rounded-2xl text-sm ${
                      msg.senderType === "incarcerated"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mb-1 space-y-1">
                        {msg.attachments.map((att, i) => (
                          <img
                            key={i}
                            src={att.fileUrl}
                            alt="attachment"
                            className="max-w-full rounded-lg"
                          />
                        ))}
                      </div>
                    )}
                    {msg.body && <p>{msg.body}</p>}
                    <div className="flex items-center justify-between text-xs mt-1">
                      <p
                        className={`${msg.senderType === "incarcerated" ? "text-blue-200" : "text-gray-400"}`}
                      >
                        {msg.status === "pending_review"
                          ? "pending"
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
          {/* Photo preview */}
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 ml-1">
              {selectedFiles.map((file, i) => (
                <div key={i} className="relative w-20 h-20">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${i + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedFiles((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="absolute -top-1.5 -right-1.5 bg-gray-700 text-white rounded-full w-1 h-1 flex items-center justify-center text-xs hover:bg-gray-900 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t p-3 flex flex-col gap-2">
          {/* Input row */}
          <div className="flex gap-2 items-end">
            <PhotoUploadButton
              onFileSelect={(files) => setSelectedFiles(files)}
            />
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
      </Card>
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
