import React, { useState, useRef, useCallback } from 'react';
import { Button, Card } from '@openconnect/ui';
import { useAuth } from '../context/AuthContext';

const API_BASE = '/api';

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(100);
      setStep('recording');
    } catch (err) {
      setError('Microphone access is needed to record your name. Please allow access and try again.');
      setStep('error');
    }
  }, []);

  const stopAndUpload = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || step !== 'recording') return;

    recorder.stop();
    mediaRecorderRef.current = null;
    setStep('uploading');
    setError('');

    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    chunksRef.current = [];

    try {
      const base64 = await blobToBase64(blob);
      const response = await fetch(`${API_BASE}/voice/users/name-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ audioBase64: base64, contentType: 'audio/webm' }),
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
  }, [token, clearNeedsNameRecording, step]);

  if (step === 'done') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-blue-900 p-8">
        <Card padding="lg" className="max-w-md w-full text-center">
          <span className="text-5xl block mb-4">✓</span>
          <h2 className="text-xl font-bold text-gray-900 mb-2">You’re all set</h2>
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
                Tap the button below, then say your full name clearly. You can re-record if needed.
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
                <span className="text-gray-700 font-medium">Recording… Say your name clearly</span>
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
              <Button fullWidth size="lg" onClick={() => { setStep('idle'); setError(''); }}>
                Try again
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
