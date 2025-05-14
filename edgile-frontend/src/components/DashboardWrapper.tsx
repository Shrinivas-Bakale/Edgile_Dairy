import React, { useState, createContext, useContext, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import Logo from './Logo';
import TopNavbar from './TopNavbar';
import { useAuth } from '../contexts/AuthContext';
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
  IconCalendar,
  IconClipboard
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
        { name: 'Calendar of Events', path: '/admin/calendar-of-events', icon: <IconCalendar size={24} /> },
        { name: 'Video Library', path: '/lecture-videos', icon: <IconBook size={24} /> },
        { name: 'Registration Codes', path: '/admin/registration-codes', icon: <IconKey size={24} /> },
        { name: 'Profile', path: '/admin/profile', icon: <IconUserCircle size={24} /> },
        { name: 'Attendance', path: '/admin/attendance', icon: <IconClipboard size={24} /> }
      ];
    } else if (role === 'faculty') {
      return [
        { name: 'Dashboard', path: '/faculty/dashboard', icon: <IconLayoutDashboard size={24} /> },
        { name: 'Courses', path: '/faculty/courses', icon: <IconClipboardList size={24} /> },
        { name: 'Timetable', path: '/faculty/timetable', icon: <IconCalendar size={24} /> },
        { name: 'Calendar of Events', path: '/faculty/calendar-of-events', icon: <IconCalendar size={24} /> },
        { name: 'Video Library', path: '/lecture-videos', icon: <IconBook size={24} /> },
        { name: 'Students', path: '/faculty/students', icon: <IconUsers size={24} /> },
        { name: 'Profile', path: '/faculty/profile', icon: <IconUser size={24} /> },
        { name: 'Attendance', path: '/faculty/attendance', icon: <IconClipboard size={24} /> }
      ];
    } else if (role === 'student') {
      return [
        { name: 'Dashboard', path: '/student/dashboard', icon: <IconLayoutDashboard size={24} /> },
        { name: 'Courses', path: '/student/courses', icon: <IconClipboardList size={24} /> },
        { name: 'Assignments', path: '/student/assignments', icon: <IconReportAnalytics size={24} /> },
        { name: 'Grades', path: '/student/grades', icon: <IconSchool size={24} /> },
        { name: 'Timetable', path: '/student/timetable', icon: <IconCalendar size={24} /> },
        { name: 'Calendar of Events', path: '/student/calendar-of-events', icon: <IconCalendar size={24} /> },
        { name: 'Video Library', path: '/lecture-videos', icon: <IconBook size={24} /> },
        { name: 'Profile', path: '/student/profile', icon: <IconUser size={24} /> },
        { name: 'Attendance', path: '/student/attendance', icon: <IconClipboard size={24} /> }
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
    <div className="h-screen w-full transition-colors duration-300 flex">
      <motion.div
        className="h-screen px-2 py-4 flex flex-col w-[260px] shrink-0 fixed border-r z-10 transition-colors duration-300 bg-white border-gray-200"
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
        <nav className="mt-8 flex-1 overflow-y-auto">
          {getNavigationItems(user?.role).map((item) => (
            <div
              key={item.name}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                "flex items-center relative my-2 h-12 transition-all duration-300 ease-in-out rounded-md cursor-pointer",
                open ? "px-4 justify-start" : "px-0 justify-center",
                location.pathname === item.path
                  ? 'text-indigo-600 bg-indigo-50'
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
                    ? 'text-indigo-600'
                    : 'text-gray-500'
                )}>
                  {item.icon}
                </div>
              </div>
              <motion.span
                animate={itemAnimation}
                className={cn(
                  "text-sm font-medium ml-3 whitespace-pre",
                  "text-gray-700"
                )}
              >
                {item.name}
              </motion.span>
              {location.pathname === item.path && !open && (
                <motion.div 
                  className="absolute left-0 w-1 h-8 rounded-r-full bg-indigo-600"
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
        <div className="p-4 border-t border-gray-200">
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
              className="text-sm font-medium text-gray-700"
            >
              {user?.name}
            </motion.span>
          </div>
          
          {/* Logout button */}
          <div
            onClick={handleLogout}
            className={cn(
              "flex items-center relative mt-4 h-12 transition-all duration-300 ease-in-out rounded-md cursor-pointer",
              open ? "px-4 justify-start" : "px-0 justify-center",
              'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <div className={cn(
              "flex items-center justify-center",
              open ? "w-10 h-10" : "w-10 h-10"
            )}>
              <div className="transition-colors duration-300 text-gray-500">
                <IconLogout size={24} />
              </div>
            </div>
            <motion.span
              animate={itemAnimation}
              className="text-sm font-medium ml-3 whitespace-pre text-gray-700"
            >
              Logout
            </motion.span>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 w-full">
        <TopNavbar isSidebarOpen={open} />
        <motion.div 
          className="flex-1 min-h-0 transition-colors duration-300 bg-gray-50 text-gray-900 overflow-auto"
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
          style={{ height: 'calc(100vh - 64px)' }}
        >
          <div className="p-6 h-full overflow-auto">
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const DashboardWrapper: React.FC<DashboardWrapperProps> = ({ children }) => {
  const location = useLocation();
  const [open, setOpen] = useState<boolean>(false); // closed by default
  const [animate, setAnimate] = useState<boolean>(false);
  
  // List of sidebar paths for admin
  const sidebarPaths = [
    '/admin/dashboard', '/admin/faculty', '/admin/students', '/admin/classrooms', '/admin/subjects',
    '/admin/timetable', '/admin/calendar-of-events', '/admin/registration-codes', '/admin/profile', '/admin/attendance',
    '/lecture-videos',
    '/faculty/dashboard', '/faculty/courses', '/faculty/timetable', '/faculty/calendar-of-events', '/faculty/students', '/faculty/profile', '/faculty/attendance',
    '/student/dashboard', '/student/courses', '/student/assignments', '/student/grades', '/student/timetable', '/student/calendar-of-events', '/student/profile', '/student/attendance'
  ];

  useEffect(() => {
    // Sidebar should close if not on a sidebar path
    if (!sidebarPaths.some(path => location.pathname.startsWith(path))) {
      setOpen(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimate(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      <div className="flex h-screen overflow-hidden">
        <DashboardContent>{children}</DashboardContent>
      </div>
    </SidebarContext.Provider>
  );
};

export default DashboardWrapper; 