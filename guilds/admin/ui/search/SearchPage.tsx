import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@openconnect/ui';
import { useAdminApi } from '../../hooks/useAdminApi';

interface SearchResults {
  residents: Array<{
    id: string;
    firstName: string;
    lastName: string;
    externalId: string;
    status: string;
    facility?: { name: string } | null;
    housingUnit?: { name: string } | null;
  }>;
  contacts: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    approvedContacts?: Array<{
      incarceratedPerson: { firstName: string; lastName: string };
    }>;
  }>;
  visitors: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    visitorType: string;
  }>;
  messages: Array<{
    id: string;
    body: string;
    senderType: string;
    createdAt: string;
    conversation?: {
      incarceratedPerson: { firstName: string; lastName: string };
      familyMember: { firstName: string; lastName: string };
    } | null;
  }>;
}

export default function SearchPage() {
  const { get } = useAdminApi();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({ q: q.trim() });
      const res = await get(`/search?${params}`);
      setResults(res.data || null);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  const totalResults = results
    ? results.residents.length + results.contacts.length + results.visitors.length + results.messages.length
    : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Search</h1>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full text-lg rounded-lg border border-gray-300 pl-12 pr-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Search residents, contacts, visitors, or messages..."
          autoFocus
        />
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-500">Searching...</div>
      )}

      {!loading && !searched && (
        <div className="text-center py-12 text-gray-500">
          Enter a search term to find residents, contacts, visitors, or messages
        </div>
      )}

      {!loading && searched && totalResults === 0 && (
        <div className="text-center py-12 text-gray-500">
          No results found for &lsquo;{query}&rsquo;
        </div>
      )}

      {!loading && results && totalResults > 0 && (
        <div className="space-y-8">
          {/* Residents */}
          {results.residents.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Residents ({results.residents.length})
              </h2>
              <Card padding="none">
                <div className="divide-y divide-gray-100">
                  {results.residents.map((r) => (
                    <div
                      key={r.id}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                      onClick={() => navigate(`/admin/residents/${r.id}`)}
                    >
                      <div>
                        <span className="font-medium text-gray-900">
                          {r.firstName} {r.lastName}
                        </span>
                        {r.externalId && (
                          <span className="ml-2 text-sm text-gray-500">#{r.externalId}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        {r.facility?.name && <span>{r.facility.name}</span>}
                        {r.housingUnit?.name && <span>{r.housingUnit.name}</span>}
                        <span className="capitalize">{r.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          )}

          {/* Contacts */}
          {results.contacts.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Contacts ({results.contacts.length})
              </h2>
              <Card padding="none">
                <div className="divide-y divide-gray-100">
                  {results.contacts.map((c) => (
                    <div
                      key={c.id}
                      className="px-4 py-3 hover:bg-gray-50"
                    >
                      <div className="font-medium text-gray-900">
                        {c.firstName} {c.lastName}
                      </div>
                      {c.email && (
                        <div className="text-sm text-gray-500">{c.email}</div>
                      )}
                      {c.approvedContacts && c.approvedContacts.length > 0 && (
                        <div className="text-sm text-gray-500 mt-1">
                          Linked to: {c.approvedContacts.map((ac) =>
                            `${ac.incarceratedPerson.firstName} ${ac.incarceratedPerson.lastName}`
                          ).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          )}

          {/* Visitors */}
          {results.visitors.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Visitors ({results.visitors.length})
              </h2>
              <Card padding="none">
                <div className="divide-y divide-gray-100">
                  {results.visitors.map((v) => (
                    <div
                      key={v.id}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                      onClick={() => navigate(`/admin/visitors/${v.id}`)}
                    >
                      <div>
                        <span className="font-medium text-gray-900">
                          {v.firstName} {v.lastName}
                        </span>
                        {v.email && (
                          <span className="ml-2 text-sm text-gray-500">{v.email}</span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 capitalize">{v.visitorType}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          )}

          {/* Messages */}
          {results.messages.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Messages ({results.messages.length})
              </h2>
              <Card padding="none">
                <div className="divide-y divide-gray-100">
                  {results.messages.map((m) => (
                    <div
                      key={m.id}
                      className="px-4 py-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {m.conversation
                            ? m.senderType === 'incarcerated'
                              ? `${m.conversation.incarceratedPerson.firstName} ${m.conversation.incarceratedPerson.lastName}`
                              : `${m.conversation.familyMember.firstName} ${m.conversation.familyMember.lastName}`
                            : 'Unknown sender'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{m.body}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
