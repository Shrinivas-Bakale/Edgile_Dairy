import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { ChevronLeft } from 'lucide-react';
import config from '@/config';
import simpleToast from '@/hooks/use-simple-toast';

interface AttendanceRecord {
  _id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  reason?: string;
  subjectId: {
    _id: string;
    name: string;
    code: string;
  };
  slotNumber: number;
  facultyId?: {
    _id: string;
    name: string;
  };
}

interface Subject {
  _id: string;
  name: string;
  code: string;
}

const CalendarView = () => {
  const navigate = useNavigate();
  const { token } = useStudentAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [calendarDates, setCalendarDates] = useState<Record<string, string>>({});
  const [selectedDayRecords, setSelectedDayRecords] = useState<AttendanceRecord[]>([]);

  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${config.API_URL}/api/student/subjects`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSubjects(data.subjects || []);
        }
      } catch (error) {
        console.error('Error fetching subjects:', error);
        simpleToast({
          title: 'Error',
          description: 'Failed to fetch subjects. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubjects();
  }, [token]);

  // Fetch attendance records
  useEffect(() => {
    const fetchAttendanceRecords = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams();
        
        if (selectedSubject) {
          queryParams.append('subjectId', selectedSubject);
        }
        
        // Get the current month's first and last date
        const currentDate = new Date();
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        queryParams.append('startDate', format(firstDay, 'yyyy-MM-dd'));
        queryParams.append('endDate', format(lastDay, 'yyyy-MM-dd'));
        
        const response = await fetch(`${config.API_URL}/api/student/attendance?${queryParams}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const records = data.data?.records || [];
          setAttendanceRecords(records);
          
          // Process records for calendar
          const calendarData: Record<string, string> = {};
          records.forEach((record: AttendanceRecord) => {
            // Format date to yyyy-MM-dd
            const dateKey = record.date.split('T')[0];
            // Store status for calendar display
            calendarData[dateKey] = record.status;
          });
          
          setCalendarDates(calendarData);
          
          // If a date is already selected, update the selected day records
          if (date) {
            updateSelectedDayRecords(date, records);
          }
        }
      } catch (error) {
        console.error('Error fetching attendance records:', error);
        simpleToast({
          title: 'Error',
          description: 'Failed to fetch attendance records. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchAttendanceRecords();
  }, [selectedSubject, token, date]);

  // Handle date selection
  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate) {
      updateSelectedDayRecords(selectedDate, attendanceRecords);
    } else {
      setSelectedDayRecords([]);
    }
  };

  // Update records for selected day
  const updateSelectedDayRecords = (selectedDate: Date, records: AttendanceRecord[]) => {
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    const filteredRecords = records.filter(record => 
      record.date.split('T')[0] === selectedDateStr
    );
    setSelectedDayRecords(filteredRecords);
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    const statusColors = {
      'PRESENT': 'bg-green-500',
      'ABSENT': 'bg-red-500', 
      'LATE': 'bg-amber-500',
      'EXCUSED': 'bg-blue-500'
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-500'}>
        {status === 'PRESENT' ? 'Present' :
         status === 'ABSENT' ? 'Absent' :
         status === 'LATE' ? 'Late' :
         status === 'EXCUSED' ? 'Excused' : 'Unknown'}
      </Badge>
    );
  };

  // Custom modifiers for the calendar to display attendance status
  const modifiers = {
    present: Object.entries(calendarDates)
      .filter(([_, status]) => status === 'PRESENT')
      .map(([date]) => new Date(date)),
    absent: Object.entries(calendarDates)
      .filter(([_, status]) => status === 'ABSENT')
      .map(([date]) => new Date(date)),
    late: Object.entries(calendarDates)
      .filter(([_, status]) => status === 'LATE')
      .map(([date]) => new Date(date)),
    excused: Object.entries(calendarDates)
      .filter(([_, status]) => status === 'EXCUSED')
      .map(([date]) => new Date(date))
  };

  // Custom modifier styles for attendance status
  const modifiersStyles = {
    present: {
      backgroundColor: "rgb(220, 252, 231)",
      color: "rgb(22, 101, 52)"
    },
    absent: {
      backgroundColor: "rgb(254, 226, 226)",
      color: "rgb(185, 28, 28)"
    },
    late: {
      backgroundColor: "rgb(254, 243, 199)",
      color: "rgb(180, 83, 9)"
    },
    excused: {
      backgroundColor: "rgb(219, 234, 254)",
      color: "rgb(30, 64, 175)"
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-2 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/student/attendance')}
          className="text-gray-500 hover:text-gray-800"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Attendance
        </Button>
      </div>
    
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Attendance Calendar</h1>
        <p className="text-gray-500">View your attendance on a calendar</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Filter Options</CardTitle>
              <CardDescription>Filter calendar by subject</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger id="subject">
                      <SelectValue placeholder="All subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All subjects</SelectItem>
                      {subjects.map(subject => (
                        <SelectItem key={subject._id} value={subject._id}>
                          {subject.name} ({subject.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Legend</CardTitle>
              <CardDescription>Attendance status color codes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-200"></div>
                  <span>Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-red-200"></div>
                  <span>Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-200"></div>
                  <span>Late</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-200"></div>
                  <span>Excused</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Attendance Calendar</CardTitle>
              <CardDescription>
                {selectedSubject 
                  ? `Showing attendance for ${subjects.find(s => s._id === selectedSubject)?.name || 'selected subject'}`
                  : 'Showing attendance for all subjects'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="calendar-container">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateSelect}
                  className="rounded-md border"
                  modifiers={modifiers}
                  modifiersStyles={modifiersStyles}
                  classNames={{
                    day_today: "bg-accent text-accent-foreground",
                    day_selected: "bg-primary text-primary-foreground"
                  }}
                />
              </div>
              
              <style>
                {`
                  .calendar-container .rdp-day {
                    position: relative;
                  }
                  
                  .calendar-container .rdp-day_today {
                    font-weight: bold;
                  }
                  
                  .calendar-container .rdp-day[aria-selected="true"] {
                    background-color: var(--primary);
                    color: white;
                  }
                `}
              </style>
            </CardContent>
          </Card>
          
          {date && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>
                  Attendance for {format(date, 'dd MMMM yyyy')}
                </CardTitle>
                <CardDescription>
                  {selectedDayRecords.length > 0 
                    ? `${selectedDayRecords.length} record(s) found` 
                    : 'No attendance records for this date'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDayRecords.length > 0 ? (
                  <div className="space-y-4">
                    {selectedDayRecords.map(record => (
                      <div key={record._id} className="p-3 border rounded-md hover:bg-gray-50">
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="font-medium">
                            {record.subjectId?.name || 'Unknown Subject'} - Slot {record.slotNumber}
                          </h3>
                          {getStatusBadge(record.status)}
                        </div>
                        
                        <p className="text-sm text-gray-500">
                          Marked by: {record.facultyId?.name || 'Unknown Faculty'}
                        </p>
                        
                        {record.reason && (
                          <p className="text-sm mt-2 bg-gray-100 p-2 rounded">
                            <span className="font-medium">Reason:</span> {record.reason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    No attendance records for this date
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarView; 