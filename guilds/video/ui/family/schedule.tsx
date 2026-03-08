import React, { useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Card } from '@openconnect/ui';
import { familyMessages } from '../messages';

export default function ScheduleCall() {
  const { contactId } = useParams<{ contactId: string }>();
  const [searchParams] = useSearchParams();
  const rescheduleCallId = searchParams.get('rescheduleCallId');
  const isRescheduleMode = !!rescheduleCallId;
  const navigate = useNavigate();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate date/time is in the future
      const selectedDateTime = new Date(`${date}T${time}`);
      const now = new Date();
      
      if (selectedDateTime <= now) {
        throw new Error(familyMessages.schedule.inPastError);
      }

      // Calculate end time (30 minutes later)
      const scheduledEnd = new Date(selectedDateTime.getTime() + 30 * 60 * 1000);

      // @ts-ignore
      const token: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;

      const endpoint = isRescheduleMode
        ? `/api/video/reschedule-call/${rescheduleCallId}`
        : '/api/video/request';

      const requestBody = isRescheduleMode
        ? {
            scheduledStart: selectedDateTime.toISOString(),
            scheduledEnd: scheduledEnd.toISOString(),
          }
        : {
            incarceratedPersonId: contactId,
            scheduledStart: selectedDateTime.toISOString(),
            scheduledEnd: scheduledEnd.toISOString(),
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const json: any = await res.json();
        throw new Error(json.error?.message || `HTTP ${res.status}`);
      }

      setSuccess(true);
      setTimeout(() => {
        navigate(`/family/video/manage_contact/${contactId}/scheduled`);
      }, 1500);
    } catch (err: any) {
      setError(
        err.message
        || (isRescheduleMode
          ? familyMessages.schedule.rescheduleErrorFallback
          : familyMessages.schedule.submitErrorFallback)
      );
    } finally {
      setLoading(false);
    }
  };

  // Generate time options in 30-minute increments
  const timeOptions: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      timeOptions.push(`${h}:${m}`);
    }
  }

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      <Link to=".." className="inline-flex items-center min-h-[44px] text-blue-600 hover:text-blue-700 hover:underline">&larr; {familyMessages.common.back}</Link>
      
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
        {isRescheduleMode ? familyMessages.schedule.rescheduleTitle : familyMessages.schedule.title}
      </h1>

      <Card padding="lg">
        {success ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-semibold mb-2 text-green-600">
              {isRescheduleMode ? familyMessages.schedule.rescheduleSuccessTitle : familyMessages.schedule.successTitle}
            </h2>
            <p className="text-gray-600">
              {isRescheduleMode ? familyMessages.schedule.rescheduleSuccessDescription : familyMessages.schedule.successDescription}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {familyMessages.schedule.dateLabel}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e: any) => setDate(e.target.value)}
                min={today}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {familyMessages.schedule.timeLabel}
              </label>
              <select
                value={time}
                onChange={(e: any) => setTime(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{familyMessages.schedule.timePlaceholder}</option>
                {timeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading
                  ? (isRescheduleMode ? familyMessages.schedule.reschedulingButton : familyMessages.schedule.requestingButton)
                  : (isRescheduleMode ? familyMessages.schedule.rescheduleCallButton : familyMessages.schedule.requestCallButton)}
              </button>
              <button
                type="button"
                onClick={() => navigate('..')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex-shrink-0"
              >
                {familyMessages.schedule.cancelButton}
              </button>
            </div>

            <p className="text-sm text-gray-500">
              {familyMessages.schedule.approvalNote}
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}
