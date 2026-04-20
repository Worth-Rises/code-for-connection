import { useState, useRef, useCallback, useEffect } from 'react';
import { Button, Card } from '@openconnect/ui';
import { useAuth } from '../context/AuthContext';
import { TwilioCompliantRecorder } from '../utils/twilioCompliantRecorder';

const API_BASE = '/api';

/** Twilio Play supports WAV/MP3 etc.; we record WAV (mono 16-bit) to comply and stay under 2MB. */
const MAX_RECORDING_SEC = 15;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64 ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function RecordNamePage() {
  const { token, clearNeedsNameRecording } = useAuth();
  const [step, setStep] = useState<'idle' | 'recording' | 'uploading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [recordingSec, setRecordingSec] = useState(0);
  const recorderRef = useRef<TwilioCompliantRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    recorderRef.current?.cancel();
    stopTimer();
  }, [stopTimer]);

  const startRecording = useCallback(async () => {
    setError('');
    try {
      const recorder = new TwilioCompliantRecorder({ maxDurationMs: MAX_RECORDING_SEC * 1000 });
      recorderRef.current = recorder;
      await recorder.start(() => {
        // Auto-stop when max duration reached
        stopAndUpload();
      });
      setRecordingSec(0);
      timerRef.current = setInterval(() => {
        setRecordingSec((s) => Math.min(s + 1, MAX_RECORDING_SEC));
      }, 1000);
      setStep('recording');
    } catch (err) {
      setError('Microphone access is needed to record your name. Please allow access and try again.');
      setStep('error');
    }
  }, []);

  const stopAndUpload = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    stopTimer();
    recorderRef.current = null;
    const result = recorder.stop();
    setStep('uploading');
    setError('');

    try {
      const base64 = await blobToBase64(result.blob);
      const response = await fetch(`${API_BASE}/voice/users/name-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          audioBase64: base64,
          contentType: result.contentType, // audio/wav — Twilio Play supported
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error?.message || 'Failed to save recording. Please try again.');
        setStep('error');
        return;
      }

      setStep('done');
    } catch {
      setError('Network error. Please try again.');
      setStep('error');
    }
  }, [token, stopTimer]);

  if (step === 'done') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-blue-900 p-8">
        <Card padding="lg" className="max-w-md w-full text-center">
          <span className="text-5xl block mb-4">✓</span>
          <h2 className="text-xl font-bold text-gray-900 mb-2">You're all set</h2>
          <p className="text-gray-600 mb-6">
            Your name recording has been saved. You can now use voice and video calls.
          </p>
          <Button fullWidth size="lg" onClick={clearNeedsNameRecording}>
            Continue
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-900 p-8">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Open Connect</h1>
        <p className="text-blue-200 text-lg mb-8">
          Record your name so it can be played when you call your contacts.
        </p>

        <Card padding="lg">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {step === 'idle' && (
            <>
              <p className="text-gray-600 mb-6">
                Tap the button below, then say your full name clearly. Recording stops automatically
                after {MAX_RECORDING_SEC} seconds. You can re-record if needed.
              </p>
              <Button fullWidth size="lg" onClick={startRecording}>
                Record your name
              </Button>
            </>
          )}

          {step === 'recording' && (
            <>
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-gray-700 font-medium">
                  Recording… Say your name clearly ({recordingSec}s / {MAX_RECORDING_SEC}s max)
                </span>
              </div>
              <Button fullWidth size="lg" onClick={stopAndUpload}>
                Stop and save
              </Button>
            </>
          )}

          {step === 'uploading' && (
            <div className="py-8">
              <div className="animate-pulse text-gray-500">Saving your recording…</div>
            </div>
          )}

          {step === 'error' && (
            <>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button
                fullWidth
                size="lg"
                onClick={() => {
                  setStep('idle');
                  setError('');
                }}
              >
                Try again
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
