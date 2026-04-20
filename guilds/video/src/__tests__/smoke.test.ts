import { describe, it, expect } from 'vitest';

describe('Test infrastructure smoke test', () => {
  it('globals are available', () => {
    expect(true).toBe(true);
  });

  it('RTCPeerConnection stub is globally available', () => {
    const pc = new RTCPeerConnection();
    expect(pc).toBeDefined();
  });

  it('navigator.mediaDevices.getUserMedia is stubbed', () => {
    expect(navigator.mediaDevices.getUserMedia).toBeDefined();
  });
});
