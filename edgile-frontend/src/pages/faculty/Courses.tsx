import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFacultyAuth } from '../../contexts/FacultyAuthContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import DashboardWrapper from '../../components/DashboardWrapper';
import { facultyAPI } from '../../utils/api';
import { 
  IconInfoCircle, 
  IconBookmark, 
  IconRefresh,
  IconChalkboard,
  IconCalendarTime,
} from '@tabler/icons-react';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Course {
  _id: string;
  subjectName: string;
  subjectCode: string;
  type: 'core' | 'lab' | 'elective';
  totalDuration: number;
  weeklyHours: number;
  year: string;
  semester: number;
  description?: string;
}

const FacultyCourses: React.FC = () => {
  const navigate = useNavigate();
  const { faculty } = useFacultyAuth();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Safely fetch courses without triggering logout for auth errors
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        // Check if token exists before making API call
        const token = localStorage.getItem('token');
        if (!token) {
          showSnackbar('Your session has expired. Please login again.', 'warning');
          navigate('/login');
          return;
        }

        // Get courses
        const response = await facultyAPI.getCourses();
        
        if (response.success && response.courses) {
          setCourses(response.courses);
        } else {
          showSnackbar(response.message || 'Failed to load courses', 'error');
          setError('Failed to load courses. Please try again later.');
        }
      } catch (err: any) {
        // Handle errors without triggering logout
        console.error('Error fetching courses:', err);
        setError('Failed to fetch courses. Please try again later.');
        showSnackbar('Error loading courses. Please try refreshing the page.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [navigate, showSnackbar]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await facultyAPI.getCourses();
      
      if (response.success && response.courses) {
        setCourses(response.courses);
        showSnackbar('Courses refreshed successfully', 'success');
      } else {
        showSnackbar(response.message || 'Failed to refresh courses', 'error');
        setError('Failed to refresh courses. Please try again later.');
      }
    } catch (err) {
      console.error('Error refreshing courses:', err);
      setError('Failed to refresh courses. Please try again later.');
      showSnackbar('Error refreshing courses', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardWrapper>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size={40} />
        </div>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">My Courses</h1>
          <button 
            onClick={handleRefresh}
            className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <IconRefresh size={18} className="mr-1" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md flex items-start">
            <IconInfoCircle size={24} className="mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium">Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {courses.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
            <IconInfoCircle size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No courses assigned</h3>
            <p className="text-gray-500 dark:text-gray-400">
              You don't have any courses assigned at the moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div 
                key={course._id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/faculty/courses/${course._id}`)}
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{course.subjectName}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    course.type === 'core' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                    course.type === 'lab' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' :
                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                  }`}>
                    {course.type.charAt(0).toUpperCase() + course.type.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{course.subjectCode}</p>
                <div className="mt-4 border-t pt-4">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                    <IconChalkboard size={16} className="mr-1" />
                    <span>{course.year} Year, Semester {course.semester}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mt-1">
                    <IconCalendarTime size={16} className="mr-1" />
                    <span>{course.weeklyHours} hours/week ({course.totalDuration} total)</span>
                  </div>
                  {course.description && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {course.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardWrapper>
  );
};

export default FacultyCourses; 