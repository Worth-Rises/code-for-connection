import React, { useState } from 'react';

interface CallCardProps {
  incarceratedPerson: string;
  familyMember: string;
  startTime: string;
  endTime: string;
  duration?: number;
  status: string;
  actualStart?: string;
  actualEnd?: string;
}

export const CallCard: React.FC<CallCardProps> = ({
  incarceratedPerson,
  familyMember,
  startTime,
  endTime,
  duration,
  status,
  actualStart,
  actualEnd,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'terminated_by_admin':
        return 'bg-red-100 text-red-800';
      case 'missed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        {/* Left: Names, Expand Button, and Subtext */}
        <div className="flex items-center gap-4 flex-1">
          <button
            className="flex items-center justify-center w-6 h-6 text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
            aria-label="Toggle details"
          >
            <svg className={isExpanded ? "w-5 h-5 transition" : "w-5 h-5 transition rotate-180"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
          </button>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {incarceratedPerson} &amp; {familyMember}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Scheduled: {new Date(startTime).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Right: Status Badge */}
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
          {getStatusLabel(status)}
        </div>
      </div>

      {/* Expandable Details Section */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">Incarcerated Person</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{incarceratedPerson}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">Family Member</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{familyMember}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">Scheduled Start</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{new Date(startTime).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">Scheduled End</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{new Date(endTime).toLocaleString()}</p>
            </div>
            {actualStart && (
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Actual Start</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{new Date(actualStart).toLocaleString()}</p>
              </div>
            )}
            {actualEnd && (
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Actual End</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{new Date(actualEnd).toLocaleString()}</p>
              </div>
            )}
            {duration !== undefined && (
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Duration</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{formatDuration(duration)}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">Status</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{getStatusLabel(status)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
