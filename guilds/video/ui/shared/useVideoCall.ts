/// <reference types="vitest/globals" />
import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ConnectionState =
  | 'IDLE'
  | 'WAITING_FOR_START'
  | 'WAITING_FOR_PEER'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'ENDED'
  | 'ERROR';

export type CallPhase = 'waiting' | 'active';

export interface UseVideoCallOptions {
  callId: string;
  userId: string;
  userRole: 'incarcerated' | 'family';
  scheduledStart?: string;    // ISO8601
  scheduledEnd: string;       // ISO8601
  initialPhase?: CallPhase;
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
  /** Replace the video track sent to the remote peer (for blur toggle). */
  replaceVideoTrack: (newTrack: MediaStreamTrack) => void;
  /** The raw camera stream (before any processing). */
  rawStream: MediaStream | null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useVideoCall(options: UseVideoCallOptions): UseVideoCallReturn {
  const {
    callId,
    userId,
    userRole,
    scheduledStart,
    scheduledEnd,
    initialPhase,
    signalingUrl,
    onCallEnded,
    onTimeWarning,
  } = options;

  const initialCallPhase: CallPhase = initialPhase
    ?? (() => {
      if (scheduledStart) {
        const startMs = new Date(scheduledStart).getTime();
        if (!Number.isNaN(startMs) && Date.now() < startMs) return 'waiting';
      }
      return 'active';
    })();

  const [connectionState, setConnectionState] = useState<ConnectionState>('IDLE');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(() => {
    const endMs = new Date(scheduledEnd).getTime();
    const startMs = scheduledStart ? new Date(scheduledStart).getTime() : Number.NaN;

    if (initialCallPhase === 'waiting' && !Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs > startMs) {
      return Math.max(0, Math.round((endMs - startMs) / 1000));
    }

    return Math.max(0, Math.round((endMs - Date.now()) / 1000));
  });

  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningFiredRef = useRef(false);
  const endedRef = useRef(false);
  const callPhaseRef = useRef<CallPhase>(initialCallPhase);
  const activatedFromWaitingRef = useRef(false);
  const statsRef = useRef<{
    lastBytesAudio: number;
    lastBytesVideo: number;
    lastTimestamp: number;
  }>({ lastBytesAudio: 0, lastBytesVideo: 0, lastTimestamp: 0 });
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── End call (idempotent) ───────────────────────────────────────────────
  const hangUp = useCallback((reason = 'user') => {
    if (endedRef.current) return;
    endedRef.current = true;
    setConnectionState('ENDED');

    socketRef.current?.emit('call-ended', { roomId: callId, reason });
    socketRef.current?.disconnect();
    socketRef.current = null;

    peerRef.current?.close();
    peerRef.current = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    if (endTimerRef.current) clearTimeout(endTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    stopStatsCollection();

    onCallEnded?.(reason);
  }, [callId, onCallEnded]);

  // ─── Media & Socket Initialization ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setLocalStream(stream);
        localStreamRef.current = stream;
        rawStreamRef.current = stream;

        connectSocket(stream);
      } catch (err) {
        console.error('Failed to get local media:', err);
        if (!cancelled) setConnectionState('ERROR');
      }
    }

    function connectSocket(stream: MediaStream) {
      if (cancelled) return;

      const socket = io(signalingUrl, { transports: ['websocket'] });
      socketRef.current = socket;

      const scheduledEndMs = new Date(scheduledEnd).getTime();
      const scheduledStartMs = scheduledStart ? new Date(scheduledStart).getTime() : Number.NaN;
      const scheduledDurationSeconds =
        !Number.isNaN(scheduledStartMs)
        && !Number.isNaN(scheduledEndMs)
        && scheduledEndMs > scheduledStartMs
          ? Math.max(0, Math.round((scheduledEndMs - scheduledStartMs) / 1000))
          : Math.max(0, Math.round((scheduledEndMs - Date.now()) / 1000));

      const stopActiveCountdown = () => {
        if (endTimerRef.current) {
          clearTimeout(endTimerRef.current);
          endTimerRef.current = null;
        }
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
      };

      const syncActiveRemaining = () => {
        const remaining = Math.max(0, Math.round((scheduledEndMs - Date.now()) / 1000));
        setTimeRemaining(remaining);
        if (remaining <= 60 && !warningFiredRef.current) {
          warningFiredRef.current = true;
          onTimeWarning?.();
        }
        return remaining;
      };

      const startActiveCountdown = () => {
        stopActiveCountdown();
        if (Number.isNaN(scheduledEndMs)) return;

        const msRemaining = scheduledEndMs - Date.now();
        const remaining = syncActiveRemaining();
        if (msRemaining <= 0 || remaining <= 0) {
          hangUp('time_limit');
          return;
        }

        endTimerRef.current = setTimeout(() => hangUp('time_limit'), msRemaining);
        countdownRef.current = setInterval(() => {
          const nextRemaining = syncActiveRemaining();
          if (nextRemaining <= 0) {
            stopActiveCountdown();
          }
        }, 1000);
      };

      if (callPhaseRef.current === 'waiting') {
        setTimeRemaining(scheduledDurationSeconds);
      } else {
        setTimeRemaining(Math.max(0, Math.round((scheduledEndMs - Date.now()) / 1000)));
      }

      socket.on('connect', () => {
        if (cancelled) { socket.disconnect(); return; }
        socket.emit('join-room', {
          roomId: callId,
          userId,
          userRole,
          callType: 'video',
          scheduledStart,
          scheduledEnd,
        });
        setConnectionState(callPhaseRef.current === 'waiting' ? 'WAITING_FOR_START' : 'WAITING_FOR_PEER');
      });

      socket.on('room-joined', (data: {
        roomId: string;
        phase?: CallPhase;
        participants: Array<{ socketId: string; userId: string; userRole: 'incarcerated' | 'family' }>;
      }) => {
        const phase = data.phase ?? 'active';
        callPhaseRef.current = phase;

        if (phase === 'waiting') {
          stopActiveCountdown();
          setTimeRemaining(scheduledDurationSeconds);
          setConnectionState('WAITING_FOR_START');
          return;
        }

        startActiveCountdown();

        if (data.participants.length > 0 || peerRef.current) {
          setConnectionState('CONNECTING');
        } else {
          setConnectionState('WAITING_FOR_PEER');
        }
      });

      socket.on('waiting-user-joined', () => {
        if (cancelled) return;
        callPhaseRef.current = 'waiting';
        setConnectionState('WAITING_FOR_START');
      });

      socket.on('call-started', (data: {
        roomId: string;
        phase?: CallPhase;
        participants?: Array<{ socketId: string; userId: string; userRole: 'incarcerated' | 'family' }>;
      }) => {
        if (cancelled) return;
        const previousPhase = callPhaseRef.current;
        callPhaseRef.current = data.phase ?? 'active';
        activatedFromWaitingRef.current = previousPhase === 'waiting' && callPhaseRef.current === 'active';

        if (callPhaseRef.current === 'active') {
          startActiveCountdown();
        }

        const hasOtherParticipants = !!data.participants?.some((participant) => participant.userId !== userId);
        setConnectionState((prev) => {
          if (prev === 'CONNECTED' || prev === 'RECONNECTING') return prev;
          if (peerRef.current || hasOtherParticipants) return 'CONNECTING';
          return 'WAITING_FOR_PEER';
        });
      });

      socket.on('user-joined', async (data: { userRole?: 'incarcerated' | 'family' }) => {
        if (cancelled) return;
        if (callPhaseRef.current !== 'active') return;
        if (activatedFromWaitingRef.current) {
          activatedFromWaitingRef.current = false;
          if (data.userRole === 'family' && userRole === 'incarcerated') {
            return;
          }
        }
        // Guard: only create one peer connection
        if (peerRef.current) return;
        setConnectionState('CONNECTING');
        await createPeerAndOffer(socket, stream);
      });

      socket.on('offer', async (data: { sdp: RTCSessionDescriptionInit }) => {
        if (cancelled) return;
        if (callPhaseRef.current !== 'active') return;
        // Guard: only handle one offer
        if (peerRef.current) return;
        setConnectionState('CONNECTING');
        await handleOffer(socket, stream, data.sdp);
      });

      socket.on('answer', async (data: { sdp: RTCSessionDescriptionInit }) => {
        if (callPhaseRef.current !== 'active') return;
        if (!peerRef.current) return;
        await peerRef.current.setRemoteDescription(data.sdp);
        applyRemoteTracks(peerRef.current);
      });

      socket.on('ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
        if (callPhaseRef.current !== 'active') return;
        if (!peerRef.current) return;
        try {
          await peerRef.current.addIceCandidate(data.candidate);
        } catch (e) {
          // ICE candidate errors are non-fatal
        }
      });

      socket.on('call-not-active', (data: { roomId: string; phase?: CallPhase }) => {
        if (cancelled) return;
        if (data.phase === 'waiting') {
          callPhaseRef.current = 'waiting';
          stopActiveCountdown();
          setTimeRemaining(scheduledDurationSeconds);
          setConnectionState('WAITING_FOR_START');
        }
      });

      socket.on('peer-connected', () => setConnectionState('CONNECTED'));
      socket.on('call-ended', (data: { reason: string }) => hangUp(data.reason));
    }

    init();

    return () => {
      cancelled = true;
      // Full cleanup — critical for React StrictMode double-mount
      socketRef.current?.disconnect();
      socketRef.current = null;

      peerRef.current?.close();
      peerRef.current = null;

      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;

      if (endTimerRef.current) clearTimeout(endTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      stopStatsCollection();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── WebRTC helpers ──────────────────────────────────────────────────────

  /** Build a MediaStream from pc.getReceivers() — works even when event.streams[0] is empty */
  function applyRemoteTracks(pc: RTCPeerConnection) {
    const stream = new MediaStream();
    for (const receiver of pc.getReceivers()) {
      if (receiver.track) {
        stream.addTrack(receiver.track);
      }
    }
    if (stream.getTracks().length > 0) {
      setRemoteStream(stream);
      setConnectionState('CONNECTED');
    }
  }

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
    applyRemoteTracks(pc);
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

    pc.ontrack = () => applyRemoteTracks(pc);

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        applyRemoteTracks(pc);
        setConnectionState('CONNECTED');
        socket.emit('peer-connected', { roomId: callId });
        startStatsCollection(pc);
      } else if (['disconnected', 'failed'].includes(pc.iceConnectionState)) {
        setConnectionState('RECONNECTING');
        stopStatsCollection();
      }
    };

    return pc;
  }

  function startStatsCollection(pc: RTCPeerConnection) {
    if (statsIntervalRef.current) return;
    
    statsRef.current = { lastBytesAudio: 0, lastBytesVideo: 0, lastTimestamp: 0 };
    
    statsIntervalRef.current = setInterval(async () => {
      if (!pc || endedRef.current) return;
      
      try {
          const stats = await pc.getStats();
          let audioBytes = 0;
          let videoBytes = 0;
          let packetsLostAudio = 0;
          let packetsLostVideo = 0;
          let packetsReceivedAudio = 0;
          let packetsReceivedVideo = 0;
          let jitterAudio = 0;
          let jitterVideo = 0;
          let rtt = 0;
          let width = 0;
          let height = 0;
          let framesDecoded = 0;
          let timestamp = 0;

          stats.forEach((report) => {
            if (report.type === 'outbound-rtp' && report.kind === 'audio') {
              audioBytes += report.bytesSent || 0;
            } else if (report.type === 'outbound-rtp' && report.kind === 'video') {
              videoBytes += report.bytesSent || 0;
            } else if (report.type === 'remote-inbound-rtp' && report.kind === 'audio') {
              packetsLostAudio += report.packetsLost || 0;
              packetsReceivedAudio += report.packetsReceived || 0;
              jitterAudio = report.jitter || 0;
            } else if (report.type === 'remote-inbound-rtp' && report.kind === 'video') {
              packetsLostVideo += report.packetsLost || 0;
              packetsReceivedVideo += report.packetsReceived || 0;
              jitterVideo = report.jitter || 0;
            } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              rtt = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
            } else if (report.type === 'inbound-rtp' && report.kind === 'video') {
              width = report.frameWidth || 0;
              height = report.framesDecoded || 0;
              framesDecoded = report.framesDecoded || 0;
              timestamp = report.timestamp || 0;
            }
          });

          const now = Date.now();
          const timeDiff = statsRef.current.lastTimestamp ? (now - statsRef.current.lastTimestamp) / 1000 : 1;
          const audioBitrate = timeDiff > 0 ? ((audioBytes - statsRef.current.lastBytesAudio) * 8 / timeDiff / 1000) : 0;
          const videoBitrate = timeDiff > 0 ? ((videoBytes - statsRef.current.lastBytesVideo) * 8 / timeDiff / 1000) : 0;

          statsRef.current = { lastBytesAudio: audioBytes, lastBytesVideo: videoBytes, lastTimestamp: now };

          const audioLossRate = packetsReceivedAudio + packetsLostAudio > 0 
            ? (packetsLostAudio / (packetsReceivedAudio + packetsLostAudio)) * 100 
            : 0;
          const videoLossRate = packetsReceivedVideo + packetsLostVideo > 0 
            ? (packetsLostVideo / (packetsReceivedVideo + packetsLostVideo)) * 100 
            : 0;

          const frameRate = framesDecoded > 0 && timeDiff > 0 ? Math.round(framesDecoded / (now / 1000)) : 0;

          console.log(
            `[Quality] Call ${callId} | ` +
            `Bitrate: ${Math.round(audioBitrate)}kbps(A)/${Math.round(videoBitrate)}kbps(V) | ` +
            `Loss: ${audioLossRate.toFixed(1)}%(A)/${videoLossRate.toFixed(1)}%(V) | ` +
            `Jitter: ${(jitterAudio * 1000).toFixed(1)}ms(A)/${(jitterVideo * 1000).toFixed(1)}ms(V) | ` +
            `RTT: ${rtt.toFixed(0)}ms | ` +
            `Res: ${width}x${height} | FPS: ${frameRate}`
          );
        } catch (e) {
          // Stats collection errors are non-fatal
        }
    }, 2000);
  }

  function stopStatsCollection() {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
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

  /** Swap the video track on the peer connection (e.g. raw camera ↔ blur-processed). */
  const replaceVideoTrack = useCallback((newTrack: MediaStreamTrack) => {
    const pc = peerRef.current;
    if (pc) {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(newTrack);
    }
    // Update the local stream shown in PIP
    const newStream = new MediaStream();
    newStream.addTrack(newTrack);
    // Carry over audio tracks
    localStreamRef.current?.getAudioTracks().forEach((t) => newStream.addTrack(t));
    localStreamRef.current = newStream;
    setLocalStream(newStream);
  }, []);

  return {
    connectionState, localStream, remoteStream, isMuted, isCameraOff, timeRemaining,
    toggleMute, toggleCamera, hangUp, replaceVideoTrack,
    rawStream: rawStreamRef.current,
  };
}
