import React, { useState, useEffect } from 'react';
import DashboardWrapper from '@/components/DashboardWrapper';
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
import { 
  CalendarDays, 
  Clock, 
  AlertCircle, 
  Download, 
  Star, 
  StarOff, 
  RefreshCw,
  BookOpen,
  User,
  MapPin,
  Trash,
  Edit,
  BarChart
} from 'lucide-react';
import Loading from '@/components/Loading';
import html2pdf from 'html2pdf.js';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

interface TimeSlot {
  startTime: string;
  endTime: string;
  subjectCode: string;
  facultyId: string | null;
  type: string;
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
  classTeacherId?: string;
  academicYear?: string;
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
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [facultyMembers, setFacultyMembers] = useState<{[key: string]: Faculty}>({});
  const [classroom, setClassroom] = useState<ClassroomInfo | null>(null);
  const [currentDay, setCurrentDay] = useState<string>(
    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]
  );
  const [starredTimetableId, setStarredTimetableId] = useState<string | null>(
    localStorage.getItem('starredTimetableId')
  );
  const [apiError, setApiError] = useState<string | null>(null);
  
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

  // Define standard time slots
  const timeSlots = [
    "09:00 - 10:00",
    "10:00 - 11:00",
    "11:00 - 11:15", // Interval
    "11:15 - 12:15",
    "12:15 - 13:15",
    "13:15 - 14:15", // Lunch Break
    "14:15 - 15:15",
    "15:15 - 16:15"
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Function to refresh the timetables
  const refreshTimetables = () => {
    setLoading(true);
    setApiError(null);
    fetchTimetables();
  };
  
  // Load timetable data
  useEffect(() => {
    fetchTimetables();
  }, [user, token, starredTimetableId]);
  
  const fetchTimetables = async () => {
      if (!user || !token) return;
      
      try {
        setLoading(true);
      setApiError(null);
      
      console.log('Fetching timetables from API...');
      
      // Fetch all published timetables (use the new endpoint)
      const response = await axios.get(`${config.API_URL}/api/student/timetables`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('API Response:', response.data);
      
      if (response.data?.success && Array.isArray(response.data?.data)) {
        const availableTimetables = response.data.data;
        console.log(`Found ${availableTimetables.length} timetables`);
        setTimetables(availableTimetables);
        
        // Check if there's a starred timetable and select it
        const starredTimetable = availableTimetables.find((t: Timetable) => t._id === starredTimetableId);
        
        if (starredTimetable) {
          console.log('Found starred timetable:', starredTimetable._id);
          setSelectedTimetable(starredTimetable);
          if (starredTimetable.classroomId && typeof starredTimetable.classroomId === 'string') {
            fetchClassroomDetails(starredTimetable.classroomId);
          }
        } else if (availableTimetables.length > 0) {
          // Otherwise select the first timetable
          console.log('No starred timetable found, selecting first one');
          setSelectedTimetable(availableTimetables[0]);
          if (availableTimetables[0].classroomId && typeof availableTimetables[0].classroomId === 'string') {
            fetchClassroomDetails(availableTimetables[0].classroomId);
          }
        } else {
          console.log('No timetables available');
        }
        
        // Fetch subjects for all possible year/semester combinations in timetables
        const yearSemesters = new Set<string>();
        availableTimetables.forEach((timetable: Timetable) => {
          yearSemesters.add(`${timetable.year}-${timetable.semester}`);
        });
        
        // Fetch subjects for all year-semester combinations
        Array.from(yearSemesters).forEach(yearSemester => {
          const [year, semester] = yearSemester.split('-');
          fetchSubjects(year, parseInt(semester));
        });
        
        // Extract faculty IDs from all timetables and fetch faculty details
          const facultyIds = new Set<string>();
        availableTimetables.forEach((timetable: Timetable) => {
          timetable.days.forEach((day: Day) => {
            day.slots.forEach((slot: TimeSlot) => {
              if (slot.facultyId) {
                facultyIds.add(slot.facultyId);
              }
            });
            });
          });
          
          if (facultyIds.size > 0) {
            fetchFacultyDetails(Array.from(facultyIds));
          }
        } else {
        console.log('No timetables found or invalid response format');
        showSnackbar(response.data?.message || 'No timetables found.');
        setApiError('No timetables found. The administrator may not have published any timetables yet.');
        }
      } catch (error: any) {
      console.error('Error fetching timetables:', error);
      showSnackbar('Failed to load timetables. Please try again later.');
      setApiError('Failed to load timetables: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    };
    
  // Add a new useEffect to debug API endpoints
  useEffect(() => {
    if (user && token) {
      // Log available API endpoints to help with debugging
      console.log('Available API endpoints:');
      console.log(`${config.API_URL}/api/student/timetables - Get all timetables`);
      console.log(`${config.API_URL}/api/student/classroom/:id - Get classroom details`);
      console.log(`${config.API_URL}/api/student/subjects - Get subjects`);
      console.log(`${config.API_URL}/api/student/faculty-details - Get faculty details`);
    }
  }, [user, token]);

  // Export the starred timetable ID to localStorage for dashboard access
  useEffect(() => {
    if (starredTimetableId) {
      localStorage.setItem('starredTimetableId', starredTimetableId);
      // Save additional info for dashboard quick access
      const starredTimetable = timetables.find(t => t._id === starredTimetableId);
      if (starredTimetable) {
        localStorage.setItem('starredTimetableInfo', JSON.stringify({
          id: starredTimetable._id,
          year: starredTimetable.year,
          semester: starredTimetable.semester,
          division: starredTimetable.division,
          timestamp: new Date().getTime()
        }));
      }
    } else {
      localStorage.removeItem('starredTimetableId');
      localStorage.removeItem('starredTimetableInfo');
    }
  }, [starredTimetableId, timetables]);
  
  // Improved classroom fetching with multiple fallback strategies
  const fetchClassroomDetails = async (classroomId: string) => {
    try {
      if (!classroomId || typeof classroomId !== 'string') {
        console.error('Invalid classroom ID:', classroomId);
        throw new Error('Invalid classroom ID');
      }

      console.log('Fetching classroom details for ID:', classroomId);
      
      // Try multiple endpoint formats
      const endpoints = [
        `${config.API_URL}/api/student/classroom/${classroomId}`,
        `${config.API_URL}/api/student/classrooms/${classroomId}`,
        `${config.API_URL}/api/classrooms/${classroomId}`,
        `${config.API_URL}/api/classroom/${classroomId}`
      ];
      
      let success = false;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying classroom endpoint: ${endpoint}`);
          const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data?.success && response.data?.data) {
            console.log(`Classroom data loaded from ${endpoint}:`, response.data.data);
        setClassroom(response.data.data);
            success = true;
            break;
          }
        } catch (err) {
          console.log(`Endpoint ${endpoint} failed for classroom`);
        }
      }
      
      if (!success) {
        // If specific classroom endpoint fails, try getting all classrooms
        try {
          const response = await axios.get(`${config.API_URL}/api/student/classrooms`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (response.data?.success && Array.isArray(response.data?.data)) {
            const foundClassroom = response.data.data.find((c: ClassroomInfo) => c._id === classroomId);
            if (foundClassroom) {
              console.log('Found classroom in list:', foundClassroom);
              setClassroom(foundClassroom);
              success = true;
            }
          }
        } catch (err) {
          console.log('Failed to get classroom from list');
        }
      }
      
      if (!success) {
        throw new Error('All classroom endpoint formats failed');
      }
    } catch (error) {
      console.error('Error fetching classroom details:', error);
      // Set default classroom data if fetch fails
      setClassroom({
        _id: classroomId,
        name: 'Not available',
        building: 'Unknown',
        floor: 0,
        capacity: 0
      });
    }
  };
  
  // Fetch subjects for the year and semester
  const fetchSubjects = async (year: string, semester: number) => {
    try {
      // Try multiple endpoint formats to handle potential API differences
      const endpoints = [
        // Original endpoint
        `${config.API_URL}/api/student/subjects?year=${year}&semester=${semester}`,
        // Try lowercase year
        `${config.API_URL}/api/student/subjects?year=${year.toLowerCase()}&semester=${semester}`,
        // Try with different parameter format
        `${config.API_URL}/api/student/subjects/${year}/${semester}`,
        // Try the faculty endpoint as fallback
        `${config.API_URL}/api/faculty/subjects?year=${year}&semester=${semester}`
      ];
      
      console.log('Attempting to fetch subjects using multiple endpoint formats');
      
      let success = false;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data?.success && response.data?.data) {
            console.log(`Subjects successfully fetched from: ${endpoint}`);
            setSubjects(prev => {
              const newSubjects = [...prev];
              response.data.data.forEach((subject: Subject) => {
                if (!newSubjects.find(s => s._id === subject._id)) {
                  newSubjects.push(subject);
                }
              });
              return newSubjects;
            });
            success = true;
            break;
          }
        } catch (err) {
          console.log(`Endpoint ${endpoint} failed, trying next format`);
        }
      }
      
      if (!success) {
        throw new Error('All subject endpoint formats failed');
      }
    } catch (error: any) {
      console.error('Error fetching subjects:', error);
      
      // Fallback: If the API call fails, add some default subjects so the UI isn't empty
      if (subjects.length === 0) {
        console.log('Using fallback subjects data');
        const defaultSubjects = [
          { _id: 'cs123', name: 'Computer Science', subjectCode: 'CS123', type: 'Core' },
          { _id: 'ds123', name: 'Data Structures', subjectCode: 'DS123', type: 'Core' },
          { _id: 'ma123', name: 'Mathematics', subjectCode: 'MA123', type: 'Core' },
          { _id: 'ph123', name: 'Physics', subjectCode: 'PH123', type: 'Core' },
          { _id: 'en123', name: 'English', subjectCode: 'EN123', type: 'Elective' },
        ];
        
        setSubjects(prev => [...prev, ...defaultSubjects]);
      }
    }
  };
  
  // Fetch faculty details
  const fetchFacultyDetails = async (facultyIds: string[]) => {
    try {
      // Implement retry logic with exponential backoff to handle rate limiting
      let retries = 0;
      const maxRetries = 3;
      const baseDelay = 1000; // 1 second
      
      const doFetch = async () => {
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
            console.log("Faculty data fetched successfully:", Object.keys(facultyMap).length, "faculty members");
          }
        } catch (error: any) {
          if (error.response?.status === 429 && retries < maxRetries) {
            retries++;
            const delay = baseDelay * Math.pow(2, retries);
            console.log(`Rate limited. Retrying in ${delay}ms (attempt ${retries}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return doFetch();
          }
          throw error;
        }
      };
      
      await doFetch();
    } catch (error) {
      console.error('Error fetching faculty details:', error);
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
  
  const getFacultyName = (id: string | null) => {
    if (!id) return '-';
    return facultyMembers[id]?.name || '-';
  };
  
  const handleDayChange = (day: string) => {
    setCurrentDay(day);
  };
  
  const handleTimetableChange = (timetableId: string) => {
    const selected = timetables.find(t => t._id === timetableId);
    if (selected) {
      setSelectedTimetable(selected);
      if (selected.classroomId && typeof selected.classroomId === 'string') {
        fetchClassroomDetails(selected.classroomId);
      }
    }
  };
  
  const toggleStarTimetable = (timetableId: string) => {
    if (starredTimetableId === timetableId) {
      // Unstar
      setStarredTimetableId(null);
      localStorage.removeItem('starredTimetableId');
      showSnackbar('Timetable unstarred');
    } else {
      // Star
      setStarredTimetableId(timetableId);
      localStorage.setItem('starredTimetableId', timetableId);
      showSnackbar('Timetable starred for quick access');
    }
  };
  
  const downloadTimetablePDF = () => {
    if (!selectedTimetable) return;
    
    const element = document.getElementById('timetable-container');
    if (!element) return;
    
    const pdfOptions = {
      margin: 10,
      filename: `timetable-${selectedTimetable.year}-semester-${selectedTimetable.semester}-${selectedTimetable.division}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    
    try {
      html2pdf()
        .set(pdfOptions)
        .from(element)
        .save();
      showSnackbar('Timetable download started');
    } catch (error) {
      console.error('PDF generation error:', error);
      showSnackbar('Failed to download timetable');
    }
  };

  // Check if a time slot is an interval or lunch break
  const isSpecialTimeSlot = (timeSlot: string): 'interval' | 'lunch' | null => {
    if (timeSlot === "11:00 - 11:15") return 'interval';
    if (timeSlot === "13:15 - 14:15") return 'lunch';
    return null;
  };

  // Get class information for a specific day and time slot
  const getClassInfo = (day: string, timeSlot: string) => {
    if (!selectedTimetable) return null;
    
    const dayData = selectedTimetable.days.find(d => d.day === day);
    if (!dayData) return null;
    
    // Parse the timeSlot (format "09:00 - 10:00")
    const [startTime, endTime] = timeSlot.split(' - ');
    
    // Find the matching slot
    const slot = dayData.slots.find(
      s => s.startTime === startTime && s.endTime === endTime
    );
    
    return slot;
  };

  // Sort timetables with starred one first
  const sortedTimetables = [...timetables].sort((a, b) => {
    // Starred timetable first
    if (a._id === starredTimetableId) return -1;
    if (b._id === starredTimetableId) return 1;
    
    // Then sort by year and semester
    if (a.year !== b.year) return a.year.localeCompare(b.year);
    return a.semester - b.semester;
  });
  
  // Get current time slot based on current time
  const getCurrentTimeSlot = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // Find the time slot that contains the current time
    for (const slot of timeSlots) {
      const [start, end] = slot.split(' - ');
      if (timeStr >= start && timeStr <= end) {
        return slot;
      }
    }
    
    return null;
  };

  // Highlight current day and time slot
  const isCurrentTimeSlot = (day: string, timeSlot: string) => {
    const today = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
    const currentSlot = getCurrentTimeSlot();
    
    return day === today && timeSlot === currentSlot;
  };

  // Render the available timetables section with modern design
  const renderTimetablesSection = () => {
  return (
      <div className="mb-8">
        <h2 className="text-xl font-bold text-blue-700 mb-4">Your Timetables</h2>
        <div className="flex flex-wrap gap-4">
          {sortedTimetables.map(timetable => (
            <div
              key={timetable._id}
              className={`relative flex-1 min-w-[300px] max-w-[400px] bg-white rounded-lg overflow-hidden transition-all cursor-pointer ${
                selectedTimetable?._id === timetable._id ? 'border-2 border-blue-400 shadow-md' : 'border border-gray-200 shadow-sm hover:shadow-md'
              }`}
              onClick={() => handleTimetableChange(timetable._id)}
            >
              {timetable._id === starredTimetableId && (
                <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400"></div>
              )}
              <div className="p-6">
                <h3 className="font-semibold text-lg text-blue-700">
                  {timetable.year} Year, Div {timetable.division}
                </h3>
                <div className="flex items-center text-sm mt-2">
                  <span className="mr-2 font-medium">Semester: {timetable.semester}</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                    published
                  </span>
      </div>
                <div className="mt-4 flex flex-col gap-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Class Teacher: Not Assigned
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    Classroom: {classroom?.name && timetable._id === selectedTimetable?._id ? classroom.name : "Not assigned"}
                  </div>
                </div>
                {timetable._id === starredTimetableId && (
                  <div className="mt-3 text-xs text-yellow-600 flex items-center">
                    <Star className="w-3 h-3 mr-1 fill-yellow-400" /> 
                    Available on your dashboard
                  </div>
                )}
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStarTimetable(timetable._id);
                }}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                aria-label={starredTimetableId === timetable._id ? "Unstar timetable" : "Star timetable"}
              >
                {timetable._id === starredTimetableId ? (
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ) : (
                  <StarOff className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
            ))}
          </div>
      </div>
    );
  };

  // Render the timetable grid with modern design
  const renderTimetableGrid = () => {
    if (!selectedTimetable) return null;
    
    const today = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
    const currentTimeSlot = getCurrentTimeSlot();
    
    return (
      <div id="timetable-container" className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-blue-700">
                Timetable for {selectedTimetable.year} Year, Sem {selectedTimetable.semester}, Div {selectedTimetable.division}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {selectedTimetable?.academicYear || academicYear} Academic Year
                {classroom && classroom.name !== 'Not available' && (
                  <span className="ml-2">• Room: {classroom.name}</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-1"
                onClick={refreshTimetables}
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-1"
                onClick={downloadTimetablePDF}
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </div>
        </div>
        
        <div className="p-4 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-200 px-4 py-3 text-left font-medium bg-gray-50 text-gray-600 w-24">Day</th>
                {timeSlots.map(slot => (
                  <th 
                    key={slot} 
                    className={`border border-gray-200 px-4 py-3 text-center font-medium ${
                      slot === currentTimeSlot ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'
                    }`}
                  >
                    {slot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map(day => (
                <tr key={day} className={`hover:bg-gray-50 transition-colors ${day === today ? 'bg-blue-50/20' : ''}`}>
                  <td className={`border border-gray-200 px-4 py-3 font-medium ${day === today ? 'text-blue-700 bg-blue-50/30' : 'text-gray-700'}`}>
                    {day}
                  </td>
                  {timeSlots.map(timeSlot => {
                    // Check if this is a special time slot
                    const specialType = isSpecialTimeSlot(timeSlot);
                    const isCurrent = day === today && timeSlot === currentTimeSlot;
                    
                    if (specialType === 'interval') {
                      return (
                        <td 
                          key={`${day}-${timeSlot}`} 
                          className={`border border-gray-200 text-center bg-pink-50 text-pink-700 font-medium py-4 ${
                            isCurrent ? 'ring-2 ring-inset ring-pink-300' : ''
                          }`}
                        >
                          Interval
                        </td>
                      );
                    }
                    
                    if (specialType === 'lunch') {
                      return (
                        <td 
                          key={`${day}-${timeSlot}`} 
                          className={`border border-gray-200 text-center bg-blue-50 text-blue-700 font-medium py-4 ${
                            isCurrent ? 'ring-2 ring-inset ring-blue-300' : ''
                          }`}
                        >
                          Lunch Break
                        </td>
                      );
                    }
                    
                    // Regular class slot
                    const classInfo = getClassInfo(day, timeSlot);
                    
                    if (!classInfo) {
                      return (
                        <td 
                          key={`${day}-${timeSlot}`} 
                          className={`border border-gray-200 px-3 py-4 text-center text-gray-500 ${
                            isCurrent ? 'ring-2 ring-inset ring-blue-300 bg-blue-50/30' : ''
                          }`}
                        >
                          -
                        </td>
                      );
                    }
                    
                    const subjectCode = classInfo.subjectCode;
                    const facultyName = getFacultyName(classInfo.facultyId);
                    
                    return (
                      <td 
                        key={`${day}-${timeSlot}`} 
                        className={`border border-gray-200 px-3 py-4 text-center ${
                          isCurrent ? 'ring-2 ring-inset ring-blue-400 bg-blue-50/30' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <span className="font-medium text-blue-700">{subjectCode}</span>
                          <span className="text-xs text-gray-500 mt-1">{facultyName}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
                      </div>
                        </div>
    );
  };
  
  if (loading) {
    return (
      <DashboardWrapper>
        <div className="container mx-auto p-6">
          <h1 className="text-2xl font-bold mb-6">Class Timetable</h1>
          <div className="flex items-center justify-center p-12">
            <Loading />
                      </div>
                  </div>
      </DashboardWrapper>
    );
  }
  
  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-8">
        {apiError ? (
          <Alert className="mb-6">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription className="ml-2">
              {apiError}
            </AlertDescription>
          </Alert>
        ) : timetables.length === 0 ? (
          <Alert className="mb-6">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription className="ml-2">
              No timetables available. Please contact your administrator.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {renderTimetablesSection()}
            {renderTimetableGrid()}
        </>
      )}
    </div>
    </DashboardWrapper>
  );
};

export default StudentTimetable;