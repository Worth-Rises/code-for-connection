import React from 'react';

interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface TabNavProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
}

export const TabNav: React.FC<TabNavProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex gap-2 border-b border-gray-200">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`px-4 py-2 text-sm font-medium ${
              isActive
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
