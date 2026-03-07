/// <reference types="vitest/globals" />
import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ConnectionState =
  | 'IDLE'
  | 'WAITING_FOR_PEER'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'ENDED'
  | 'ERROR';

export interface UseVideoCallOptions {
  callId: string;
  userId: string;
  userRole: 'incarcerated' | 'family';
  scheduledEnd: string;       // ISO8601
  signalingUrl: string;
  onCallEnded?: (reason: string) => void;
  onTimeWarning?: () => void; // fired when ≤60s remain
}

export interface UseVideoCallReturn {
  connectionState: ConnectionState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  timeRemaining: number;     // seconds
  toggleMute: () => void;
  toggleCamera: () => void;
  hangUp: (reason?: string) => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useVideoCall(options: UseVideoCallOptions): UseVideoCallReturn {
  const { callId, userId, userRole, scheduledEnd, signalingUrl, onCallEnded, onTimeWarning } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>('IDLE');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(() =>
    Math.max(0, Math.round((new Date(scheduledEnd).getTime() - Date.now()) / 1000)),
  );

  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningFiredRef = useRef(false);
  const endedRef = useRef(false);

  // ─── End call (idempotent) ───────────────────────────────────────────────
  const hangUp = useCallback((reason = 'user') => {
    if (endedRef.current) return;
    endedRef.current = true;
    setConnectionState('ENDED');

    socketRef.current?.emit('call-ended', { roomId: callId, reason });
    socketRef.current?.disconnect();
    peerRef.current?.close();

    localStreamRef.current?.getTracks().forEach((t) => t.stop());

    if (endTimerRef.current) clearTimeout(endTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    onCallEnded?.(reason);
  }, [callId, onCallEnded]);

  // ─── Media & Socket Initialization ───────────────────────────────────────
  useEffect(() => {
    let isSubscribed = true;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!isSubscribed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setLocalStream(stream);
        localStreamRef.current = stream;

        connectSocket(stream);
      } catch (err) {
        console.error('Failed to get local media:', err);
        setConnectionState('ERROR');
      }
    }

    function connectSocket(stream: MediaStream) {
      const socket = io(signalingUrl, { transports: ['websocket'] });
      socketRef.current = socket;

      // Scheduled-end client-side enforcement
      const msRemaining = new Date(scheduledEnd).getTime() - Date.now();
      if (msRemaining > 0) {
        endTimerRef.current = setTimeout(() => hangUp('time_limit'), msRemaining);
        countdownRef.current = setInterval(() => {
          const remaining = Math.max(0, Math.round((new Date(scheduledEnd).getTime() - Date.now()) / 1000));
          setTimeRemaining(remaining);
          if (remaining <= 60 && !warningFiredRef.current) {
            warningFiredRef.current = true;
            onTimeWarning?.();
          }
        }, 1000);
      }

      socket.on('connect', () => {
        socket.emit('join-room', { roomId: callId, userId, userRole, callType: 'video', scheduledEnd });
        setConnectionState('WAITING_FOR_PEER');
      });

      socket.on('room-joined', (data: { roomId: string; participants: any[] }) => {
        if (data.participants.length > 0) {
          // You joined second, wait for their offer.
          setConnectionState('CONNECTING');
        }
      });

      socket.on('user-joined', async () => {
        // You were here first, someone joined. Initialize call.
        setConnectionState('CONNECTING');
        await createPeerAndOffer(socket, stream);
      });

      socket.on('offer', async (data: { sdp: RTCSessionDescriptionInit }) => {
        setConnectionState('CONNECTING');
        await handleOffer(socket, stream, data.sdp);
      });

      socket.on('answer', async (data: { sdp: RTCSessionDescriptionInit }) => {
        await peerRef.current?.setRemoteDescription(data.sdp);
      });

      socket.on('ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
        await peerRef.current?.addIceCandidate(data.candidate);
      });

      socket.on('peer-connected', () => setConnectionState('CONNECTED'));
      socket.on('call-ended', (data: { reason: string }) => hangUp(data.reason));
    }

    init();

    return () => {
      isSubscribed = false;
      if (!endedRef.current) {
        socketRef.current?.disconnect();
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        if (endTimerRef.current) clearTimeout(endTimerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── WebRTC helpers ──────────────────────────────────────────────────────
  async function createPeerAndOffer(socket: Socket, stream: MediaStream) {
    const pc = createPeerConnection(socket);
    peerRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('offer', { sdp: offer, roomId: callId });
  }

  async function handleOffer(socket: Socket, stream: MediaStream, sdp: RTCSessionDescriptionInit) {
    const pc = createPeerConnection(socket);
    peerRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    await pc.setRemoteDescription(sdp);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('answer', { sdp: answer, roomId: callId });
  }

  function createPeerConnection(socket: Socket): RTCPeerConnection {
    const config: RTCConfiguration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    const turnUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env)
      ? (import.meta as any).env.VITE_TURN_URL
      : undefined;
    if (turnUrl) config.iceServers!.push({ urls: turnUrl });

    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('ice-candidate', { candidate: e.candidate, roomId: callId });
    };

    pc.ontrack = (e) => setRemoteStream(e.streams[0]);

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectionState('CONNECTED');
        socket.emit('peer-connected', { roomId: callId });
      } else if (['disconnected', 'failed'].includes(pc.iceConnectionState)) {
        setConnectionState('RECONNECTING');
      }
    };

    return pc;
  }

  // ─── Media controls ──────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = prev; });
      socketRef.current?.emit('mute-toggle', { type: 'audio', muted: !prev, roomId: callId });
      return !prev;
    });
  }, [callId]);

  const toggleCamera = useCallback(() => {
    setIsCameraOff(prev => {
      localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = prev; });
      socketRef.current?.emit('mute-toggle', { type: 'video', muted: !prev, roomId: callId });
      return !prev;
    });
  }, [callId]);

  return { connectionState, localStream, remoteStream, isMuted, isCameraOff, timeRemaining, toggleMute, toggleCamera, hangUp };
}
