import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  label: string;
  to: string;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    heading: 'Communication',
    items: [
      { label: 'Voice Calls', to: '/admin/voice' },
      { label: 'Video Calls', to: '/admin/video' },
      { label: 'Messages', to: '/admin/messaging' },
    ],
  },
  {
    heading: 'People',
    items: [
      { label: 'Residents', to: '/admin/residents' },
      { label: 'Visitors', to: '/admin/visitors' },
      { label: 'Contacts', to: '/admin/contacts' },
    ],
  },
  {
    heading: 'Facility',
    items: [
      { label: 'Housing', to: '/admin/housing' },
      { label: 'Blocked Numbers', to: '/admin/blocked-numbers' },
    ],
  },
  {
    heading: 'Monitoring',
    items: [
      { label: 'Search', to: '/admin/search' },
      { label: 'Keyword Alerts', to: '/admin/keyword-alerts' },
    ],
  },
  {
    heading: 'Reports',
    items: [
      { label: 'Reports', to: '/admin/reports' },
      { label: 'Audit Log', to: '/admin/audit-log' },
    ],
  },
  {
    heading: 'Settings',
    items: [
      { label: 'Facility Config', to: '/admin/facility' },
      { label: 'Permissions', to: '/admin/settings/permissions' },
      { label: 'System Status', to: '/admin/settings/system' },
      { label: 'Admin Users', to: '/admin/users' },
    ],
  },
];

export function AdminSidebar() {
  const location = useLocation();

  function isActive(to: string): boolean {
    if (to === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/';
    }
    return location.pathname.startsWith(to);
  }

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="px-4 py-5">
        <h1 className="text-lg font-bold text-gray-900">Open Connect Admin</h1>
      </div>

      <div className="px-2 pb-4">
        <Link
          to="/admin"
          className={`block px-4 py-2 text-sm rounded-lg mx-2 ${
            isActive('/admin') && !sections.some((s) => s.items.some((i) => isActive(i.to)))
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Dashboard
        </Link>
      </div>

      {sections.map((section) => (
        <div key={section.heading} className="pb-2">
          <div className="border-t border-gray-100 mx-4 mb-2" />
          <h2 className="uppercase text-xs text-gray-400 font-semibold tracking-wider px-4 py-2">
            {section.heading}
          </h2>
          {section.items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`block px-4 py-2 text-sm rounded-lg mx-2 ${
                isActive(item.to)
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
