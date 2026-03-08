import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import { Card, Button, Input } from "@openconnect/ui";

// ── Types ────────────────────────────────────────────────────────────────────

interface FlaggedKeyword {
  id: string;
  phrase: string;
  createdAt: string;
}

interface MessagingStats {
  todayTotal: number;
  pendingReview: number;
}

interface Person {
  id: string;
  firstName: string;
  lastName: string;
}

interface FamilyMember extends Person {
  email: string;
  phone?: string;
}

interface Attachment {
  id: string;
  fileUrl: string;
  fileType: string;
  status: string;
}

interface PendingMessage {
  id: string;
  body: string;
  senderType: "incarcerated" | "family";
  createdAt: string;
  attachments?: Attachment[];
  conversation: {
    id: string;
    incarceratedPerson: Person;
    familyMember: FamilyMember;
  };
}

interface BlockedConversation {
  id: string;
  incarceratedPerson: Person;
  familyMember: FamilyMember;
}

interface ApprovedContactOption {
  id: string;
  familyMember: FamilyMember;
}

interface ContactRequest {
  id: string;
  relationship: string;
  requestedAt: string;
  incarceratedPerson: Person;
  familyMember: FamilyMember;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { message: string };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const apiBase = "/api/messaging";

function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("token");
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

function fullName(p: Person) {
  return `${p.firstName} ${p.lastName}`;
}

// ── Contact Requests ─────────────────────────────────────────────────────────

function ContactRequests({
  facilityId,
  onChanged,
}: {
  facilityId?: string;
  onChanged?: () => void;
}) {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const params = facilityId ? `?facilityId=${facilityId}` : "";
      const res = await apiFetch(`${apiBase}/contact-requests${params}`);
      const data = (await res.json()) as ApiResponse<ContactRequest[]>;
      if (data.success) setRequests(data.data);
    } catch {
      setError("Failed to load contact requests");
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  async function handleDecision(requestId: string, action: "approve" | "deny") {
    try {
      const res = await apiFetch(
        `${apiBase}/contact-requests/${requestId}/${action}`,
        { method: "POST" },
      );
      const data = (await res.json()) as ApiResponse<unknown>;
      if (data.success) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        onChanged?.();
      } else {
        setError(data.error?.message || `Failed to ${action} request`);
      }
    } catch {
      setError(`Failed to ${action} request`);
    }
  }

  return (
    <Card padding="lg">
      <h2 className="text-lg font-semibold mb-4">Contact Requests</h2>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}
      {loading ? (
        <p className="text-sm text-gray-500 py-4 text-center">Loading...</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          No pending contact requests.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {requests.map((req) => (
            <li
              key={req.id}
              className="py-3 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {fullName(req.familyMember)}
                  <span className="ml-1 text-gray-500 font-normal">
                    ({req.relationship})
                  </span>
                </p>
                <p className="text-xs text-gray-500">
                  requesting contact with {fullName(req.incarceratedPerson)}{" "}
                  &middot; {req.familyMember.email}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button onClick={() => handleDecision(req.id, "approve")}>
                  Approve
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleDecision(req.id, "deny")}
                >
                  Deny
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── Pending Review Queue ──────────────────────────────────────────────────────

function PendingMessages({ onReviewed }: { onReviewed?: () => void }) {
  const [messages, setMessages] = useState<PendingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await apiFetch(`${apiBase}/pending`);
      const data = (await res.json()) as ApiResponse<PendingMessage[]>;
      if (data.success) setMessages(data.data);
    } catch {
      setError("Failed to load pending messages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  async function handleDecision(
    messageId: string,
    action: "approve" | "reject",
  ) {
    try {
      const res = await apiFetch(`${apiBase}/${action}/${messageId}`, {
        method: "POST",
      });
      const data = (await res.json()) as ApiResponse<unknown>;
      if (data.success) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        onReviewed?.();
      } else {
        setError(data.error?.message || `Failed to ${action} message`);
      }
    } catch {
      setError(`Failed to ${action} message`);
    }
  }

  return (
    <Card padding="lg">
      <h2 className="text-lg font-semibold mb-4">Messages Pending Review</h2>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}
      {loading ? (
        <p className="text-sm text-gray-500 py-4 text-center">Loading...</p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          No messages pending review.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {messages.map((msg) => (
            <li key={msg.id} className="py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 mb-1">
                    {msg.senderType === "incarcerated"
                      ? `${fullName(msg.conversation.incarceratedPerson)} → ${fullName(msg.conversation.familyMember)}`
                      : `${fullName(msg.conversation.familyMember)} → ${fullName(msg.conversation.incarceratedPerson)}`}
                  </p>
                  {msg.body && (
                    <p className="text-sm text-gray-900 break-words">
                      {msg.body}
                    </p>
                  )}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {msg.attachments.map((att) => (
                        <img
                          key={att.id}
                          src={att.fileUrl}
                          alt="attachment"
                          className="w-20 h-20 object-cover rounded border border-gray-200"
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button onClick={() => handleDecision(msg.id, "approve")}>
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleDecision(msg.id, "reject")}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── Blocked Conversations ────────────────────────────────────────────────────

function BlockedConversations({
  facilityId,
  onChanged,
}: {
  facilityId?: string;
  onChanged?: () => void;
}) {
  const [conversations, setConversations] = useState<BlockedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Block form state
  const [incarceratedPersons, setIncarceratedPersons] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [contactOptions, setContactOptions] = useState<ApprovedContactOption[]>(
    [],
  );
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const params = facilityId ? `?facilityId=${facilityId}` : "";
      const res = await apiFetch(`${apiBase}/blocked-conversations${params}`);
      const data = (await res.json()) as ApiResponse<BlockedConversation[]>;
      if (data.success) setConversations(data.data);
    } catch {
      setError("Failed to load blocked conversations");
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  // Load incarcerated persons for the dropdown
  useEffect(() => {
    async function loadPersons() {
      try {
        const params = facilityId ? `?facilityId=${facilityId}` : "";
        const res = await apiFetch(`${apiBase}/incarcerated-persons${params}`);
        const data = (await res.json()) as ApiResponse<Person[]>;
        if (data.success) setIncarceratedPersons(data.data);
      } catch {
        /* ignore */
      }
    }
    loadPersons();
  }, [facilityId]);

  // When incarcerated person is selected, load their approved contacts
  useEffect(() => {
    if (!selectedPersonId) {
      setContactOptions([]);
      setSelectedFamilyMemberId("");
      return;
    }
    setLoadingContacts(true);
    setSelectedFamilyMemberId("");
    apiFetch(`${apiBase}/incarcerated-persons/${selectedPersonId}/contacts`)
      .then((r) => r.json() as Promise<ApiResponse<ApprovedContactOption[]>>)
      .then((data) => {
        if (data.success) setContactOptions(data.data);
      })
      .catch(() => {})
      .finally(() => setLoadingContacts(false));
  }, [selectedPersonId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  async function handleBlock() {
    if (!selectedPersonId || !selectedFamilyMemberId) return;
    try {
      const res = await apiFetch(`${apiBase}/block-conversation`, {
        method: "POST",
        body: JSON.stringify({
          incarceratedPersonId: selectedPersonId,
          familyMemberId: selectedFamilyMemberId,
        }),
      });
      const data = (await res.json()) as ApiResponse<{
        conversation: BlockedConversation;
      }>;
      if (data.success) {
        setSelectedPersonId("");
        setSelectedFamilyMemberId("");
        setContactOptions([]);
        fetchConversations();
        onChanged?.();
      } else {
        setError(data.error?.message || "Failed to block conversation");
      }
    } catch {
      setError("Failed to block conversation");
    }
  }

  async function handleUnblock(conversationId: string) {
    try {
      const res = await apiFetch(
        `${apiBase}/unblock-conversation/${conversationId}`,
        { method: "POST" },
      );
      const data = (await res.json()) as ApiResponse<unknown>;
      if (data.success) {
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        onChanged?.();
      } else {
        setError(data.error?.message || "Failed to unblock conversation");
      }
    } catch {
      setError("Failed to unblock conversation");
    }
  }

  return (
    <Card padding="lg">
      <h2 className="text-lg font-semibold mb-4">Blocked Conversations</h2>

      {/* Block form */}
      <div className="flex flex-wrap items-end gap-2 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Incarcerated Person
          </label>
          <select
            value={selectedPersonId}
            onChange={(e) => setSelectedPersonId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a person…</option>
            {incarceratedPersons.map((p) => (
              <option key={p.id} value={p.id}>
                {fullName(p)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Contact (Family / Loved One)
          </label>
          <select
            value={selectedFamilyMemberId}
            onChange={(e) => setSelectedFamilyMemberId(e.target.value)}
            disabled={!selectedPersonId || loadingContacts}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">
              {loadingContacts
                ? "Loading…"
                : !selectedPersonId
                  ? "Select a person first"
                  : contactOptions.length === 0
                    ? "No approved contacts"
                    : "Select a contact…"}
            </option>
            {contactOptions.map((c) => (
              <option key={c.familyMember.id} value={c.familyMember.id}>
                {fullName(c.familyMember)} ({c.familyMember.email})
              </option>
            ))}
          </select>
        </div>
        <Button
          variant="danger"
          onClick={handleBlock}
          disabled={!selectedPersonId || !selectedFamilyMemberId}
        >
          Block
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}
      {loading ? (
        <p className="text-sm text-gray-500 py-4 text-center">Loading...</p>
      ) : conversations.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          No blocked conversations.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {conversations.map((conv) => (
            <li
              key={conv.id}
              className="py-3 flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {fullName(conv.incarceratedPerson)} &harr;{" "}
                  {fullName(conv.familyMember)}
                </p>
                <p className="text-xs text-gray-500">
                  {conv.familyMember.email}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => handleUnblock(conv.id)}
              >
                Unblock
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── Keyword Manager ──────────────────────────────────────────────────────────

function KeywordManager({ facilityId }: { facilityId?: string }) {
  const [keywords, setKeywords] = useState<FlaggedKeyword[]>([]);
  const [newPhrase, setNewPhrase] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPhrase, setEditPhrase] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKeywords = useCallback(async () => {
    try {
      const params = facilityId ? `?facilityId=${facilityId}` : "";
      const res = await apiFetch(`${apiBase}/keywords${params}`);
      const data = (await res.json()) as ApiResponse<FlaggedKeyword[]>;
      if (data.success) {
        const seen = new Set<string>();
        const unique = data.data.filter((k) => {
          const key = k.phrase.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setKeywords(unique);
      }
    } catch {
      setError("Failed to load keywords");
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  async function handleAdd() {
    const phrase = newPhrase.trim();
    if (!phrase) return;
    try {
      const res = await apiFetch(`${apiBase}/keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase, facilityId }),
      });
      const data = (await res.json()) as ApiResponse<FlaggedKeyword>;
      if (data.success) {
        setKeywords((prev) => [...prev, data.data]);
        setNewPhrase("");
      } else {
        setError(data.error?.message || "Failed to add keyword");
      }
    } catch {
      setError("Failed to add keyword");
    }
  }

  async function handleEdit(id: string) {
    const phrase = editPhrase.trim();
    if (!phrase) return;
    try {
      const res = await apiFetch(`${apiBase}/keywords/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase }),
      });
      const data = (await res.json()) as ApiResponse<FlaggedKeyword>;
      if (data.success) {
        setKeywords((prev) => prev.map((k) => (k.id === id ? data.data : k)));
        setEditingId(null);
        setEditPhrase("");
      } else {
        setError(data.error?.message || "Failed to update keyword");
      }
    } catch {
      setError("Failed to update keyword");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await apiFetch(`${apiBase}/keywords/${id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as ApiResponse<{ success: boolean }>;
      if (data.success) {
        setKeywords((prev) => prev.filter((k) => k.id !== id));
      } else {
        setError(data.error?.message || "Failed to delete keyword");
      }
    } catch {
      setError("Failed to delete keyword");
    }
  }

  function startEdit(keyword: FlaggedKeyword) {
    setEditingId(keyword.id);
    setEditPhrase(keyword.phrase);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditPhrase("");
  }

  return (
    <Card padding="lg">
      <h2 className="text-lg font-semibold mb-1">Flagged Keywords</h2>
      <p className="text-sm text-gray-500 mb-4">
        Messages matching any word or phrase below are held for manual review.
        All others are auto-approved.
      </p>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}
      <div className="flex gap-2 mb-6">
        <Input
          value={newPhrase}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setNewPhrase(e.target.value)
          }
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
            e.key === "Enter" && handleAdd()
          }
          placeholder="Add a word or phrase..."
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={!newPhrase.trim()}>
          Add
        </Button>
      </div>
      {loading ? (
        <p className="text-sm text-gray-500 py-4 text-center">Loading...</p>
      ) : keywords.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          No flagged keywords yet. All messages will be auto-approved.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {keywords.map((keyword) => (
            <li key={keyword.id} className="py-2 flex items-center gap-2">
              {editingId === keyword.id ? (
                <>
                  <Input
                    value={editPhrase}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditPhrase(e.target.value)
                    }
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") handleEdit(keyword.id);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    onClick={() => handleEdit(keyword.id)}
                    disabled={!editPhrase.trim()}
                  >
                    Save
                  </Button>
                  <Button variant="secondary" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-mono text-sm text-gray-800">
                    {keyword.phrase}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => startEdit(keyword)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(keyword.id)}
                  >
                    Remove
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── Message History ──────────────────────────────────────────────────────────

interface MessageLogEntry {
  id: string;
  body: string;
  status: string;
  senderType: "incarcerated" | "family";
  createdAt: string;
  conversation: {
    id: string;
    incarceratedPerson: Person;
    familyMember: FamilyMember;
  };
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "sent", label: "Sent" },
  { value: "delivered", label: "Delivered" },
  { value: "read", label: "Read" },
  { value: "blocked", label: "Blocked" },
];

type Filters = {
  search: string;
  status: string;
  startDate: string;
  endDate: string;
};
const EMPTY_FILTERS: Filters = {
  search: "",
  status: "",
  startDate: "",
  endDate: "",
};

function MessageHistory({ facilityId }: { facilityId?: string }) {
  const [messages, setMessages] = useState<MessageLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);

  const fetchPage = useCallback(
    async (page: number, filters: Filters) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "20",
        });
        if (facilityId) params.set("facilityId", facilityId);
        if (filters.search) params.set("search", filters.search);
        if (filters.status) params.set("status", filters.status);
        if (filters.startDate) params.set("startDate", filters.startDate);
        if (filters.endDate) params.set("endDate", filters.endDate);
        const res = await apiFetch(`${apiBase}/logs?${params}`);
        const data = (await res.json()) as ApiResponse<MessageLogEntry[]> & {
          pagination?: Pagination;
        };
        if (data.success) {
          setMessages(data.data);
          if (data.pagination) setPagination(data.pagination);
        }
      } catch {
        setError("Failed to load message history");
      } finally {
        setLoading(false);
      }
    },
    [facilityId],
  );

  useEffect(() => {
    fetchPage(1, EMPTY_FILTERS);
  }, [facilityId, fetchPage]);

  function handleApplyFilters() {
    const filters: Filters = {
      search,
      status: statusFilter,
      startDate,
      endDate,
    };
    setAppliedFilters(filters);
    fetchPage(1, filters);
  }

  function handleClearFilters() {
    setSearch("");
    setStatusFilter("");
    setStartDate("");
    setEndDate("");
    setAppliedFilters(EMPTY_FILTERS);
    fetchPage(1, EMPTY_FILTERS);
  }

  const statusColor: Record<string, string> = {
    pending_review: "text-yellow-600",
    approved: "text-teal-600",
    sent: "text-green-600",
    delivered: "text-green-700",
    read: "text-blue-600",
    blocked: "text-red-600",
  };

  const statusLabel: Record<string, string> = {
    pending_review: "Pending Review",
    approved: "Approved",
    sent: "Sent",
    delivered: "Delivered",
    read: "Read",
    blocked: "Rejected",
  };

  return (
    <Card padding="lg">
      <h2 className="text-lg font-semibold mb-4">Message History</h2>

      <div className="flex flex-wrap gap-2 mb-4">
        <Input
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearch(e.target.value)
          }
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
            e.key === "Enter" && handleApplyFilters()
          }
          placeholder="Search messages..."
          className="flex-1 min-w-40"
        />
        <select
          value={statusFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setStatusFilter(e.target.value)
          }
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Input
          type="date"
          value={startDate}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setStartDate(e.target.value)
          }
          className="w-36"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setEndDate(e.target.value)
          }
          className="w-36"
        />
        <Button onClick={handleApplyFilters}>Search</Button>
        {(search || statusFilter || startDate || endDate) && (
          <Button variant="secondary" onClick={handleClearFilters}>
            Clear
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}
      {loading ? (
        <p className="text-sm text-gray-500 py-4 text-center">Loading...</p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          No messages found.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-gray-100">
            {messages.map((msg) => (
              <li key={msg.id} className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 mb-1">
                      {msg.senderType === "incarcerated"
                        ? `${fullName(msg.conversation.incarceratedPerson)} → ${fullName(msg.conversation.familyMember)}`
                        : `${fullName(msg.conversation.familyMember)} → ${fullName(msg.conversation.incarceratedPerson)}`}
                      {" · "}
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-900 break-words">
                      {msg.body}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium shrink-0 ${statusColor[msg.status] ?? "text-gray-500"}`}
                  >
                    {statusLabel[msg.status] ?? msg.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages} (
                {pagination.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => fetchPage(pagination.page - 1, appliedFilters)}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => fetchPage(pagination.page + 1, appliedFilters)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────

function MessagingDashboard() {
  const [stats, setStats] = useState<MessagingStats>({
    todayTotal: 0,
    pendingReview: 0,
  });
  const [facilityId, setFacilityId] = useState<string | undefined>(undefined);
  const [contentKey, setContentKey] = useState(0);

  const fetchStats = useCallback(() => {
    apiFetch(`${apiBase}/stats`)
      .then((r) => r.json() as Promise<ApiResponse<MessagingStats>>)
      .then((data) => {
        if (data.success) setStats(data.data);
      })
      .catch(() => {});
  }, []);

  const refreshAll = useCallback(() => {
    setContentKey((k) => k + 1);
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((r) => r.json() as Promise<ApiResponse<{ facilityId?: string }>>)
      .then((data) => {
        if (data.success) setFacilityId(data.data.facilityId);
      })
      .catch(() => {});
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Message Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="md">
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600">
              {stats.pendingReview}
            </p>
            <p className="text-sm text-gray-600">Pending Review</p>
          </div>
        </Card>
        <Card padding="md">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">
              {stats.todayTotal}
            </p>
            <p className="text-sm text-gray-600">Messages Today</p>
          </div>
        </Card>
      </div>

      <ContactRequests facilityId={facilityId} onChanged={refreshAll} />
      <PendingMessages onReviewed={refreshAll} />
      <BlockedConversations
        key={contentKey}
        facilityId={facilityId}
        onChanged={refreshAll}
      />
      <MessageHistory key={`h-${contentKey}`} facilityId={facilityId} />
      <KeywordManager facilityId={facilityId} />
    </div>
  );
}

export default function MessagingAdmin() {
  return (
    <Routes>
      <Route index element={<MessagingDashboard />} />
    </Routes>
  );
}
