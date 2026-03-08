import React, { useState } from 'react';

interface ApprovalRequestProps {
  name: string;
  requestedTime: string;
  onApprove: () => void;
  onDeny: () => void;
  startTime: string;
  endTime: string;
  incarceratedPerson: string;
  isAttorney?: boolean;
  isLegal?: boolean;
  isLoading?: boolean;
}

export const ApprovalRequest: React.FC<ApprovalRequestProps> = ({
  name,
  requestedTime,
  onApprove,
  onDeny,
  startTime,
  endTime,
  incarceratedPerson,
  isAttorney = false,
  isLegal = false,
  isLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const calculateDuration = () => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    return `${minutes} min`;
  };

  return (
    <div className="border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        {/* Left: Name, Expand Button, and Subtext */}
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center w-6 h-6 text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
            aria-label="Toggle details"
          >
            {isExpanded ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
          </button>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
            <p className="text-sm text-gray-600 mt-1">Requested: {new Date(requestedTime).toLocaleString()}</p>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onApprove}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Approve
          </button>
          <button
            onClick={onDeny}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Deny
          </button>
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
              <p className="text-sm font-medium text-gray-900 mt-1">{name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">Scheduled Start</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{new Date(startTime).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">Scheduled End</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{new Date(endTime).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">Duration</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{calculateDuration()}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase">Call Type</p>
              <div className="mt-1 flex gap-2">
                {isAttorney && (
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                    Attorney Contact
                  </span>
                )}
                {isLegal && (
                  <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                    Legal Call
                  </span>
                )}
                {!isAttorney && !isLegal && (
                  <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
                    Standard Call
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
