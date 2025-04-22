import React, { useState, useEffect } from 'react';
import withDashboard from '@/components/withDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import axios from 'axios';
import config from '@/config';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  Badge,
  Skeleton
} from '@/components/ui';
import { CalendarDays, Clock, AlertCircle } from 'lucide-react';
import Loading from '@/components/Loading';

interface TimeSlot {
  startTime: string;
  endTime: string;
  subjectCode: string;
  facultyId: string | null;
}

interface Day {
  day: string;
  slots: TimeSlot[];
}

interface Faculty {
  _id: string;
  name: string;
  email: string;
}

interface Subject {
  _id: string;
  name: string;
  subjectCode: string;
  type: string;
}

interface Timetable {
  _id: string;
  year: string;
  semester: number;
  division: string;
  classroomId: string;
  days: Day[];
  status: string;
}

interface ClassroomInfo {
  _id: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
}

const StudentTimetable = () => {
  const { user, token } = useAuth();
  const { showSnackbar } = useSnackbar();
  
  const [loading, setLoading] = useState(true);
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [facultyMembers, setFacultyMembers] = useState<{[key: string]: Faculty}>({});
  const [classroom, setClassroom] = useState<ClassroomInfo | null>(null);
  const [currentDay, setCurrentDay] = useState<string>(
    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]
  );
  
  // Get current academic year
  const getCurrentAcademicYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // If we're in the second half of the year (July onwards), it's year/year+1
    // Otherwise it's year-1/year
    if (month >= 6) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  };
  
  const academicYear = getCurrentAcademicYear();
  
  // Load timetable data
  useEffect(() => {
    const fetchTimetable = async () => {
      if (!user || !token) return;
      
      try {
        setLoading(true);
        
        // First, we need user details to get year, semester, division
        if (!user.year || !user.semester || !user.division) {
          showSnackbar('Your profile is incomplete. Contact the administrator.', 'error');
          setLoading(false);
          return;
        }
        
        // Fetch the published timetable
        const response = await axios.get(`${config.API_URL}/api/student/timetable`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          params: {
            year: user.year,
            semester: user.semester,
            division: user.division,
            academicYear
          }
        });
        
        if (response.data?.success && response.data?.data) {
          setTimetable(response.data.data);
          
          // Fetch classroom details
          if (response.data.data.classroomId) {
            fetchClassroomDetails(response.data.data.classroomId);
          }
          
          // Fetch subjects for this year and semester
          fetchSubjects(user.year, user.semester);
          
          // Extract faculty IDs from timetable and fetch faculty details
          const facultyIds = new Set<string>();
          response.data.data.days.forEach((day: Day) => {
            day.slots.forEach((slot: TimeSlot) => {
              if (slot.facultyId) {
                facultyIds.add(slot.facultyId);
              }
            });
          });
          
          if (facultyIds.size > 0) {
            fetchFacultyDetails(Array.from(facultyIds));
          }
        } else {
          showSnackbar('No published timetable found for your class.', 'warning');
        }
      } catch (error: any) {
        console.error('Error fetching timetable:', error);
        showSnackbar('Failed to load timetable. Please try again later.', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTimetable();
  }, [user, token]);
  
  // Fetch classroom details
  const fetchClassroomDetails = async (classroomId: string) => {
    try {
      const response = await axios.get(`${config.API_URL}/api/student/classroom/${classroomId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data?.success && response.data?.data) {
        setClassroom(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching classroom details:', error);
      // Non-critical, so no user notification
    }
  };
  
  // Fetch subjects for the year and semester
  const fetchSubjects = async (year: string, semester: number) => {
    try {
      const response = await axios.get(`${config.API_URL}/api/student/subjects`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          year,
          semester
        }
      });
      
      if (response.data?.success && response.data?.data) {
        setSubjects(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      // Non-critical, so no user notification
    }
  };
  
  // Fetch faculty details
  const fetchFacultyDetails = async (facultyIds: string[]) => {
    try {
      const response = await axios.get(`${config.API_URL}/api/student/faculty-details`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          ids: facultyIds.join(',')
        }
      });
      
      if (response.data?.success && response.data?.data) {
        const facultyMap: {[key: string]: Faculty} = {};
        response.data.data.forEach((faculty: Faculty) => {
          facultyMap[faculty._id] = faculty;
        });
        setFacultyMembers(facultyMap);
      }
    } catch (error) {
      console.error('Error fetching faculty details:', error);
      // Non-critical, so no user notification
    }
  };
  
  // Helper to get subject name from code
  const getSubjectName = (code: string) => {
    const subject = subjects.find(s => s.subjectCode === code);
    return subject ? subject.name : code;
  };
  
  // Helper to get subject color based on type
  const getSubjectColor = (code: string) => {
    const subject = subjects.find(s => s.subjectCode === code);
    if (!subject) return 'bg-gray-100 text-gray-800';
    
    switch(subject.type) {
      case 'Core':
        return 'bg-blue-100 text-blue-800';
      case 'Lab':
        return 'bg-green-100 text-green-800';
      case 'Elective':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Helper to get faculty name
  const getFacultyName = (id: string | null) => {
    if (!id) return 'Not assigned';
    return facultyMembers[id]?.name || 'Unknown';
  };
  
  // Change current day view
  const handleDayChange = (day: string) => {
    setCurrentDay(day);
  };
  
  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Timetable</h1>
        <p className="text-gray-600 dark:text-gray-300">View your weekly class schedule</p>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-64 w-full bg-gray-200 dark:bg-gray-700" />
        </div>
      ) : !timetable ? (
        <Alert className="mb-4 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700">
          <AlertCircle className="h-4 w-4 text-yellow-700 dark:text-yellow-300" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            No published timetable found for your class. Please check back later or contact your administrator.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Classroom info */}
          {classroom && (
            <Card className="mb-6 bg-white dark:bg-gray-800">
              <CardContent className="pt-4 pb-2">
                <div className="flex flex-wrap justify-between items-center">
                  <div>
                    <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100">Room: {classroom.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Building: {classroom.building}, Floor: {classroom.floor}, Capacity: {classroom.capacity} seats
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CalendarDays className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{academicYear}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Day selector */}
          <div className="flex overflow-x-auto space-x-2 mb-4 pb-2">
            {timetable.days.map((day, index) => (
              <button
                key={day.day}
                onClick={() => handleDayChange(day.day)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors duration-200 ${ 
                  currentDay === day.day 
                    ? 'bg-primary text-primary-foreground font-medium' 
                    : 'bg-muted dark:bg-gray-700 text-muted-foreground dark:text-gray-300 hover:bg-muted/80 dark:hover:bg-gray-600'
                }`}
              >
                {day.day}
              </button>
            ))}
          </div>
          
          {/* Timetable for the selected day */}
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex justify-between items-center text-gray-900 dark:text-gray-100">
                <span>{currentDay}'s Schedule</span>
                <Badge variant="outline" className="ml-2 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300">
                  {user?.year || 'N/A'} Year • Semester {user?.semester || 'N/A'} • Division {user?.division || 'N/A'}
                </Badge>
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                {timetable.status === 'published' ? 'Official published timetable' : 'Draft timetable (subject to change)'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timetable.days.find(d => d.day === currentDay)?.slots.map((slot, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg border ${ 
                      slot.subjectCode 
                        ? 'border-gray-200 dark:border-gray-700' 
                        : 'border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                    }`}
                  >
                    {slot.subjectCode ? (
                      <div className="flex flex-col md:flex-row md:items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              {slot.startTime} - {slot.endTime}
                            </span>
                          </div>
                          <div className="mb-2">
                            <Badge className={`${getSubjectColor(slot.subjectCode)} dark:bg-opacity-80`}>
                              {slot.subjectCode}
                            </Badge>
                            <h3 className="text-lg font-medium mt-1 text-gray-900 dark:text-gray-100">
                              {getSubjectName(slot.subjectCode)}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Faculty: {getFacultyName(slot.facultyId)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>{slot.startTime} - {slot.endTime}</span>
                        </div>
                        <span className="text-sm italic">Free Period</span>
                      </div>
                    )}
                  </div>
                ))}
                
                {(!timetable.days.find(d => d.day === currentDay) || 
                  timetable.days.find(d => d.day === currentDay)?.slots.length === 0) && (
                  <div className="py-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">No classes scheduled for {currentDay}.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default withDashboard(StudentTimetable); 