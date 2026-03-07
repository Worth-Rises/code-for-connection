import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navSections = [
    {
      title: 'Dashboard',
      items: [
        { path: '/admin', label: 'Overview', icon: '📊', end: true },
      ],
    },
    {
      title: 'Communication',
      items: [
        { path: '/admin/voice', label: 'Voice Calls', icon: '📞' },
        { path: '/admin/video', label: 'Video Calls', icon: '📹' },
        { path: '/admin/messaging', label: 'Messages', icon: '💬' },
      ],
    },
    {
      title: 'People',
      items: [
        { path: '/admin/residents', label: 'Residents', icon: '👤' },
        { path: '/admin/visitors', label: 'Visitors', icon: '🧑' },
        { path: '/admin/contacts', label: 'Contacts', icon: '👥' },
      ],
    },
    {
      title: 'Facility',
      items: [
        { path: '/admin/housing', label: 'Housing', icon: '🏠' },
        { path: '/admin/blocked-numbers', label: 'Blocked Numbers', icon: '🚫' },
      ],
    },
    {
      title: 'Monitoring',
      items: [
        { path: '/admin/search', label: 'Search', icon: '🔍' },
        { path: '/admin/keyword-alerts', label: 'Keyword Alerts', icon: '⚠️' },
      ],
    },
    {
      title: 'Reports',
      items: [
        { path: '/admin/reports', label: 'Reports', icon: '📈' },
        { path: '/admin/audit-log', label: 'Audit Log', icon: '📋' },
      ],
    },
    {
      title: 'Settings',
      items: [
        { path: '/admin/facility', label: 'Facility Config', icon: '🏢' },
        { path: '/admin/settings/permissions', label: 'Permissions', icon: '🔐' },
        { path: '/admin/settings/system', label: 'System Status', icon: '⚙️' },
        { path: '/admin/users', label: 'Admin Users', icon: '👤' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-gray-900 text-white flex flex-col transition-all duration-300`}
      >
        <div className="p-4 border-b border-gray-800">
          <h1 className={`font-bold ${sidebarOpen ? 'text-xl' : 'text-sm text-center'}`}>
            {sidebarOpen ? 'Open Connect' : 'OC'}
          </h1>
          {sidebarOpen && (
            <p className="text-sm text-gray-400 mt-1">Admin Dashboard</p>
          )}
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title} className="mb-6">
              {sidebarOpen && (
                <h2 className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase">
                  {section.title}
                </h2>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`
                  }
                >
                  <span className={sidebarOpen ? 'mr-3' : 'mx-auto'}>{item.icon}</span>
                  {sidebarOpen && item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-4 border-t border-gray-800 text-gray-400 hover:text-white text-sm"
        >
          {sidebarOpen ? '← Collapse' : '→'}
        </button>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                {user?.role === 'agency_admin' ? 'Agency Administrator' : 'Facility Administrator'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user?.firstName} {user?.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
