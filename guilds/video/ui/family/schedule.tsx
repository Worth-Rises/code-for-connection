import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Card } from '@openconnect/ui';
import { familyMessages } from '../messages';

interface TimeSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  available: boolean;
  remaining: number;
}

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
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [facilityId, setFacilityId] = useState<string | null>(null);

  // Fetch time slots and facility info on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // @ts-ignore
        const token: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
        
        // First, get the facility ID from the contact
        const contactRes = await fetch(`/api/video/approved-contacts`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (contactRes.ok) {
          const contactData: any = await contactRes.json();
          const contact = contactData.data?.find((c: any) => c.incarceratedPersonId === contactId);
          if (contact) {
            setFacilityId(contact.incarceratedPerson.facilityId);

            // Now fetch time slots for this facility
            const slotsRes = await fetch(`/api/video/time-slots?facilityId=${contact.incarceratedPerson.facilityId}`, {
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            });

            if (slotsRes.ok) {
              const slotsData: any = await slotsRes.json();
              setTimeSlots(slotsData.data || []);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching time slots:', err);
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchData();
  }, [contactId]);

  // Get time slots for a specific date
  const getSlotsForDate = (dateStr: string): TimeSlot[] => {
    if (!dateStr) return [];
    const selectedDate = new Date(dateStr);
    const dayOfWeek = selectedDate.getDay();
    return timeSlots.filter((slot) => slot.dayOfWeek === dayOfWeek);
  };

  // Get available time options for the selected date
  const getTimeOptionsForDate = (dateStr: string): string[] => {
    const slotsForDay = getSlotsForDate(dateStr);
    const times: string[] = [];
    
    slotsForDay.forEach((slot) => {
      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      
      // Generate 30-minute increments within this slot
      let currentHour = startHour;
      let currentMin = startMin;
      
      while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        const h = currentHour.toString().padStart(2, '0');
        const m = currentMin.toString().padStart(2, '0');
        times.push(`${h}:${m}`);
        
        currentMin += 30;
        if (currentMin >= 60) {
          currentMin = 0;
          currentHour += 1;
        }
      }
    });
    
    return [...new Set(times)]; // Remove duplicates
  };

  // Format time slots for display
  const formatTimeSlotsForDisplay = (): string => {
    if (timeSlots.length === 0) return 'Loading availability...';
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const slotsByDay: Record<number, TimeSlot[]> = {};
    
    timeSlots.forEach((slot) => {
      if (!slotsByDay[slot.dayOfWeek]) {
        slotsByDay[slot.dayOfWeek] = [];
      }
      slotsByDay[slot.dayOfWeek].push(slot);
    });
    
    const displayParts: string[] = [];
    Object.keys(slotsByDay)
      .map(Number)
      .sort()
      .forEach((dayOfWeek) => {
        const slots = slotsByDay[dayOfWeek];
        const timeRanges = slots.map((s) => `${s.startTime} - ${s.endTime}`).join(', ');
        displayParts.push(`${dayNames[dayOfWeek]}: ${timeRanges}`);
      });
    
    return displayParts.join('\n');
  };

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

      // Validate selected date/time is in an allowed slot
      const slotsForSelectedDate = getSlotsForDate(date);
      const [selectedHour, selectedMin] = time.split(':').map(Number);
      const isValidSlot = slotsForSelectedDate.some((slot) => {
        const [startHour, startMin] = slot.startTime.split(':').map(Number);
        const [endHour, endMin] = slot.endTime.split(':').map(Number);
        const slotStart = startHour * 60 + startMin;
        const slotEnd = endHour * 60 + endMin;
        const selectedTime = selectedHour * 60 + selectedMin;
        return selectedTime >= slotStart && selectedTime < slotEnd;
      });

      if (!isValidSlot) {
        throw new Error('Please select a time within an available slot');
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

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];
  const timeOptions = getTimeOptionsForDate(date);

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

      <Card padding="lg" className="bg-blue-50 border border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-2">Available Time Slots</h3>
        <p>This facility allows calls to be scheduled during the following windows:</p>
        <p className="text-sm text-gray-700 whitespace-pre-line">
          {formatTimeSlotsForDisplay()}
        </p>
      </Card>

    </div>
  );
}
