/**
 * Records microphone audio as WAV that complies with Twilio's Play verb requirements.
 * @see https://www.twilio.com/docs/voice/twiml/play (supported: audio/wav, audio/mpeg, etc. — not webm)
 * @see https://help.twilio.com/articles/223180588-Best-Practices-for-Audio-Recordings
 * Twilio recommends lower bit rates; WAV is lossless and they transcode for telephony (8kHz uLaw).
 * We record mono 16-bit PCM at the context sample rate (typically 44.1kHz) and cap duration to stay under 2MB.
 */

const DEFAULT_MAX_DURATION_MS = 15_000; // 15 seconds → ~1.3MB at 44.1kHz mono 16-bit (under 2MB)

function floatTo16BitPCM(float32Array: Float32Array): Int16Array {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

function buildWavBlob(pcm16: Int16Array, sampleRate: number): Blob {
  const numChannels = 1;
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = pcm16.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;

  const write = (bytes: string) => {
    for (let i = 0; i < bytes.length; i++) view.setUint8(offset++, bytes.charCodeAt(i));
  };
  const writeU32 = (v: number) => {
    view.setUint32(offset, v, true);
    offset += 4;
  };
  const writeU16 = (v: number) => {
    view.setUint16(offset, v, true);
    offset += 2;
  };

  write('RIFF');
  writeU32(36 + dataSize);
  write('WAVE');
  write('fmt ');
  writeU32(16);
  writeU16(1); // PCM
  writeU16(numChannels);
  writeU32(sampleRate);
  writeU32(byteRate);
  writeU16(blockAlign);
  writeU16(16);
  write('data');
  writeU32(dataSize);
  new Uint8Array(buffer).set(new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength), 44);

  return new Blob([buffer], { type: 'audio/wav' });
}

export interface TwilioCompliantRecorderOptions {
  /** Max recording duration in ms (default 15s to stay under 2MB at 44.1kHz mono). */
  maxDurationMs?: number;
}

export interface TwilioCompliantRecorderResult {
  blob: Blob;
  contentType: 'audio/wav';
  durationMs: number;
  sampleRate: number;
}

export class TwilioCompliantRecorder {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private chunks: Int16Array[] = [];
  private startTime = 0;
  private maxDurationMs: number;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private onMaxDurationReached: (() => void) | null = null;

  constructor(options: TwilioCompliantRecorderOptions = {}) {
    this.maxDurationMs = options.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;
  }

  /**
   * Start recording. Returns the context sample rate (e.g. 44100).
   */
  async start(onMaxDuration?: () => void): Promise<number> {
    this.chunks = [];
    this.onMaxDurationReached = onMaxDuration ?? null;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.context = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const sampleRate = this.context.sampleRate;

    const bufferSize = 4096;
    this.processor = this.context.createScriptProcessor(bufferSize, 1, 1);
    this.source = this.context.createMediaStreamSource(this.stream);

    this.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      this.chunks.push(floatTo16BitPCM(input));
    };

    this.source.connect(this.processor);
    this.processor.connect(this.context.destination);

    this.startTime = Date.now();
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      this.onMaxDurationReached?.();
    }, this.maxDurationMs);

    return sampleRate;
  }

  /**
   * Stop recording and return a WAV blob suitable for Twilio Play (audio/wav).
   */
  stop(): TwilioCompliantRecorderResult {
    if (this.timeoutId != null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }

    const sampleRate = this.context?.sampleRate ?? 44100;
    const totalLength = this.chunks.reduce((acc, c) => acc + c.length, 0);
    const pcm = new Int16Array(totalLength);
    let offset = 0;
    for (const c of this.chunks) {
      pcm.set(c, offset);
      offset += c.length;
    }
    this.chunks = [];

    if (this.context) {
      this.context.close().catch(() => {});
      this.context = null;
    }

    const blob = buildWavBlob(pcm, sampleRate);
    const durationMs = this.startTime ? Math.min(Date.now() - this.startTime, this.maxDurationMs) : 0;
    return { blob, contentType: 'audio/wav', durationMs, sampleRate };
  }

  /** Call if user cancels without stopping (e.g. navigates away). */
  cancel(): void {
    if (this.timeoutId != null) clearTimeout(this.timeoutId);
    this.timeoutId = null;
    if (this.processor) this.processor.disconnect();
    if (this.source) this.source.disconnect();
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    if (this.context) this.context.close().catch(() => {});
    this.processor = null;
    this.source = null;
    this.stream = null;
    this.context = null;
    this.chunks = [];
  }
}
