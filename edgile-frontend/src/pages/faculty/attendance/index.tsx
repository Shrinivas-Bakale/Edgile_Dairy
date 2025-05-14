import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ClipboardCheck, 
  FileText, 
  CalendarDays, 
  BarChart, 
  Users,
  ArrowRight,
  ChevronRight,
  Layers,
  AlertCircle
} from 'lucide-react';
import { useFacultyAuth } from '@/contexts/FacultyAuthContext';
import simpleToast from '@/hooks/use-simple-toast';
import facultyAttendanceApi from '@/utils/faculty-api';
import api from '@/utils/api';

// Type definitions for the API responses
interface AttendanceStats {
  success: boolean;
  data?: {
    totalClasses: number;
    markedClasses: number;
    pendingClasses: number;
    averageAttendance: number;
  };
  message?: string;
}

interface Class {
  _id: string;
  name: string;
  year: number;
  division: string;
  semester: number;
}

interface ClassesResponse {
  success: boolean;
  data?: {
    classes: Class[];
  };
  message?: string;
}

const AttendanceIndex = () => {
  const { faculty, token } = useFacultyAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todayStats, setTodayStats] = useState({
    totalClasses: 0,
    markedClasses: 0,
    pendingClasses: 0,
    averageAttendance: 0
  });
  
  // Set the authentication token for API calls
  useEffect(() => {
    if (token) {
      api.setToken(token);
    }
  }, [token]);
  
  // Fetch today's attendance statistics
  useEffect(() => {
    const fetchTodayStats = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // First get the faculty's classes
        const classesResponse = await facultyAttendanceApi.getClasses() as ClassesResponse;
        if (!classesResponse.success || !classesResponse.data?.classes?.length) {
          setError('No classes found. Statistics are not available.');
          setTodayStats({
            totalClasses: 0,
            markedClasses: 0,
            pendingClasses: 0,
            averageAttendance: 0
          });
          setLoading(false);
          return;
        }
        
        // Use the first class ID
        const classId = classesResponse.data.classes[0]._id;
        
        // Use the current date formatted as YYYY-MM-DD
        const today = new Date().toISOString().split('T')[0];
        
        // Use our API service with the class ID
        const data = await facultyAttendanceApi.getAttendanceStats(today, classId) as AttendanceStats;
        
        if (data.success && data.data) {
          setTodayStats({
            totalClasses: data.data.totalClasses || 0,
            markedClasses: data.data.markedClasses || 0,
            pendingClasses: data.data.pendingClasses || 0,
            averageAttendance: data.data.averageAttendance || 0
          });
        } else {
          setError(data.message || 'Failed to fetch attendance data');
          setTodayStats({
            totalClasses: 0,
            markedClasses: 0,
            pendingClasses: 0,
            averageAttendance: 0
          });
        }
      } catch (error) {
        console.error('Error fetching today\'s attendance stats:', error);
        setError('Failed to fetch attendance statistics. Please try again.');
        simpleToast({
          title: 'Error',
          description: 'Failed to fetch today\'s attendance statistics.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchTodayStats();
  }, [token]);
  
  const attendanceOptions = [
    {
      title: 'Mark Attendance',
      description: 'Record student attendance for classes',
      icon: <ClipboardCheck className="h-8 w-8 text-primary" />,
      path: '/faculty/attendance/mark',
      color: 'bg-blue-50'
    },
    {
      title: 'Daily Records',
      description: 'View and edit attendance for specific dates',
      icon: <CalendarDays className="h-8 w-8 text-primary" />,
      path: '/faculty/attendance/daily',
      color: 'bg-green-50'
    },
    {
      title: 'Statistics',
      description: 'Analyze attendance patterns and trends',
      icon: <BarChart className="h-8 w-8 text-primary" />,
      path: '/faculty/attendance/stats',
      color: 'bg-purple-50'
    },
    {
      title: 'Absentees',
      description: 'Track students with low attendance',
      icon: <Users className="h-8 w-8 text-primary" />,
      path: '/faculty/attendance/absentees',
      color: 'bg-amber-50'
    },
    {
      title: 'Reports',
      description: 'Generate and download attendance reports',
      icon: <FileText className="h-8 w-8 text-primary" />,
      path: '/faculty/attendance/reports',
      color: 'bg-red-50'
    }
  ];
  
  return (
    <div className="container mx-auto py-6">
      {/* Hero Section */}
      <div className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-700 mb-8 overflow-hidden shadow-lg">
        <div className="flex flex-col md:flex-row justify-between">
          <div className="p-8 md:w-2/3">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Attendance Management
            </h1>
            <p className="text-blue-100 text-lg mb-6 max-w-2xl">
              Track, analyze, and manage student attendance with powerful tools designed to improve attendance rates and academic performance.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => navigate('/faculty/attendance/mark')} 
                className="bg-white text-blue-700 hover:bg-blue-50"
              >
                Mark Attendance
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
              <Button 
                onClick={() => navigate('/faculty/attendance/daily')} 
                variant="outline" 
                className="border-white text-white hover:bg-blue-700"
              >
                View Records
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="hidden md:flex items-center justify-center p-8 md:w-1/3">
            <div className="w-48 h-48 relative">
              <div className="absolute inset-0 bg-white/20 rounded-full backdrop-blur-sm flex items-center justify-center">
                <Layers className="h-24 w-24 text-white" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="bg-white/10 backdrop-blur-sm px-8 py-4">
          {loading ? (
            <div className="flex justify-center py-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          ) : error ? (
            <div className="text-center py-3 text-white">
              <div className="flex items-center justify-center">
                <AlertCircle className="h-5 w-5 mr-1" />
                <span>{error}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white">
              <div className="text-center">
                <p className="text-sm font-medium text-blue-100">Today's Classes</p>
                <p className="text-2xl font-bold">{todayStats.totalClasses}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-blue-100">Marked</p>
                <p className="text-2xl font-bold">{todayStats.markedClasses}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-blue-100">Pending</p>
                <p className="text-2xl font-bold">{todayStats.pendingClasses}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-blue-100">Average Attendance</p>
                <p className="text-2xl font-bold">{todayStats.averageAttendance}%</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <h2 className="text-2xl font-bold mb-6">Attendance Tools</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {attendanceOptions.map((option, index) => (
          <Card 
            key={index} 
            className="group hover:shadow-md transition-all duration-300 overflow-hidden border-t-4 border-primary cursor-pointer"
            onClick={() => navigate(option.path)}
          >
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 -mt-8 -mr-8 ${option.color}`}></div>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 relative">
              <CardTitle className="text-lg font-medium">{option.title}</CardTitle>
              <div className={`p-2 rounded-md ${option.color}`}>
                {option.icon}
              </div>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-sm text-gray-500 mb-4">{option.description}</p>
            </CardContent>
            <CardFooter className="pt-0 relative">
              <Button variant="ghost" size="sm" className="p-0 h-auto text-primary group-hover:underline">
                <span>Open</span>
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* Quick Reference */}
      <Card className="mt-8 shadow">
        <CardHeader>
          <CardTitle>Quick Reference</CardTitle>
          <CardDescription>Helpful information for attendance management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 border rounded-md bg-gray-50 hover:shadow-sm transition-shadow">
              <h3 className="font-medium mb-2">Attendance Codes</h3>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center text-green-700">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <span>Present - On time arrival</span>
                </li>
                <li className="flex items-center text-amber-700">
                  <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                  <span>Late - Arrival after grace period</span>
                </li>
                <li className="flex items-center text-red-700">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                  <span>Absent - No attendance</span>
                </li>
                <li className="flex items-center text-blue-700">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                  <span>Excused - Approved absence</span>
                </li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-md bg-gray-50 hover:shadow-sm transition-shadow">
              <h3 className="font-medium mb-2">Required Attendance</h3>
              <p className="text-sm text-gray-600 mb-2">Students must maintain minimum 75% attendance to be eligible for examinations.</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">75% minimum required</p>
            </div>
            
            <div className="p-4 border rounded-md bg-gray-50 hover:shadow-sm transition-shadow">
              <h3 className="font-medium mb-2">Attendance Window</h3>
              <p className="text-sm text-gray-600">Attendance can be marked or edited:</p>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>• Same day: Any time</li>
                <li>• Previous day: Until 24 hours</li>
                <li>• Older records: Requires admin approval</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceIndex; 