import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudentAuth } from '../../contexts/StudentAuthContext';
import { useAuth } from '../../contexts/AuthContext';
import DashboardWrapper from '../../components/DashboardWrapper';
import { studentAPI } from '../../utils/api';
import { 
  IconInfoCircle, 
  IconArrowLeft,
  IconBook,
  IconChalkboard,
  IconCalendarTime,
  IconCertificate
} from '@tabler/icons-react';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Course {
  _id: string;
  subjectName: string;
  subjectCode: string;
  type: 'core' | 'lab' | 'elective';
  totalDuration: number;
  weeklyHours: number;
  credits?: number;
  creditHours?: number;
  year: string;
  semester: number;
  description?: string;
  academicYear?: string;
}

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { student } = useStudentAuth();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  
  useEffect(() => {
    const fetchCourseDetails = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Check if token exists before making API call
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        
        // Get course details
        const response = await studentAPI.getCourseById(id);
        
        if (response.success && response.course) {
          setCourse(response.course);
          setIsEnrolled(response.isEnrolled || false);
        } else {
          setError('Failed to load course details. Please try again later.');
        }
      } catch (err: any) {
        // Handle errors without triggering logout
        console.error('Error fetching course details:', err);
        setError('Failed to fetch course details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourseDetails();
  }, [id, navigate]);
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'core':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'lab':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'elective':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };
  
  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-6">
        {/* Back button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/student/courses')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <IconArrowLeft size={20} className="mr-1" />
            Back to Courses
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size={40} />
          </div>
        ) : error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md flex items-start">
            <IconInfoCircle size={24} className="mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium">Error</p>
              <p>{error}</p>
            </div>
          </div>
        ) : course ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  <IconBook size={28} className="mr-2 flex-shrink-0" />
                  {course.subjectName}
                </h1>
                <p className="text-lg text-gray-500 dark:text-gray-400 mt-1">{course.subjectCode}</p>
              </div>
              
              <div className="mt-4 sm:mt-0 flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(course.type)}`}>
                  {course.type.charAt(0).toUpperCase() + course.type.slice(1)}
                </span>
                
                {!isEnrolled && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                    Not Enrolled
                  </span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="flex items-center">
                <IconChalkboard size={20} className="mr-2 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Year & Semester</p>
                  <p className="font-medium text-gray-900 dark:text-white">{course.year} Year, Semester {course.semester}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <IconCalendarTime size={20} className="mr-2 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Duration</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {course.creditHours || course.credits || course.weeklyHours} hours/week 
                    {course.totalDuration && ` (${course.totalDuration} total)`}
                  </p>
                </div>
              </div>
              
              {course.academicYear && (
                <div className="flex items-center">
                  <IconCertificate size={20} className="mr-2 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Academic Year</p>
                    <p className="font-medium text-gray-900 dark:text-white">{course.academicYear}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Course Description</h2>
              {course.description ? (
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{course.description}</p>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">No description available for this course.</p>
              )}
            </div>
            
            {/* Additional sections can be added here for course materials, syllabus, etc. */}
            
            {!isEnrolled && (
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-900 rounded-md p-4 mt-6">
                <p className="text-yellow-800 dark:text-yellow-200">
                  <strong>Note:</strong> You are viewing this course for reference, but you are not currently enrolled in it.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
            <IconInfoCircle size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Course not found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              The requested course could not be found or you don't have access to it.
            </p>
          </div>
        )}
      </div>
    </DashboardWrapper>
  );
};

export default CourseDetail; 