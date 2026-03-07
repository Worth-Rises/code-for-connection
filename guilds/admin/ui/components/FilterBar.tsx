import React from 'react';

interface FilterBarProps {
  children: React.ReactNode;
}

export const FilterBar: React.FC<FilterBarProps> = ({ children }) => {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {children}
    </div>
  );
};
