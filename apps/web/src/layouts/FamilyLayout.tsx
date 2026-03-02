import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function FamilyLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/family/messaging', label: 'Messages', icon: '💬' },
    { path: '/family/voice', label: 'Voice Calls', icon: '📞' },
    { path: '/family/video', label: 'Video Calls', icon: '📹' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">Open Connect</h1>
            <nav className="hidden md:flex gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </nav>
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

      <nav className="md:hidden bg-white border-b border-gray-200">
        <div className="flex">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600'
                }`
              }
            >
              <span className="block text-lg mb-1">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
