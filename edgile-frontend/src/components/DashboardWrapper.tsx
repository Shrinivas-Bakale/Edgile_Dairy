import React, { useState, createContext, useContext, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import Logo from './Logo';
import TopNavbar from './TopNavbar';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { 
  IconMenu2, 
  IconX, 
  IconLayoutDashboard,
  IconUsers,
  IconSchool,
  IconUserCircle,
  IconClipboardList,
  IconReportAnalytics,
  IconSettings,
  IconUser,
  IconHome,
  IconLogout,
  IconChevronLeft,
  IconChevronRight,
  IconDashboard,
  IconUsersGroup,
  IconBook,
  IconKey,
  IconCalendar
} from '@tabler/icons-react';

interface DashboardWrapperProps {
  children: React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

const DashboardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { open, setOpen } = useSidebar();
  const { isDarkMode } = useDarkMode();

  const handleLogout = () => {
    console.log('Logging out user:', user?.role);
    logout();
    navigate('/login', { replace: true });
  };
  
  const handleNavigation = (path: string) => {
    console.log('Navigation requested to path:', path);
    setTimeout(() => {
      navigate(path, { replace: false });
    }, 0);
  };

  const getNavigationItems = (role: 'admin' | 'faculty' | 'student' | undefined) => {
    if (role === 'admin') {
      return [
        { name: 'Dashboard', path: '/admin/dashboard', icon: <IconLayoutDashboard size={24} /> },
        { name: 'Faculty', path: '/admin/faculty', icon: <IconUsersGroup size={24} /> },
        { name: 'Students', path: '/admin/students', icon: <IconUser size={24} /> },
        { name: 'Classrooms', path: '/admin/classrooms', icon: <IconHome size={24} /> },
        { name: 'Subjects', path: '/admin/subjects', icon: <IconBook size={24} /> },
        { name: 'Timetable', path: '/admin/timetable', icon: <IconCalendar size={24} /> },
        { name: 'Registration Codes', path: '/admin/registration-codes', icon: <IconKey size={24} /> },
        { name: 'Profile', path: '/admin/profile', icon: <IconUserCircle size={24} /> }
      ];
    } else if (role === 'faculty') {
      return [
        { name: 'Dashboard', path: '/faculty/dashboard', icon: <IconLayoutDashboard size={24} /> },
        { name: 'Courses', path: '/faculty/courses', icon: <IconClipboardList size={24} /> },
        { name: 'Students', path: '/faculty/students', icon: <IconUserCircle size={24} /> },
        { name: 'Profile', path: '/faculty/profile', icon: <IconUser size={24} /> }
      ];
    } else if (role === 'student') {
      return [
        { name: 'Dashboard', path: '/student/dashboard', icon: <IconLayoutDashboard size={24} /> },
        { name: 'Courses', path: '/student/courses', icon: <IconClipboardList size={24} /> },
        { name: 'Assignments', path: '/student/assignments', icon: <IconReportAnalytics size={24} /> },
        { name: 'Grades', path: '/student/grades', icon: <IconSchool size={24} /> },
        { name: 'Profile', path: '/student/profile', icon: <IconUser size={24} /> }
      ];
    } else {
      // Default case for undefined role
      return [];
    }
  };

  const sidebarAnimation = {
    width: open ? "260px" : "70px",
    transition: {
      duration: 0.4,
      type: "spring",
      stiffness: 100,
      damping: 20
    }
  };

  const itemAnimation = {
    opacity: open ? 1 : 0,
    x: open ? 0 : -5,
    display: open ? "inline-block" : "none",
    transition: {
      duration: 0.3,
      delay: open ? 0.05 : 0
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-300">
      <div className="flex h-screen">
        <motion.div
          className={`h-screen px-2 py-4 hidden md:flex md:flex-col w-[260px] shrink-0 fixed border-r transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}
          animate={sidebarAnimation}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <div className={cn(
            "p-4 flex items-center",
            !open && "justify-center"
          )}>
            <Logo collapsed={!open} />
          </div>
          <nav className="mt-8 flex-1">
            {getNavigationItems(user?.role).map((item) => (
              <div
                key={item.name}
                onClick={() => handleNavigation(item.path)}
                className={cn(
                  "flex items-center relative my-2 h-12 transition-all duration-300 ease-in-out rounded-md cursor-pointer",
                  open ? "px-4 justify-start" : "px-0 justify-center",
                  location.pathname === item.path
                    ? isDarkMode
                      ? 'text-indigo-400 bg-indigo-900/20'
                      : 'text-indigo-600 bg-indigo-50'
                    : isDarkMode
                      ? 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <div className={cn(
                  "flex items-center justify-center",
                  open ? "w-10 h-10" : "w-10 h-10"
                )}>
                  <div className={cn(
                    "transition-colors duration-300",
                    location.pathname === item.path 
                      ? isDarkMode
                        ? 'text-indigo-400'
                        : 'text-indigo-600'
                      : isDarkMode
                        ? 'text-gray-400'
                        : 'text-gray-500'
                  )}>
                    {item.icon}
                  </div>
                </div>
                <motion.span
                  animate={itemAnimation}
                  className={cn(
                    "text-sm font-medium ml-3 whitespace-pre",
                    isDarkMode ? "text-gray-200" : "text-gray-700"
                  )}
                >
                  {item.name}
                </motion.span>
                {location.pathname === item.path && !open && (
                  <motion.div 
                    className={`absolute left-0 w-1 h-8 rounded-r-full ${
                      isDarkMode ? 'bg-indigo-400' : 'bg-indigo-600'
                    }`}
                    layoutId="activeIndicator"
                    transition={{
                      type: "spring",
                      stiffness: 100,
                      damping: 20
                    }}
                  />
                )}
              </div>
            ))}
          </nav>
          <div className={`p-4 border-t transition-colors duration-300 ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className={cn(
              "flex items-center",
              !open && "justify-center"
            )}>
              <div className={cn(
                "rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md",
                open ? "w-10 h-10 mr-3" : "w-10 h-10"
              )}>
                <span className="text-white text-sm font-medium">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <motion.span
                animate={itemAnimation}
                className={cn(
                  "text-sm font-medium",
                  isDarkMode ? "text-gray-200" : "text-gray-700"
                )}
              >
                {user?.name}
              </motion.span>
            </div>
          </div>
        </motion.div>

        <div className="flex-1">
          <TopNavbar isSidebarOpen={open} />
          <motion.div 
            className={`flex-1 min-h-screen transition-colors duration-300 ${
              isDarkMode 
                ? 'bg-gray-900 text-gray-100' 
                : 'bg-white text-gray-900'
            }`}
            animate={{
              marginLeft: open ? "260px" : "70px",
              marginTop: "64px",
            }}
            transition={{
              duration: 0.4,
              type: "spring",
              stiffness: 100,
              damping: 20
            }}
          >
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const DashboardWrapper: React.FC<DashboardWrapperProps> = ({ children }) => {
  const [open, setOpen] = useState(false);

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate: true }}>
      <DashboardContent>{children}</DashboardContent>
    </SidebarContext.Provider>
  );
};

export default DashboardWrapper; 