import React from 'react';
import { Button } from '@openconnect/ui';

interface PaginationProps {
  page: number;
  totalPages: number;
  onNext: () => void;
  onPrev: () => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onNext, onPrev }) => {
  return (
    <div className="flex items-center justify-between">
      <Button variant="secondary" size="sm" onClick={onPrev} disabled={page <= 1}>
        Previous
      </Button>
      <span className="text-sm text-gray-600">
        Page {page} of {totalPages}
      </span>
      <Button variant="secondary" size="sm" onClick={onNext} disabled={page >= totalPages}>
        Next
      </Button>
    </div>
  );
};
