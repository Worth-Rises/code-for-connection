/// <reference types="vitest/globals" />
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock socket.io-client ───────────────────────────────────────────────────
// We create a full bidirectional EventEmitter mock so the hook can
// emit and receive socket events without a real server.
type Handler = (...args: unknown[]) => void;

function createMockSocket() {
  const listeners: Record<string, Handler[]> = {};
  const emitted: Array<[string, ...unknown[]]> = [];

  const socket = {
    connected: false,
    on: vi.fn((event: string, handler: Handler) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
      return socket;
    }),
    off: vi.fn((event: string, handler?: Handler) => {
      if (!handler) { listeners[event] = []; return socket; }
      listeners[event] = (listeners[event] || []).filter((h) => h !== handler);
      return socket;
    }),
    emit: vi.fn((event: string, ...args: unknown[]) => {
      emitted.push([event, ...args]);
      return socket;
    }),
    disconnect: vi.fn(),
    // Test helper: trigger events incoming FROM the server
    _trigger(event: string, ...args: unknown[]) {
      (listeners[event] || []).forEach((h) => h(...args));
    },
    _emitted: emitted,
  };
  return socket;
}

type MockSocket = ReturnType<typeof createMockSocket>;
let mockSocket: MockSocket;

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => {
    mockSocket = createMockSocket();
    return mockSocket;
  }),
}));

// ─── Import hook AFTER mocks ──────────────────────────────────────────────────
import { useVideoCall } from '../useVideoCall.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function createHookProps(overrides: Partial<Parameters<typeof useVideoCall>[0]> = {}) {
  return {
    callId: 'call-test-1',
    userId: 'user-1',
    userRole: 'incarcerated' as const,
    scheduledEnd: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30min from now
    signalingUrl: 'http://localhost:3001',
    onCallEnded: vi.fn(),
    ...overrides,
  };
}

// ─── State machine tests ─────────────────────────────────────────────────────
describe('useVideoCall — state machine', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it('starts in IDLE state', () => {
    const { result } = renderHook(() => useVideoCall(createHookProps()));
    expect(result.current.connectionState).toBe('IDLE');
  });

  it('transitions to JOINING after socket connects and emits join-room', async () => {
    const { result } = renderHook(() => useVideoCall(createHookProps()));
    // getUserMedia returns a resolved promise, but connectSocket() is called
    // after it resolves. Flush the microtask queue so connectSocket runs and
    // registers socket.on('connect') before we fire the event.
    await act(async () => {
      vi.runAllTicks();
      await Promise.resolve();
    });
    await act(async () => { mockSocket._trigger('connect'); });
    expect(result.current.connectionState).toBe('WAITING_FOR_PEER');
    const joinEmit = mockSocket._emitted.find(([e]) => e === 'join-room');
    expect(joinEmit).toBeDefined();
    expect(joinEmit![1]).toMatchObject({
      roomId: 'call-test-1',
      userId: 'user-1',
      userRole: 'incarcerated',
      callType: 'video',
    });
  });

  it('enters waiting-room state when room-joined phase is waiting', async () => {
    const { result } = renderHook(() => useVideoCall(createHookProps()));
    await act(async () => {
      vi.runAllTicks();
      await Promise.resolve();
    });
    await act(async () => { mockSocket._trigger('connect'); });
    await act(async () => {
      mockSocket._trigger('room-joined', { roomId: 'call-test-1', phase: 'waiting', participants: [] });
    });

    expect(result.current.connectionState).toBe('WAITING_FOR_START');
  });

  it('does not negotiate while in waiting room before call-started', async () => {
    const { result } = renderHook(() => useVideoCall(createHookProps()));
    await act(async () => {
      vi.runAllTicks();
      await Promise.resolve();
    });
    await act(async () => { mockSocket._trigger('connect'); });
    await act(async () => {
      mockSocket._trigger('room-joined', { roomId: 'call-test-1', phase: 'waiting', participants: [] });
    });
    await act(async () => {
      mockSocket._trigger('user-joined', { socketId: 'peer-socket', userId: 'user-2', userRole: 'family' });
    });

    expect(result.current.connectionState).toBe('WAITING_FOR_START');
    const offerEmit = mockSocket._emitted.find(([e]) => e === 'offer');
    expect(offerEmit).toBeUndefined();
  });

  it('transitions from waiting room to active negotiation after call-started', async () => {
    const { result } = renderHook(() => useVideoCall(createHookProps()));
    await act(async () => {
      vi.runAllTicks();
      await Promise.resolve();
    });
    await act(async () => { mockSocket._trigger('connect'); });
    await act(async () => {
      mockSocket._trigger('room-joined', { roomId: 'call-test-1', phase: 'waiting', participants: [] });
    });

    expect(result.current.connectionState).toBe('WAITING_FOR_START');

    await act(async () => {
      mockSocket._trigger('call-started', {
        roomId: 'call-test-1',
        phase: 'active',
        participants: [{ socketId: 'peer-socket', userId: 'user-2', userRole: 'family' }],
      });
    });
    expect(result.current.connectionState).toBe('CONNECTING');

    await act(async () => {
      mockSocket._trigger('user-joined', { socketId: 'peer-socket', userId: 'user-2', userRole: 'family' });
    });

    const offerEmit = mockSocket._emitted.find(([e]) => e === 'offer');
    expect(offerEmit).toBeDefined();
  });

  it('transitions to CONNECTING when user-joined received and offer is sent', async () => {
    const { result } = renderHook(() => useVideoCall(createHookProps()));
    await act(async () => { mockSocket._trigger('connect'); });
    await act(async () => {
      mockSocket._trigger('room-joined', { roomId: 'call-test-1', participants: [] });
    });
    await act(async () => {
      mockSocket._trigger('user-joined', { socketId: 'peer-socket', userId: 'user-2', userRole: 'family' });
    });
    expect(result.current.connectionState).toBe('CONNECTING');
    const offerEmit = mockSocket._emitted.find(([e]) => e === 'offer');
    expect(offerEmit).toBeDefined();
  });

  it('transitions to ENDED when call-ended event is received', async () => {
    const onCallEnded = vi.fn();
    const { result } = renderHook(() => useVideoCall(createHookProps({ onCallEnded })));
    await act(async () => { mockSocket._trigger('connect'); });
    await act(async () => {
      mockSocket._trigger('call-ended', { reason: 'time_limit' });
    });
    expect(result.current.connectionState).toBe('ENDED');
    expect(onCallEnded).toHaveBeenCalledWith('time_limit');
  });

  it('transitions to ENDED when hangUp() is called manually', async () => {
    const { result } = renderHook(() => useVideoCall(createHookProps()));
    await act(async () => { mockSocket._trigger('connect'); });
    await act(async () => { result.current.hangUp('user'); });
    expect(result.current.connectionState).toBe('ENDED');
    const endedEmit = mockSocket._emitted.find(([e]) => e === 'call-ended');
    expect(endedEmit).toBeDefined();
  });

  it('disconnects socket on unmount', async () => {
    const { unmount } = renderHook(() => useVideoCall(createHookProps()));
    // Flush getUserMedia microtask so socketRef.current is populated
    await act(async () => {
      vi.runAllTicks();
      await Promise.resolve();
    });
    unmount();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});

// ─── Timer enforcement tests ──────────────────────────────────────────────────
describe('useVideoCall — timer enforcement', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it('calls hangUp with time_limit when scheduledEnd is reached', async () => {
    const scheduledEnd = new Date(Date.now() + 5000).toISOString(); // 5s
    const onCallEnded = vi.fn();
    const { result } = renderHook(() => useVideoCall(createHookProps({ scheduledEnd, onCallEnded })));
    await act(async () => { mockSocket._trigger('connect'); });

    expect(result.current.connectionState).not.toBe('ENDED');
    await act(async () => { vi.advanceTimersByTime(5001); });
    expect(result.current.connectionState).toBe('ENDED');
    expect(onCallEnded).toHaveBeenCalledWith('time_limit');
  });

  it('emits 1-minute warning when timeRemaining reaches 60s', async () => {
    const scheduledEnd = new Date(Date.now() + 90_000).toISOString(); // 90s
    const onTimeWarning = vi.fn();
    const { result } = renderHook(() => useVideoCall(createHookProps({ scheduledEnd, onTimeWarning })));
    await act(async () => { mockSocket._trigger('connect'); });
    expect(result.current.timeRemaining).toBeGreaterThan(60);

    await act(async () => { vi.advanceTimersByTime(30_001); }); // advance 30s → ~60s left
    expect(onTimeWarning).toHaveBeenCalled();
    expect(result.current.timeRemaining).toBeLessThanOrEqual(61);
  });

  it('clears timers on unmount — no timer fires after unmount', async () => {
    const onCallEnded = vi.fn();
    const scheduledEnd = new Date(Date.now() + 1000).toISOString();
    const { unmount } = renderHook(() => useVideoCall(createHookProps({ scheduledEnd, onCallEnded })));
    await act(async () => { mockSocket._trigger('connect'); });
    unmount();
    await act(async () => { vi.advanceTimersByTime(2000); });
    // onCallEnded should NOT be called after unmount
    expect(onCallEnded).not.toHaveBeenCalled();
  });
});

// ─── Media controls tests ─────────────────────────────────────────────────────
describe('useVideoCall — media controls', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it('starts with isMuted=false and isCameraOff=false', () => {
    const { result } = renderHook(() => useVideoCall(createHookProps()));
    expect(result.current.isMuted).toBe(false);
    expect(result.current.isCameraOff).toBe(false);
  });

  it('toggleMute sets isMuted=true and emits mute-toggle', async () => {
    const { result } = renderHook(() => useVideoCall(createHookProps()));
    await act(async () => { mockSocket._trigger('connect'); });
    await act(async () => { result.current.toggleMute(); });
    expect(result.current.isMuted).toBe(true);
    const muteEmit = mockSocket._emitted.find(([e]) => e === 'mute-toggle');
    expect(muteEmit).toBeDefined();
    expect(muteEmit![1]).toMatchObject({ type: 'audio', muted: true });
  });

  it('toggleCamera sets isCameraOff=true and emits mute-toggle video', async () => {
    const { result } = renderHook(() => useVideoCall(createHookProps()));
    await act(async () => { mockSocket._trigger('connect'); });
    await act(async () => { result.current.toggleCamera(); });
    expect(result.current.isCameraOff).toBe(true);
    const camEmit = mockSocket._emitted.find(([e]) => e === 'mute-toggle');
    expect(camEmit).toBeDefined();
    expect(camEmit![1]).toMatchObject({ type: 'video', muted: true });
  });
});

// ─── Quality metrics tests ─────────────────────────────────────────────────────
describe('useVideoCall — quality metrics', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it('does not collect stats before peer connects', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { result } = renderHook(() => useVideoCall(createHookProps()));
    await act(async () => { mockSocket._trigger('connect'); });
    await act(async () => { vi.advanceTimersByTime(5000); });
    
    const qualityLogs = consoleSpy.mock.calls.filter((call) => 
      call[0]?.toString().includes('[Quality]')
    );
    expect(qualityLogs).toHaveLength(0);
    consoleSpy.mockRestore();
  });

  it('stops stats collection when hangUp is called', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { result } = renderHook(() => useVideoCall(createHookProps()));
    await act(async () => { mockSocket._trigger('connect'); });
    await act(async () => { mockSocket._trigger('user-joined', { socketId: 'peer', userId: 'user-2', userRole: 'family' }); });
    
    await act(async () => { vi.runAllTimers(); });
    await act(async () => { vi.runAllTicks(); });
    
    const logsBeforeHangup = consoleSpy.mock.calls.filter((call) => 
      call[0]?.toString().includes('[Quality]')
    ).length;
    
    await act(async () => { result.current.hangUp('user'); });
    await act(async () => { vi.advanceTimersByTime(5000); });
    
    const logsAfterHangup = consoleSpy.mock.calls.filter((call) => 
      call[0]?.toString().includes('[Quality]')
    ).length;
    
    expect(logsAfterHangup).toBe(logsBeforeHangup);
    consoleSpy.mockRestore();
  });

  it('stops stats collection when call-ended event received', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { result } = renderHook(() => useVideoCall(createHookProps()));
    await act(async () => { mockSocket._trigger('connect'); });
    await act(async () => { mockSocket._trigger('user-joined', { socketId: 'peer', userId: 'user-2', userRole: 'family' }); });
    
    await act(async () => { vi.runAllTimers(); });
    await act(async () => { vi.runAllTicks(); });
    
    const logsBeforeEnd = consoleSpy.mock.calls.filter((call) => 
      call[0]?.toString().includes('[Quality]')
    ).length;
    
    await act(async () => { mockSocket._trigger('call-ended', { reason: 'user' }); });
    await act(async () => { vi.advanceTimersByTime(5000); });
    
    const logsAfterEnd = consoleSpy.mock.calls.filter((call) => 
      call[0]?.toString().includes('[Quality]')
    ).length;
    
    expect(logsAfterEnd).toBe(logsBeforeEnd);
    consoleSpy.mockRestore();
  });

  it('clears stats interval on unmount', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { result, unmount } = renderHook(() => useVideoCall(createHookProps()));
    await act(async () => { mockSocket._trigger('connect'); });
    await act(async () => { mockSocket._trigger('user-joined', { socketId: 'peer', userId: 'user-2', userRole: 'family' }); });
    
    await act(async () => { vi.runAllTimers(); });
    await act(async () => { vi.runAllTicks(); });
    
    mockSocket._trigger('peer-connected');
    await act(async () => { vi.advanceTimersByTime(3000); });
    
    const logsBeforeUnmount = consoleSpy.mock.calls.filter((call) => 
      call[0]?.toString().includes('[Quality]')
    ).length;
    
    unmount();
    await act(async () => { vi.advanceTimersByTime(5000); });
    
    const logsAfterUnmount = consoleSpy.mock.calls.filter((call) => 
      call[0]?.toString().includes('[Quality]')
    ).length;
    
    expect(logsAfterUnmount).toBe(logsBeforeUnmount);
    consoleSpy.mockRestore();
  });
});
