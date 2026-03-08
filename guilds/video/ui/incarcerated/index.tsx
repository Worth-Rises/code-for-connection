import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ScheduledCallsList } from './ScheduledCallsList.js';
import { PastCallsList } from './PastCallsList';
import { VideoCallRoom } from '../shared/VideoCallRoom.js';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL ?? 'http://localhost:3001';

type JoinPhase = 'waiting' | 'active';

interface ActiveCall {
  callId: string;
  scheduledStart?: string;
  scheduledEnd: string;
  initialPhase?: JoinPhase;
}

function getUserIdFromToken(): string {
  try {
    const token = localStorage.getItem('token');
    if (!token) return '';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId ?? '';
  } catch {
    return '';
  }
}

function IncarceratedVideoHome() {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const userId = getUserIdFromToken();

  if (activeCall) {
    return (
      <VideoCallRoom
        callId={activeCall.callId}
        userId={userId}
        userRole="incarcerated"
        scheduledStart={activeCall.scheduledStart}
        scheduledEnd={activeCall.scheduledEnd}
        initialPhase={activeCall.initialPhase}
        signalingUrl={SIGNALING_URL}
        onExit={() => setActiveCall(null)}
      />
    );
  }

  return (
    <div className="min-h-full bg-slate-900 p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
        {/* Left column — upcoming scheduled calls */}
        <div className="w-full">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-6 text-center lg:text-left">
            Scheduled Calls
          </h2>
         <div className="overflow-y-auto max-h-[70vh] rounded-xl border border-white/10 bg-white/5 p-4">
          <ScheduledCallsList
            onJoinCall={(callId, scheduledStart, scheduledEnd) => {
              // First POST to join the call to determine waiting/active phase, then open the room
              fetch(`/api/video/join/${callId}`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
                  'Content-Type': 'application/json',
                },
              })
                .then((r) => r.json())
                .then((body) => {
                  if (body.success) {
                    setActiveCall({
                      callId,
                      scheduledStart: body.data?.scheduledStart ?? scheduledStart,
                      scheduledEnd: body.data?.scheduledEnd ?? scheduledEnd,
                      initialPhase: body.data?.phase,
                    });
                  } else {
                    alert(`Cannot join: ${body.error?.message ?? 'Unknown error'}`);
                  }
                 })
                .catch(() => alert('Failed to join call. Please try again.'));
              }}
            />
          </div>
        </div>

        {/* Right column — past calls */}
        <div className="w-full mt-8 lg:mt-0">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-6 text-center lg:text-left">
            Past Calls
          </h2>
          <div className="overflow-y-auto max-h-[70vh] rounded-xl border border-white/10 bg-white/5 p-4">
            <PastCallsList />
          </div>
        </div>
      </div>
    </div>
  );
}

// Default export for guild-loading conventions
export default function IncarceratedVideoUI() {
  return (
    <Routes>
      <Route index element={<IncarceratedVideoHome />} />
    </Routes>
  );
}
