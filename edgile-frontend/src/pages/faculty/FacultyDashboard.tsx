import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Card, 
  CardContent, 
  Button, 
  AppBar, 
  Toolbar, 
  IconButton,
  Stack,
  CircularProgress,
  Container
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useFacultyAuth } from '../../contexts/FacultyAuthContext';
import LogoutIcon from '@mui/icons-material/Logout';
import { useSnackbar } from '../../contexts/SnackbarContext';
import RegistrationModal from '../../components/faculty/RegistrationModal';
import DashboardWrapper from '../../components/DashboardWrapper';
import { facultyAPI } from '../../utils/api';
import {
  IconBookmark,
  IconChalkboard,
  IconCalendarTime,
  IconUsers,
  IconRefresh,
  IconAlertCircle,
  IconInfoCircle,
  IconSearch
} from '@tabler/icons-react';

interface User {
  name?: string;
  role?: string;
  universityName?: string;
  isFirstLogin?: boolean;
  passwordChangeRequired?: boolean;
  status?: string;
  registrationCompleted?: boolean;
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

interface Classroom {
  _id: string;
  name: string;
  floor: number;
  capacity: number;
  status: string;
}

const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();
  const { logout, faculty } = useFacultyAuth();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [isLoading, setIsLoading] = useState(true);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingClassrooms, setIsLoadingClassrooms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const checkActivationStatus = async () => {
      try {
        // Check JWT token for registration status
        const token = localStorage.getItem('token');
        if (!token) {
          showSnackbar('Session expired. Please login again.', 'error');
          navigate('/login');
          return;
        }
        
        // Get user data from localStorage
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          showSnackbar('User data not found. Please login again.', 'error');
          navigate('/login');
          return;
        }
        
        const userData = JSON.parse(userStr);
        console.log('User data:', userData);
        
        // Check if faculty registration is pending
        if (userData.role === 'faculty') {
          if (userData.status === 'pending' || !userData.registrationCompleted || userData.isFirstLogin) {
            console.log('Faculty registration incomplete, showing modal');
            setShowRegistrationModal(true);
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking activation status:', error);
        showSnackbar('Error checking account status', 'error');
        navigate('/login');
      }
    };
    
    checkActivationStatus();
  }, [navigate, showSnackbar]);

  const handleLogout = () => {
    console.log('Handling logout for faculty member');
    try {
      logout();
      showSnackbar('Logged out successfully', 'success');
      window.location.href = '/';
      console.log('Navigation to landing page initiated with page reload');
    } catch (error) {
      console.error('Error during logout:', error);
      showSnackbar('Failed to log out', 'error');
    }
  };

  // Fetch courses and classrooms when component mounts
  useEffect(() => {
    fetchCourses();
    fetchClassrooms();
  }, []);
  
  // Fetch courses assigned to the faculty
  const fetchCourses = async () => {
    try {
      setIsLoadingCourses(true);
      const response = await facultyAPI.getCourses();
      
      if (response.success && response.courses) {
        setCourses(response.courses);
      } else {
        showSnackbar('Failed to load courses: ' + (response.message || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to fetch courses. Please try again later.');
    } finally {
      setIsLoadingCourses(false);
    }
  };
  
  // Fetch classrooms
  const fetchClassrooms = async () => {
    try {
      setIsLoadingClassrooms(true);
      const response = await facultyAPI.getClassrooms();
      
      if (response.success && response.classrooms) {
        setClassrooms(response.classrooms);
      } else {
        showSnackbar('Failed to load classrooms: ' + (response.message || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error);
      setError('Failed to fetch classrooms. Please try again later.');
    } finally {
      setIsLoadingClassrooms(false);
    }
  };

  if (isLoading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-6">
        <RegistrationModal open={showRegistrationModal} />
        
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Faculty Dashboard
            </Typography>
            <Button 
              color="inherit" 
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
              sx={{ 
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              Logout
            </Button>
          </Toolbar>
        </AppBar>

        <Box sx={{ p: 3 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Welcome, {faculty?.name || user?.name || 'Faculty'}!
            </Typography>
            <Typography variant="body1">
              You are logged in as a faculty member at {faculty?.universityName || user?.universityName || 'your institution'}.
            </Typography>
          </Paper>
          
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            sx={{ width: '100%' }}
          >
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  My Courses
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage your courses, assignments, and materials
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  sx={{ mt: 2 }}
                  onClick={() => alert('Courses feature coming soon!')}
                >
                  View Courses
                </Button>
              </CardContent>
            </Card>
            
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Student Management
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  View and manage students enrolled in your courses
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  sx={{ mt: 2 }}
                  onClick={() => alert('Student management feature coming soon!')}
                >
                  Manage Students
                </Button>
              </CardContent>
            </Card>
            
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  My Profile
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  View and update your profile information
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary"
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/faculty/profile')}
                >
                  Edit Profile
                </Button>
              </CardContent>
            </Card>
          </Stack>
        </Box>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md flex items-start">
            <IconAlertCircle size={24} className="mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium">Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}
        
        {/* Courses Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center">
              <IconBookmark className="mr-2" size={24} />
              My Courses
            </h2>
            <button 
              onClick={fetchCourses}
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Classrooms Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center">
              <IconChalkboard className="mr-2" size={24} />
              Available Classrooms
            </h2>
            <button 
              onClick={fetchClassrooms}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <IconRefresh size={18} className="mr-1" />
              Refresh
            </button>
          </div>
          
          {isLoadingClassrooms ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : classrooms.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
              <IconInfoCircle size={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No classrooms available</h3>
              <p className="text-gray-500 dark:text-gray-400">
                There are no classrooms available at the moment.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Floor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Capacity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {classrooms.map((classroom) => (
                      <tr key={classroom._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {classroom.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {classroom.floor}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {classroom.capacity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            classroom.status === 'available' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                            classroom.status === 'occupied' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                          }`}>
                            {classroom.status.charAt(0).toUpperCase() + classroom.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardWrapper>
  );
};

export default FacultyDashboard; 