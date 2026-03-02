export function isWithinCallingHours(
  startTime: string,
  endTime: string,
  currentTime: Date = new Date()
): boolean {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const currentHour = currentTime.getHours();
  const currentMin = currentTime.getMinutes();
  
  const currentMinutes = currentHour * 60 + currentMin;
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function getStartOfDay(date: Date = new Date()): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getEndOfDay(date: Date = new Date()): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function parseDateRange(startDate?: string, endDate?: string): {
  start?: Date;
  end?: Date;
} {
  return {
    start: startDate ? new Date(startDate) : undefined,
    end: endDate ? new Date(endDate) : undefined,
  };
}

export function getDayOfWeek(date: Date = new Date()): number {
  return date.getDay();
}

export function formatTime(date: Date): string {
  return date.toTimeString().substring(0, 5);
}
