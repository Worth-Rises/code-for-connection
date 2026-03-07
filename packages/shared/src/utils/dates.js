"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWithinCallingHours = isWithinCallingHours;
exports.formatDuration = formatDuration;
exports.getStartOfDay = getStartOfDay;
exports.getEndOfDay = getEndOfDay;
exports.parseDateRange = parseDateRange;
exports.getDayOfWeek = getDayOfWeek;
exports.formatTime = formatTime;
function isWithinCallingHours(startTime, endTime, currentTime = new Date()) {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const currentHour = currentTime.getHours();
    const currentMin = currentTime.getMinutes();
    const currentMinutes = currentHour * 60 + currentMin;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
function getStartOfDay(date = new Date()) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
}
function getEndOfDay(date = new Date()) {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
}
function parseDateRange(startDate, endDate) {
    return {
        start: startDate ? new Date(startDate) : undefined,
        end: endDate ? new Date(endDate) : undefined,
    };
}
function getDayOfWeek(date = new Date()) {
    return date.getDay();
}
function formatTime(date) {
    return date.toTimeString().substring(0, 5);
}
//# sourceMappingURL=dates.js.map