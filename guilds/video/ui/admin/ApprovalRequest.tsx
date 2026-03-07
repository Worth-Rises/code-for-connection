import React, { useState } from 'react';

interface ApprovalRequestProps {
  name: string;
  onApprove: () => void;
  onDeny: () => void;
  onAction?: () => void;
  actionLabel?: string;
  details?: React.ReactNode;
  isLoading?: boolean;
}

export const ApprovalRequest: React.FC<ApprovalRequestProps> = ({
  name,
  onApprove,
  onDeny,
  onAction,
  actionLabel = 'More',
  details,
  isLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        {/* Left: Name and Expand Button */}
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center h-6 text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Toggle details"
          >
            {isExpanded ? '▲' : '▼'}
            <h3 className="text-lg font-semibold ml-3">{name}</h3>
          </button>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
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
          {onAction && (
            <button
              onClick={onAction}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Details Section */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          {details ? (
            details
          ) : (
            <p className="text-gray-500 text-sm">No details available</p>
          )}
        </div>
      )}
    </div>
  );
};
