/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';

// Stub RTCPeerConnection — jsdom doesn't implement it
class RTCPeerConnectionStub {
  localDescription: RTCSessionDescription | null = null;
  remoteDescription: RTCSessionDescription | null = null;
  iceConnectionState: RTCIceConnectionState = 'new';
  signalingState: RTCSignalingState = 'stable';
  onicecandidate: ((e: RTCPeerConnectionIceEvent) => void) | null = null;
  ontrack: ((e: RTCTrackEvent) => void) | null = null;
  onnegotiationneeded: (() => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;

  getSenders = vi.fn(() => []);
  addTrack = vi.fn();
  createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' } as RTCSessionDescriptionInit);
  createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' } as RTCSessionDescriptionInit);
  setLocalDescription = vi.fn().mockResolvedValue(undefined);
  setRemoteDescription = vi.fn().mockResolvedValue(undefined);
  addIceCandidate = vi.fn().mockResolvedValue(undefined);
  close = vi.fn();
}

vi.stubGlobal('RTCPeerConnection', RTCPeerConnectionStub);

// Stub MediaDevices.getUserMedia
const mockAudioTrack = { enabled: true, stop: vi.fn(), kind: 'audio' } as unknown as MediaStreamTrack;
const mockVideoTrack = { enabled: true, stop: vi.fn(), kind: 'video' } as unknown as MediaStreamTrack;

const mockStream = {
  getTracks: () => [mockAudioTrack, mockVideoTrack],
  getAudioTracks: () => [mockAudioTrack],
  getVideoTracks: () => [mockVideoTrack],
} as unknown as MediaStream;

Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue(mockStream),
  },
});
