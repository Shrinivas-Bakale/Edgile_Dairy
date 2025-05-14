import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { CalendarDays, BarChart, ArrowRight, Bell, Book, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useEffect, useState } from 'react';
import config from '@/config';
import { useNavigate } from 'react-router-dom';
import simpleToast from '@/hooks/use-simple-toast';

interface AttendanceStats {
  minAttendanceRequired: number;
  overallStats: {
    totalClasses: number;
    totalPresent: number;
    attendancePercentage: number;
  };
}

const StudentAttendance = () => {
  const { token } = useStudentAuth();
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch attendance statistics on load
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${config.API_URL}/api/student/attendance/stats`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setStats(data.data);
          } else {
            throw new Error(data.message || 'Failed to fetch attendance statistics');
          }
        } else {
          throw new Error('Failed to fetch attendance statistics');
        }
      } catch (error) {
        console.error('Error fetching attendance statistics:', error);
        simpleToast({
          title: 'Error',
          description: 'Failed to fetch attendance statistics. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (token) {
      fetchStats();
    }
  }, [token]);

  const handleNavigate = (path: string) => {
    navigate(path);
  };
  
  const attendanceOptions = [
    {
      title: 'Attendance Overview',
      description: 'View your attendance statistics and records',
      icon: <BarChart className="h-8 w-8 text-primary" />,
      href: '/student/attendance/view'
    },
    {
      title: 'Attendance Calendar',
      description: 'View your attendance on a calendar',
      icon: <CalendarDays className="h-8 w-8 text-primary" />,
      href: '/student/attendance/calendar'
    }
  ];
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Attendance</h1>
        <p className="text-gray-500">View and track your attendance records</p>
      </div>
      
      {/* Attendance Summary Card */}
      {loading ? (
        <Card className="mb-6">
          <CardContent className="py-10">
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
          </CardContent>
        </Card>
      ) : stats ? (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle>Attendance Summary</CardTitle>
            <CardDescription>Your overall attendance status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="text-center p-6 bg-gray-50 rounded-lg mb-4">
                  <div className="text-4xl font-bold mb-2 text-center flex items-center justify-center">
                    {stats.overallStats.attendancePercentage}%
                    {stats.overallStats.attendancePercentage >= stats.minAttendanceRequired ? (
                      <CheckCircle2 className="ml-2 h-8 w-8 text-green-500" />
                    ) : (
                      <AlertCircle className="ml-2 h-8 w-8 text-red-500" />
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    Overall Attendance
                  </div>
                </div>
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Current Attendance</span>
                    <span className={stats.overallStats.attendancePercentage >= stats.minAttendanceRequired ? 'text-green-600' : 'text-red-600'}>
                      {stats.overallStats.attendancePercentage}%
                    </span>
                  </div>
                  <Progress 
                    value={stats.overallStats.attendancePercentage} 
                    className="h-2"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Required Attendance</span>
                    <span>{stats.minAttendanceRequired}%</span>
                  </div>
                  <Progress 
                    value={stats.minAttendanceRequired} 
                    className="h-2 bg-blue-100"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-green-50 p-3 rounded-md text-center">
                    <Clock className="h-5 w-5 mx-auto text-green-600 mb-1" />
                    <div className="text-lg font-semibold text-green-600">{stats.overallStats.totalPresent}</div>
                    <div className="text-xs text-gray-500">Classes Attended</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-md text-center">
                    <Book className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                    <div className="text-lg font-semibold text-blue-600">{stats.overallStats.totalClasses}</div>
                    <div className="text-xs text-gray-500">Total Classes</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end pt-0">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleNavigate('/student/attendance/view')}
            >
              View Details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardContent className="py-10">
            <div className="text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-amber-500 mb-3" />
              <h3 className="text-lg font-medium mb-1">No Attendance Data Available</h3>
              <p className="text-sm text-gray-500">
                Your attendance data couldn't be loaded or is not available yet.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Attendance Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {attendanceOptions.map((option, index) => (
          <Card 
            key={index} 
            className="group hover:bg-slate-50 cursor-pointer transition-colors" 
            onClick={() => handleNavigate(option.href)}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">{option.title}</CardTitle>
              {option.icon}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">{option.description}</p>
              <div className="mt-4 flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-sm font-medium">View</span>
                <ArrowRight className="ml-1 h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Attendance Policies */}
      <Card className="bg-slate-50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Attendance Policies
          </CardTitle>
          <CardDescription>Important rules regarding attendance</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-6 space-y-2 text-sm text-gray-600">
            <li>
              <span className="font-medium">Minimum Attendance Requirement:</span> You must maintain at least 75% attendance in all subjects to be eligible for examinations.
            </li>
            <li>
              <span className="font-medium">Late Arrivals:</span> If you arrive after the scheduled class start time but within the grace period, you will be marked as "Late".
            </li>
            <li>
              <span className="font-medium">Excused Absences:</span> Absences may be excused with proper documentation (e.g., medical certificate) submitted to your faculty.
            </li>
            <li>
              <span className="font-medium">Attendance Warnings:</span> You will receive warnings when your attendance drops below 80% in any subject.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAttendance; 