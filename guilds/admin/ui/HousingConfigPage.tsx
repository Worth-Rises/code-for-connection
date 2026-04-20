import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@openconnect/ui';
import { useAuth } from '../../../apps/web/src/context/AuthContext';

const API_BASE = '/api/admin/session-limits';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface UnitType {
  id: string;
  name: string;
  maxDailyVoiceCalls: number | null;
  maxDailyMessages: number | null;
  maxWeeklyVideoRequests: number | null;
  voiceCallsEnabled: boolean;
  videoCallsEnabled: boolean;
  messagingEnabled: boolean;
  voiceCallDurationMinutes: number;
  videoCallDurationMinutes: number;
  callingHoursStart: string;
  callingHoursEnd: string;
  maxContacts: number;
  videoSlotDurationMinutes: number;
  maxConcurrentVideoCalls: number;
  _count: { housingUnits: number };
}

interface TimeSlot {
  id: string;
  facilityId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  maxConcurrent: number;
  facility: { id: string; name: string };
}

interface EditForm {
  voiceCallDurationMinutes: number;
  videoCallDurationMinutes: number;
  callingHoursStart: string;
  callingHoursEnd: string;
  maxContacts: number;
  maxDailyVoiceCalls: number | null;
  maxDailyMessages: number | null;
  maxWeeklyVideoRequests: number | null;
  videoSlotDurationMinutes: number;
  maxConcurrentVideoCalls: number;
  voiceCallsEnabled: boolean;
  videoCallsEnabled: boolean;
  messagingEnabled: boolean;
}

interface NewSlotForm {
  facilityId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  maxConcurrent: number;
}

async function apiFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Request failed');
  return json.data;
}

function StatusBadge({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
    }`}>
      {label}: {enabled ? 'On' : 'Off'}
    </span>
  );
}

function ConfigRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

function LockdownBanner({ unitTypes, token, onComplete }: { unitTypes: UnitType[]; token: string; onComplete: () => void }) {
  const [acting, setActing] = useState(false);

  const allDisabled = unitTypes.length > 0 && unitTypes.every(
    (ut) => !ut.voiceCallsEnabled && !ut.videoCallsEnabled && !ut.messagingEnabled
  );

  async function handleLockdown(enable: boolean) {
    const msg = enable
      ? 'This will RE-ENABLE voice, video, and messaging for ALL housing unit types. Continue?'
      : 'This will DISABLE all voice, video, and messaging for EVERY housing unit type. Continue?';
    if (!confirm(msg)) return;

    try {
      setActing(true);
      await apiFetch('/emergency-lockdown', token, {
        method: 'POST',
        body: JSON.stringify({ enable }),
      });
      onComplete();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lockdown action failed');
    } finally {
      setActing(false);
    }
  }

  if (allDisabled) {
    return (
      <div className="rounded-lg border-2 border-red-300 bg-red-50 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-red-800">COMMUNICATIONS DISABLED</p>
          <p className="text-sm text-red-600">All voice, video, and messaging are off for every housing unit type.</p>
        </div>
        <button
          onClick={() => handleLockdown(true)}
          disabled={acting}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {acting ? 'Restoring...' : 'Restore Communications'}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-700">All Communications Active</p>
        <p className="text-xs text-gray-500">Use this to immediately shut down all voice, video, and messaging.</p>
      </div>
      <button
        onClick={() => handleLockdown(false)}
        disabled={acting}
        className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        {acting ? 'Locking down...' : 'Emergency Lockdown'}
      </button>
    </div>
  );
}

export default function HousingConfigPage() {
  const { token } = useAuth();
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-card UI state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  const [slotsOpenId, setSlotsOpenId] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [addingSlot, setAddingSlot] = useState(false);
  const [newSlot, setNewSlot] = useState<NewSlotForm>({
    facilityId: '',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:00',
    maxConcurrent: 5,
  });

  const fetchUnitTypes = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await apiFetch<UnitType[]>('/unit-types', token);
      setUnitTypes(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load unit types');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUnitTypes();
  }, [fetchUnitTypes]);

  function startEdit(ut: UnitType) {
    setEditingId(ut.id);
    setEditForm({
      voiceCallDurationMinutes: ut.voiceCallDurationMinutes,
      videoCallDurationMinutes: ut.videoCallDurationMinutes,
      callingHoursStart: ut.callingHoursStart,
      callingHoursEnd: ut.callingHoursEnd,
      maxContacts: ut.maxContacts,
      maxDailyVoiceCalls: ut.maxDailyVoiceCalls,
      maxDailyMessages: ut.maxDailyMessages,
      maxWeeklyVideoRequests: ut.maxWeeklyVideoRequests,
      videoSlotDurationMinutes: ut.videoSlotDurationMinutes,
      maxConcurrentVideoCalls: ut.maxConcurrentVideoCalls,
      voiceCallsEnabled: ut.voiceCallsEnabled,
      videoCallsEnabled: ut.videoCallsEnabled,
      messagingEnabled: ut.messagingEnabled,
    });
  }

  async function saveEdit(unitTypeId: string) {
    if (!token || !editForm) return;
    try {
      setSaving(true);
      await apiFetch(`/unit-types/${unitTypeId}/limits`, token, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      await fetchUnitTypes();
      setEditingId(null);
      setEditForm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function loadSlots(unitTypeId: string) {
    if (!token) return;
    if (slotsOpenId === unitTypeId) {
      setSlotsOpenId(null);
      return;
    }
    try {
      setSlotsLoading(true);
      setSlotsOpenId(unitTypeId);
      const data = await apiFetch<TimeSlot[]>(`/unit-types/${unitTypeId}/time-slots`, token);
      setSlots(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load slots');
      setSlotsOpenId(null);
    } finally {
      setSlotsLoading(false);
    }
  }

  async function createSlot(unitTypeId: string) {
    if (!token) return;
    try {
      await apiFetch(`/unit-types/${unitTypeId}/time-slots`, token, {
        method: 'POST',
        body: JSON.stringify(newSlot),
      });
      // Reload slots
      const data = await apiFetch<TimeSlot[]>(`/unit-types/${unitTypeId}/time-slots`, token);
      setSlots(data);
      setAddingSlot(false);
      setNewSlot({ facilityId: '', dayOfWeek: 1, startTime: '09:00', endTime: '10:00', maxConcurrent: 5 });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create slot');
    }
  }

  async function deleteSlot(slotId: string, unitTypeId: string) {
    if (!token) return;
    try {
      await apiFetch(`/time-slots/${slotId}`, token, { method: 'DELETE' });
      const data = await apiFetch<TimeSlot[]>(`/unit-types/${unitTypeId}/time-slots`, token);
      setSlots(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete slot');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button onClick={fetchUnitTypes} className="mt-2 text-sm text-red-600 underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Housing Configuration</h1>
        <p className="text-gray-600">Configure calling hours, session limits, and video time slots by housing unit type</p>
      </div>

      {unitTypes.length > 0 && (
        <LockdownBanner unitTypes={unitTypes} token={token!} onComplete={fetchUnitTypes} />
      )}

      {unitTypes.length === 0 ? (
        <Card padding="lg">
          <p className="text-center text-gray-500 py-8">No housing unit types configured for this agency.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {unitTypes.map((ut) => (
            <Card key={ut.id} padding="lg">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{ut.name}</h2>
                  <p className="text-sm text-gray-500">
                    {ut._count.housingUnits} housing unit{ut._count.housingUnits !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge enabled={ut.voiceCallsEnabled} label="Voice" />
                  <StatusBadge enabled={ut.videoCallsEnabled} label="Video" />
                  <StatusBadge enabled={ut.messagingEnabled} label="Messaging" />
                </div>
              </div>

              {/* Display mode */}
              {editingId !== ut.id && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 border-t border-gray-100 pt-3">
                    <div>
                      <ConfigRow label="Calling Hours" value={`${ut.callingHoursStart} - ${ut.callingHoursEnd}`} />
                      <ConfigRow label="Voice Call Duration" value={`${ut.voiceCallDurationMinutes} min`} />
                      <ConfigRow label="Video Call Duration" value={`${ut.videoCallDurationMinutes} min`} />
                      <ConfigRow label="Max Contacts" value={ut.maxContacts} />
                    </div>
                    <div>
                      <ConfigRow label="Daily Voice Calls" value={ut.maxDailyVoiceCalls ?? 'Unlimited'} />
                      <ConfigRow label="Daily Messages" value={ut.maxDailyMessages ?? 'Unlimited'} />
                      <ConfigRow label="Weekly Video Requests" value={ut.maxWeeklyVideoRequests ?? 'Unlimited'} />
                      <ConfigRow label="Video Slot Duration" value={`${ut.videoSlotDurationMinutes} min`} />
                      <ConfigRow label="Max Concurrent Video" value={ut.maxConcurrentVideoCalls} />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => startEdit(ut)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => loadSlots(ut.id)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        slotsOpenId === ut.id
                          ? 'bg-gray-200 text-gray-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {slotsOpenId === ut.id ? 'Hide Time Slots' : 'Time Slots'}
                    </button>
                  </div>
                </>
              )}

              {/* Edit mode */}
              {editingId === ut.id && editForm && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Schedule</h3>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Calling Hours Start</label>
                        <input
                          type="time"
                          value={editForm.callingHoursStart}
                          onChange={(e) => setEditForm({ ...editForm, callingHoursStart: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Calling Hours End</label>
                        <input
                          type="time"
                          value={editForm.callingHoursEnd}
                          onChange={(e) => setEditForm({ ...editForm, callingHoursEnd: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Voice Call Duration (min)</label>
                        <input
                          type="number"
                          min={1}
                          value={editForm.voiceCallDurationMinutes}
                          onChange={(e) => setEditForm({ ...editForm, voiceCallDurationMinutes: parseInt(e.target.value) || 1 })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Video Call Duration (min)</label>
                        <input
                          type="number"
                          min={1}
                          value={editForm.videoCallDurationMinutes}
                          onChange={(e) => setEditForm({ ...editForm, videoCallDurationMinutes: parseInt(e.target.value) || 1 })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Limits</h3>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Max Contacts</label>
                        <input
                          type="number"
                          min={1}
                          value={editForm.maxContacts}
                          onChange={(e) => setEditForm({ ...editForm, maxContacts: parseInt(e.target.value) || 1 })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Daily Voice Calls (blank = unlimited)</label>
                        <input
                          type="number"
                          min={0}
                          value={editForm.maxDailyVoiceCalls ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, maxDailyVoiceCalls: e.target.value === '' ? null : parseInt(e.target.value) })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          placeholder="Unlimited"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Daily Messages (blank = unlimited)</label>
                        <input
                          type="number"
                          min={0}
                          value={editForm.maxDailyMessages ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, maxDailyMessages: e.target.value === '' ? null : parseInt(e.target.value) })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          placeholder="Unlimited"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Weekly Video Requests (blank = unlimited)</label>
                        <input
                          type="number"
                          min={0}
                          value={editForm.maxWeeklyVideoRequests ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, maxWeeklyVideoRequests: e.target.value === '' ? null : parseInt(e.target.value) })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          placeholder="Unlimited"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Video Slot Duration (min)</label>
                        <input
                          type="number"
                          min={1}
                          value={editForm.videoSlotDurationMinutes}
                          onChange={(e) => setEditForm({ ...editForm, videoSlotDurationMinutes: parseInt(e.target.value) || 1 })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Max Concurrent Video Calls</label>
                        <input
                          type="number"
                          min={1}
                          value={editForm.maxConcurrentVideoCalls}
                          onChange={(e) => setEditForm({ ...editForm, maxConcurrentVideoCalls: parseInt(e.target.value) || 1 })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>

                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide pt-2">Features</h3>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editForm.voiceCallsEnabled}
                          onChange={(e) => setEditForm({ ...editForm, voiceCallsEnabled: e.target.checked })}
                          className="rounded"
                        />
                        Voice Calls Enabled
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editForm.videoCallsEnabled}
                          onChange={(e) => setEditForm({ ...editForm, videoCallsEnabled: e.target.checked })}
                          className="rounded"
                        />
                        Video Calls Enabled
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editForm.messagingEnabled}
                          onChange={(e) => setEditForm({ ...editForm, messagingEnabled: e.target.checked })}
                          className="rounded"
                        />
                        Messaging Enabled
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => saveEdit(ut.id)}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditForm(null); }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Time slots panel */}
              {slotsOpenId === ut.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Video Time Slots</h3>
                    <button
                      onClick={() => setAddingSlot(!addingSlot)}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      {addingSlot ? 'Cancel' : '+ Add Slot'}
                    </button>
                  </div>

                  {addingSlot && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-3 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Facility ID</label>
                          <input
                            type="text"
                            value={newSlot.facilityId}
                            onChange={(e) => setNewSlot({ ...newSlot, facilityId: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                            placeholder="facility-uuid"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Day</label>
                          <select
                            value={newSlot.dayOfWeek}
                            onChange={(e) => setNewSlot({ ...newSlot, dayOfWeek: parseInt(e.target.value) })}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                          >
                            {DAY_NAMES.map((name, i) => (
                              <option key={i} value={i}>{name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Start</label>
                          <input
                            type="time"
                            value={newSlot.startTime}
                            onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">End</label>
                          <input
                            type="time"
                            value={newSlot.endTime}
                            onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Max Concurrent</label>
                          <input
                            type="number"
                            min={1}
                            value={newSlot.maxConcurrent}
                            onChange={(e) => setNewSlot({ ...newSlot, maxConcurrent: parseInt(e.target.value) || 1 })}
                            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => createSlot(ut.id)}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Create Slot
                      </button>
                    </div>
                  )}

                  {slotsLoading ? (
                    <p className="text-sm text-gray-500 py-4 text-center">Loading slots...</p>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">No time slots configured.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b">
                            <th className="pb-2 pr-4">Day</th>
                            <th className="pb-2 pr-4">Time</th>
                            <th className="pb-2 pr-4">Facility</th>
                            <th className="pb-2 pr-4">Concurrent</th>
                            <th className="pb-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {slots.map((slot) => (
                            <tr key={slot.id} className="border-b border-gray-50">
                              <td className="py-2 pr-4">{DAY_NAMES[slot.dayOfWeek]}</td>
                              <td className="py-2 pr-4">{slot.startTime} - {slot.endTime}</td>
                              <td className="py-2 pr-4 text-gray-600">{slot.facility.name}</td>
                              <td className="py-2 pr-4">{slot.maxConcurrent}</td>
                              <td className="py-2 text-right">
                                <button
                                  onClick={() => deleteSlot(slot.id, ut.id)}
                                  className="text-red-500 hover:text-red-700 text-xs font-medium"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
