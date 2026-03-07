import { useState, useEffect, useCallback, useRef } from 'react';

export function useCallTimer(durationSeconds: number, warningThresholdSeconds = 60) {
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const start = useCallback(() => setRunning(true), []);
  const stop = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => {
    setRunning(false);
    setTimeRemaining(durationSeconds);
  }, [durationSeconds]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    timeRemaining,
    isWarning: timeRemaining <= warningThresholdSeconds && timeRemaining > 0,
    isExpired: timeRemaining <= 0,
    formattedTime,
    start,
    stop,
    reset,
  };
}
