import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { 
  IconMenu2, 
  IconX, 
  IconMoon, 
  IconSun,
  IconBell,
  IconSearch,
  IconUser,
  IconDashboard,
  IconSchool
} from '@tabler/icons-react';
import { cn } from '../utils/cn';
import { AnimatePresence, motion } from 'framer-motion';

interface TopNavbarProps {
  isSidebarOpen: boolean;
}

const TopNavbar: React.FC<TopNavbarProps> = ({ isSidebarOpen }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();

  const handleLogout = () => {
    console.log('TopNavbar: Logging out user');
    logout();
    navigate('/login', { replace: true });
  };
  
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAuthenticated && user) {
      // Redirect to appropriate dashboard based on role
      switch (user.role) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'faculty':
          navigate('/faculty/dashboard');
          break;
        case 'student':
          navigate('/student/dashboard');
          break;
        default:
          window.location.href = '/';
      }
    } else {
      // Not authenticated, go to landing page with reload
      window.location.href = '/';
    }
  };

  return (
    <nav className={`fixed top-0 right-0 left-0 h-16 z-30 transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gray-800 border-b border-gray-700' 
        : 'bg-white border-b border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            onClick={handleLogoClick}
            className="flex items-center space-x-2 cursor-pointer"
          >
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg p-1.5">
              <IconSchool className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">
              Edgile
            </span>
          </div>

          {/* Search Bar */}
          <div className={`hidden md:flex items-center flex-1 max-w-md mx-4 px-4 py-2 rounded-lg transition-colors duration-300 ${
            isDarkMode
              ? 'bg-gray-700 text-gray-200'
              : 'bg-gray-100 text-gray-600'
          }`}>
            <IconSearch className="w-5 h-5 mr-2" />
            <input
              type="text"
              placeholder="Search..."
              className={`w-full bg-transparent outline-none ${
                isDarkMode ? 'placeholder-gray-400' : 'placeholder-gray-500'
              }`}
            />
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button
              className={`p-2 rounded-md transition-colors duration-200 ${
                isDarkMode
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <IconBell size={24} />
            </button>

            {/* Dark Mode Toggle - Hidden */}
            {/* Hide the dark mode toggle button as we've disabled this functionality 
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-md transition-colors duration-200 ${
                isDarkMode
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {isDarkMode ? <IconSun size={24} /> : <IconMoon size={24} />}
            </button>
            */}

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => user && navigate(`/${user.role}/profile`)}
                className={`flex items-center space-x-2 p-2 rounded-md transition-colors duration-200 ${
                  isDarkMode
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
                } cursor-pointer`}
              >
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md`}>
                  <span className="text-white text-sm font-medium">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className={`text-sm font-medium ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  {user?.name}
                </span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden p-2 rounded-md transition-colors duration-200 ${
                isDarkMode
                  ? 'text-gray-300 hover:bg-gray-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {isMobileMenuOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className={`absolute top-16 left-0 right-0 shadow-lg transition-colors duration-300 ${
              isDarkMode
                ? 'bg-gray-800 border-b border-gray-700'
                : 'bg-white border-b border-gray-200'
            }`}
          >
            <div className="px-4 py-2">
              {/* Mobile Search */}
              <div className={`flex items-center px-4 py-2 mb-2 rounded-lg transition-colors duration-300 ${
                isDarkMode
                  ? 'bg-gray-700 text-gray-200'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <IconSearch className="w-5 h-5 mr-2" />
                <input
                  type="text"
                  placeholder="Search..."
                  className={`w-full bg-transparent outline-none ${
                    isDarkMode ? 'placeholder-gray-400' : 'placeholder-gray-500'
                  }`}
                />
              </div>

              {/* Mobile Navigation Links */}
              <div
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (user) {
                    navigate(`/${user.role}/dashboard`);
                  } else {
                    navigate('/login');
                  }
                }}
                className={`block px-4 py-2 rounded-md transition-colors duration-200 cursor-pointer ${
                  isDarkMode
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Dashboard
              </div>
              <div
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (user) {
                    navigate(`/${user.role}/profile`);
                  } else {
                    navigate('/login');
                  }
                }}
                className={`block px-4 py-2 rounded-md transition-colors duration-200 cursor-pointer ${
                  isDarkMode
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Profile
              </div>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200 ${
                  isDarkMode
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default TopNavbar; 