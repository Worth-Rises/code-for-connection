import React from 'react';

const DEFAULT_COLOR_MAP: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  pending_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  active: 'bg-green-100 text-green-800',
  connected: 'bg-green-100 text-green-800',
  passed: 'bg-green-100 text-green-800',
  denied: 'bg-red-100 text-red-800',
  blocked: 'bg-red-100 text-red-800',
  terminated: 'bg-red-100 text-red-800',
  terminated_by_admin: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800',
  removed: 'bg-gray-100 text-gray-800',
  completed: 'bg-gray-100 text-gray-800',
  released: 'bg-gray-100 text-gray-800',
  expired: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  ringing: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-blue-100 text-blue-800',
};

interface StatusBadgeProps {
  status: string;
  colorMap?: Record<string, string>;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  colorMap,
}) => {
  const mergedMap = colorMap
    ? { ...DEFAULT_COLOR_MAP, ...colorMap }
    : DEFAULT_COLOR_MAP;

  const colorClasses = mergedMap[status] || 'bg-gray-100 text-gray-800';
  const displayText = status.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colorClasses}`}
    >
      {displayText}
    </span>
  );
};
