import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardWrapper from '../../components/DashboardWrapper';
import { studentAPI } from '../../utils/api';
import api from '../../utils/api';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  IconBookmark,
  IconChalkboard,
  IconCalendarTime,
  IconRefresh,
  IconAlertCircle,
  IconInfoCircle,
  IconCalendar,
  IconClock,
  IconExternalLink,
  IconUserCircle,
  IconMap,
  IconStar,
} from '@tabler/icons-react';
import COEViewPage from '../admin/COEViewPage';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import { format } from 'date-fns';
import config from '../../config';

interface StudentProfile {
  id: string;
  name: string;
  email: string;
  registerNumber: string;
  classYear: number;
  semester: number;
  division: string;
  universityCode?: string;
  department?: string;
  university?: {
    name: string;
    email: string;
    contactInfo?: string;
    address?: string;
  };
}

interface Course {
  _id: string;
  subjectName: string;
  subjectCode: string;
  type: 'core' | 'lab' | 'elective';
  totalDuration: number;
  weeklyHours: number;
  year: string;
  semester: number;
}

interface StarredTimetable {
  id: string;
  year: string;
  semester: number;
  division: string;
  timestamp: number;
}

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starredTimetable, setStarredTimetable] = useState<StarredTimetable | null>(null);
  const [currentDay, setCurrentDay] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [needsReload, setNeedsReload] = useState<boolean>(false);
  const [coes, setCOEs] = useState<any[]>([]);
  const [coeModalOpen, setCOEModalOpen] = useState(false);
  const [selectedCOE, setSelectedCOE] = useState<any | null>(null);

  // Check if this is the initial login by looking for a flag in session storage
  useEffect(() => {
    const isInitialLogin = !sessionStorage.getItem('dashboardLoaded');
    
    if (isInitialLogin) {
      console.log('Initial dashboard load detected - sidebar may not render correctly');
      setNeedsReload(true);
      
      // Mark that we've loaded the dashboard once in this session
      sessionStorage.setItem('dashboardLoaded', 'true');
    }
  }, []);

  // Auto-reload the page once if this is the initial login to fix sidebar issues
  useEffect(() => {
    if (needsReload) {
      // Set a small timeout to allow the component to mount before reloading
      const timer = setTimeout(() => {
        console.log('Reloading page to ensure sidebar renders correctly');
        window.location.reload();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [needsReload]);

  // Get current day and time
  useEffect(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    setCurrentDay(days[now.getDay()]);
    
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    setCurrentTime(`${hours}:${minutes}`);
    
    // Update time every minute
    const intervalId = setInterval(() => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Check for starred timetable
  useEffect(() => {
    const starredTimetableId = localStorage.getItem('starredTimetableId');
    const starredTimetableInfo = localStorage.getItem('starredTimetableInfo');
    
    if (starredTimetableId && starredTimetableInfo) {
      try {
        const timetableInfo = JSON.parse(starredTimetableInfo);
        setStarredTimetable(timetableInfo);
      } catch (error) {
        console.error('Error parsing starred timetable info:', error);
      }
    }
  }, []);

  // Fetch student profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Use studentAPI.getProfile() which has proper error handling
        const data = await studentAPI.getProfile() as any;
        
        // Check if the response has the expected structure
        if (data && data.success && data.student) {
          setProfile(data.student);
        } else {
          // Fallback to using stored user data from localStorage
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              // Validate the user data has the minimum required fields
              if (userData && userData.email) {
                setProfile(userData);
              } else {
                setError('Invalid user data structure in local storage');
              }
            } catch (parseErr) {
              setError('Failed to load profile data. Please log out and log in again.');
            }
          } else {
            setError('Could not retrieve profile data');
          }
        }
      } catch (error) {
        setError('Failed to load profile. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);
  
  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoadingCourses(true);
        const data = await studentAPI.getCourses() as any;
        
        if (data && data.success) {
          setCourses(data.courses || []);
        } else {
          // Try to get user data for courses from localStorage
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              if (userData && userData.courses) {
                setCourses(userData.courses);
              }
            } catch (parseErr) {
              // Silent fail for courses as they're not critical
            }
          }
        }
      } catch (error) {
        // Show a message for course loading error
        showSnackbar('Failed to load courses. Please try again later.', 'error');
      } finally {
        setIsLoadingCourses(false);
      }
    };

    if (profile) {
      fetchCourses();
    }
  }, [profile, showSnackbar]);

  // Fetch published COEs
  useEffect(() => {
    const fetchCOEs = async () => {
      try {
        const res = await fetch(`${config.API_URL}/api/admin/coes/published`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) setCOEs(data.data);
      } catch (e) { /* ignore */ }
    };
    fetchCOEs();
  }, []);

  const navigateToTimetable = () => {
    navigate('/student/timetable');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        <span className="ml-3 text-lg">Loading your dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          <p className="mt-2">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardWrapper>
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-500 p-6 rounded-lg text-white">
          <h1 className="text-2xl font-bold">Welcome back, {profile?.name || 'Student'}!</h1>
          <p>Let's continue your learning journey</p>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Announcements Section */}
          <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Announcements</h2>
            <div className="p-4 bg-gray-50 rounded text-center">
              <p className="text-gray-500">No announcements at this time</p>
            </div>
          </div>
          
          {/* Starred Timetable Quick View */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center text-gray-900">
                <IconCalendar className="mr-2" size={24} />
                My Timetable
              </h2>
              {starredTimetable && (
                <div className="flex items-center text-yellow-500">
                  <IconStar className="fill-yellow-400" size={18} />
                </div>
              )}
            </div>
            
            {starredTimetable ? (
              <div>
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-blue-700">
                        {starredTimetable.year} Year, Div {starredTimetable.division}
                      </h3>
                      <p className="text-sm text-gray-600">Semester {starredTimetable.semester}</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">published</span>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <IconClock size={18} className="text-gray-500 mr-2" />
                    <span className="text-gray-700 font-medium">Today ({currentDay})</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="text-gray-500 mr-2">Current time:</span>
                    <span className="font-medium">{currentTime}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                  <div className="text-sm text-gray-500">
                    <div className="flex items-center mb-1">
                      <IconUserCircle size={16} className="mr-1" />
                      <span>Class Teacher: Not Assigned</span>
                    </div>
                    <div className="flex items-center">
                      <IconMap size={16} className="mr-1" />
                      <span>Classroom: Not assigned</span>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={navigateToTimetable}
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center transition-colors"
                >
                  <span>View Full Timetable</span>
                  <IconExternalLink size={16} className="ml-1" />
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <IconInfoCircle size={48} className="mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2 text-gray-900">No starred timetable</h3>
                <p className="text-gray-500 mb-4">
                  Star a timetable to quickly access it from your dashboard.
                </p>
                <button 
                  onClick={navigateToTimetable}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center mx-auto transition-colors"
                >
                  <span>Go to Timetables</span>
                  <IconExternalLink size={16} className="ml-1" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Courses Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center text-gray-900">
              <IconBookmark className="mr-2" size={24} />
              My Courses
            </h2>
            <button 
              onClick={() => {
                // Implement refresh logic
              }}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <IconRefresh size={18} className="mr-1" />
              Refresh
            </button>
          </div>
          
          {isLoadingCourses ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : courses.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <IconInfoCircle size={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2 text-gray-900">No courses found</h3>
              <p className="text-gray-500">
                You are not enrolled in any courses at the moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div 
                  key={course._id} 
                  className="bg-gray-50 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/student/courses/${course._id}`)}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-gray-900">{course.subjectName}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ 
                      course.type === 'core' ? 'bg-blue-100 text-blue-800' :
                      course.type === 'lab' ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {course.type.charAt(0).toUpperCase() + course.type.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{course.subjectCode}</p>
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <IconChalkboard size={16} className="mr-1" />
                      <span>{course.year} Year, Semester {course.semester}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <IconCalendarTime size={16} className="mr-1" />
                      <span>
                        {Number.isInteger(course.weeklyHours) 
                          ? `${course.weeklyHours} hours per week` 
                          : `${Math.floor(course.weeklyHours)}-${Math.ceil(course.weeklyHours)} hours per week`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add after main content area or as a new section */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Calendar of Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coes.length === 0 ? (
              <div className="col-span-full text-gray-500">No published calendars available</div>
            ) : coes.map(coe => (
              <div key={coe._id} className="bg-white rounded-lg shadow p-6 flex flex-col items-start">
                <h3 className="font-semibold text-lg mb-1">{coe.name}</h3>
                <div className="text-gray-500 mb-2">{format(new Date(coe.startDate), 'd MMM yyyy')} to {format(new Date(coe.endDate), 'd MMM yyyy')}</div>
                <button className="mt-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" onClick={() => { setSelectedCOE(coe); setCOEModalOpen(true); }}>View</button>
              </div>
            ))}
          </div>
          {/* Modal to show COEViewPage in public mode */}
          <Dialog open={coeModalOpen} onClose={() => setCOEModalOpen(false)} maxWidth="xl" fullWidth>
            <DialogTitle>Calendar of Events</DialogTitle>
            <DialogContent sx={{ p: 0 }}>
              {selectedCOE && <COEViewPage publicMode={true} id={selectedCOE._id} />}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </DashboardWrapper>
  );
};

export default StudentDashboard; 