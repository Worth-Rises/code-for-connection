import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function IncarceratedLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/pin-login');
  };

  const navItems = [
    { path: '/incarcerated/voice', label: 'Voice Call', icon: '📞' },
    { path: '/incarcerated/video', label: 'Video Call', icon: '📹' },
    { path: '/incarcerated/messaging', label: 'Messages', icon: '💬' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col overflow-x-hidden">
      <header className="bg-blue-900 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Open Connect</h1>
            <p className="text-sm text-blue-200">
              {user?.firstName} {user?.lastName}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-blue-800 hover:bg-blue-700 rounded-lg text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="flex">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex-1 px-2 sm:px-4 py-3 sm:py-4 text-center border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`
              }
            >
              <span className="text-xl sm:text-2xl block mb-1">{item.icon}</span>
              <span className="text-xs sm:text-sm font-medium hidden sm:block">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}
