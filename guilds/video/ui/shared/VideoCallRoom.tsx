import React, { useRef, useEffect } from 'react';
import { useVideoCall, type ConnectionState } from '../shared/useVideoCall.js';

interface VideoCallRoomProps {
  callId: string;
  userId: string;
  userRole: 'incarcerated' | 'family';
  scheduledEnd: string;
  signalingUrl: string;
  onExit: () => void;
}

const STATE_LABELS: Record<ConnectionState, string> = {
  IDLE: 'Initialising…',
  WAITING_FOR_PEER: 'Waiting for the other person to join…',
  CONNECTING: 'Connecting…',
  CONNECTED: 'Connected',
  RECONNECTING: 'Reconnecting…',
  ENDED: 'Call ended',
  ERROR: 'Connection error',
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function VideoCallRoom({
  callId,
  userId,
  userRole,
  scheduledEnd,
  signalingUrl,
  onExit,
}: VideoCallRoomProps) {
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const {
    connectionState,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    timeRemaining,
    toggleMute,
    toggleCamera,
    hangUp,
  } = useVideoCall({
    callId,
    userId,
    userRole,
    scheduledEnd,
    signalingUrl,
    onCallEnded: (_reason) => { setTimeout(onExit, 1500); },
  });

  // Wire streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const isWarning = timeRemaining <= 60;

  return (
    <div
      id={`video-call-room-${callId}`}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Status bar */}
      <div style={{
        padding: '12px 20px',
        background: 'rgba(255,255,255,0.04)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <span style={{ color: '#94a3b8', fontSize: '14px' }}>
          {STATE_LABELS[connectionState]}
        </span>
        <span
          id="time-remaining"
          style={{
            color: isWarning ? '#f87171' : '#6366f1',
            fontWeight: 700,
            fontSize: '16px',
            transition: 'color 0.3s',
          }}
        >
          {formatTime(timeRemaining)}
        </span>
      </div>

      {/* Video area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#1e293b' }}>
        {/* Remote (full frame) */}
        <video
          id="remote-video"
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* Local (picture-in-picture) */}
        <video
          id="local-video"
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            width: '160px',
            height: '120px',
            borderRadius: '10px',
            objectFit: 'cover',
            border: '2px solid rgba(99,102,241,0.6)',
            background: '#0f172a',
          }}
        />

        {/* Overlay when not yet connected */}
        {connectionState !== 'CONNECTED' && connectionState !== 'ENDED' && connectionState !== 'RECONNECTING' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15,23,42,0.7)',
          }}>
            <p style={{ color: '#94a3b8', fontSize: '18px', textAlign: 'center' }}>
              {STATE_LABELS[connectionState]}
            </p>
          </div>
        )}

        {/* Non-blocking warning for RECONNECTING */}
        {connectionState === 'RECONNECTING' && (
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(239, 68, 68, 0.9)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 500,
            fontSize: '14px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            zIndex: 10,
          }}>
            Poor connection. Trying to reconnect...
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{
        padding: '20px',
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        background: 'rgba(255,255,255,0.03)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        <button
          id="btn-mute"
          onClick={toggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
          style={controlBtnStyle(isMuted)}
        >
          {isMuted ? '🔇' : '🎤'}
        </button>

        <button
          id="btn-camera"
          onClick={toggleCamera}
          title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
          style={controlBtnStyle(isCameraOff)}
        >
          {isCameraOff ? '📵' : '📹'}
        </button>

        <button
          id="btn-hangup"
          onClick={() => hangUp('user')}
          title="End call"
          style={{
            ...controlBtnStyle(false),
            background: '#ef4444',
          }}
        >
          📵
        </button>
      </div>
    </div>
  );
}

function controlBtnStyle(active: boolean): React.CSSProperties {
  return {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    fontSize: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: active ? '#374151' : 'rgba(99,102,241,0.2)',
    transition: 'background 0.2s, transform 0.1s',
  };
}
