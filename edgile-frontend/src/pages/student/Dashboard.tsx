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
} from '@tabler/icons-react';

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

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch student profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Use studentAPI.getProfile() which has proper error handling
        const data = await studentAPI.getProfile();
        
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
        const data = await studentAPI.getCourses();
        
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
      <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900 min-h-screen">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-500 p-6 rounded-lg text-white">
          <h1 className="text-2xl font-bold">Welcome back, {profile?.name || 'Student'}!</h1>
          <p>Let's continue your learning journey</p>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Announcements Section */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Announcements</h2>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded text-center">
              <p className="text-gray-500 dark:text-gray-400">No announcements at this time</p>
            </div>
          </div>
          
          {/* Upcoming Events Section */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Upcoming Events</h2>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded text-center">
              <p className="text-gray-500 dark:text-gray-400">No upcoming events at this time</p>
            </div>
          </div>
        </div>

        {/* Courses Section */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center text-gray-900 dark:text-gray-100">
              <IconBookmark className="mr-2" size={24} />
              My Courses
            </h2>
            <button 
              onClick={() => {
                // Implement refresh logic
              }}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
            >
              <IconRefresh size={18} className="mr-1" />
              Refresh
            </button>
          </div>
          
          {isLoadingCourses ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
          ) : courses.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
              <IconInfoCircle size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-500" />
              <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">No courses found</h3>
              <p className="text-gray-500 dark:text-gray-400">
                You are not enrolled in any courses at the moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div 
                  key={course._id} 
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 hover:shadow-lg dark:hover:shadow-gray-600/50 transition-shadow cursor-pointer"
                  onClick={() => navigate(`/student/courses/${course._id}`)}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{course.subjectName}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ 
                      course.type === 'core' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200' :
                      course.type === 'lab' ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200' :
                      'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                    }`}>
                      {course.type.charAt(0).toUpperCase() + course.type.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{course.subjectCode}</p>
                  <div className="mt-4 border-t border-gray-200 dark:border-gray-600 pt-4">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <IconChalkboard size={16} className="mr-1" />
                      <span>{course.year} Year, Semester {course.semester}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mt-1">
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
      </div>
    </DashboardWrapper>
  );
};

export default StudentDashboard; 