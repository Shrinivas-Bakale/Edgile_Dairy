import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useFacultyAuth } from '@/contexts/FacultyAuthContext';
import { Loader2, Check, AlertTriangle, Save, CalendarClock, Calendar } from 'lucide-react';
import simpleToast from '@/hooks/use-simple-toast';
import config from '@/config';
import { Switch } from '@/components/ui/switch';

const AttendanceStatus = {
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
  LATE: "LATE",
  EXCUSED: "EXCUSED"
};

interface Student {
  _id: string;
  name: string;
  registerNumber: string;
  [key: string]: any;
}

interface AttendanceRecord {
  status: string;
  reason: string;
  recordId?: string;
}

interface TimetableSlot {
  subjectId: string;
  classId: string;
  slotNumber: number | string;
  time?: string;
  subjectName?: string;
  subjectCode?: string;
  className?: string;
  type?: string;
  facultyId?: string;
  [key: string]: any;
}

const MarkAttendance = () => {
  const { token } = useFacultyAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<{ [studentId: string]: AttendanceRecord }>({});
  const [timetable, setTimetable] = useState(null);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayReason, setHolidayReason] = useState('');
  const [useTimetable, setUseTimetable] = useState(true);
  
  // Form states
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState('1');
  const [markAll, setMarkAll] = useState('');
  
  // Modified flag
  const [hasModified, setHasModified] = useState(false);
  
  // Success message
  const [successMessage, setSuccessMessage] = useState('');
  
  // Error message
  const [errorMessage, setErrorMessage] = useState('');
  
  // Holiday error message
  const [holidayError, setHolidayError] = useState('');
  
  // Add state for full timetable data
  const [fullTimetableData, setFullTimetableData] = useState<any>(null);
  
  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        setErrorMessage('');
        const response = await fetch(`${config.API_URL}/api/faculty/classes`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (response.status === 404) {
          setErrorMessage('Class list feature is not available. Please contact admin.');
          return;
        }
        if (response.ok) {
          const data = await response.json();
          setClasses(data.classes || []);
        } else {
          setErrorMessage('Failed to fetch classes. Backend may not be set up.');
        }
      } catch (error) {
        setErrorMessage('Failed to fetch classes. Please try again.');
        console.error('Error fetching classes:', error);
        simpleToast({
          title: 'Error',
          description: 'Failed to fetch classes. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, [token]);
  
  // Fetch timetable for the selected date
  useEffect(() => {
    const fetchTimetable = async () => {
      if (!selectedDate) return;
        setLoading(true);
      try {
        // Get day of week from selectedDate
        const date = new Date(selectedDate);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = dayNames[date.getDay()];
        
        // Skip Sunday as it's typically a holiday
        if (dayOfWeek === 'Sunday') {
          setIsHoliday(true);
          setHolidayReason('Sunday');
          setTimetable(null);
          setTimetableSlots([]);
          setFullTimetableData(null);
          setLoading(false);
          return;
        }
        
        // Check if the date is a holiday
        let isHoliday = false;
        let holidayReason = '';
        try {
        const holidayResponse = await fetch(`${config.API_URL}/api/faculty/holidays?date=${selectedDate}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
          if (holidayResponse.status === 404) {
            // Not a holiday, do nothing
          } else if (holidayResponse.ok) {
          const holidayData = await holidayResponse.json();
          if (holidayData.isHoliday) {
              isHoliday = true;
              holidayReason = holidayData.reason || 'Holiday';
            }
          }
        } catch (err) {
          // Ignore holiday API errors
        }
        setIsHoliday(isHoliday);
        setHolidayReason(holidayReason);
        if (isHoliday) {
            setTimetable(null);
            setTimetableSlots([]);
          setFullTimetableData(null);
          setLoading(false);
            return;
        }
        
        // Always fetch the timetable data
        const response = await fetch(`${config.API_URL}/api/faculty/timetable?day=${dayOfWeek}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (response.status === 404) {
          // No timetable for this day, do not show error
          setTimetable(null);
          setTimetableSlots([]);
          setFullTimetableData(null);
          setLoading(false);
          return;
        }
        if (response.ok) {
          const data = await response.json();
          setTimetable(data.timetable || null);
          setFullTimetableData(data); // Store the full timetable API response
          // Extract slots that are assigned to this faculty
          if (data.timetable && data.timetable.days) {
            const day = data.timetable.days.find((d: any) => d.day === dayOfWeek);
            if (day) {
              const slots = day.slots.filter((slot: TimetableSlot) =>
                slot.type !== 'interval' && 
                slot.type !== 'lunch' && 
                slot.facultyId === data.facultyId
              );
              setTimetableSlots(slots);
              if (slots.length > 0 && useTimetable) {
                const firstSlot = slots[0];
                setSelectedClass(firstSlot.classId || '');
                setSelectedSubject(firstSlot.subjectId || '');
                setSelectedSlot(String(firstSlot.slotNumber) || '1');
              }
            } else {
              setTimetableSlots([]);
            }
          } else {
            setTimetableSlots([]);
          }
        } else {
          setErrorMessage('Failed to fetch timetable.');
          setTimetable(null);
          setTimetableSlots([]);
          setFullTimetableData(null);
        }
      } catch (error) {
        console.error('Error fetching timetable:', error);
        setErrorMessage('Failed to fetch timetable. You can still mark attendance manually.');
        setTimetable(null);
        setTimetableSlots([]);
        setFullTimetableData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchTimetable();
  }, [selectedDate, token, useTimetable]);
  
  // Fetch subjects when class changes
  useEffect(() => {
    if (!selectedClass) return;
    
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${config.API_URL}/api/faculty/subjects?classId=${selectedClass}`, {
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
  }, [selectedClass, token]);
  
  // Fetch attendance records when parameters change
  useEffect(() => {
    // Reset records when parameters change
    setAttendanceRecords({});
    setHasModified(false);
    setSuccessMessage('');
    
    if (!selectedClass || !selectedSubject || !selectedDate || !selectedSlot) return;
    
    const fetchAttendanceData = async () => {
      try {
        setLoading(true);
        
        // First fetch students
        const studentsResponse = await fetch(`${config.API_URL}/api/faculty/students?classId=${selectedClass}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!studentsResponse.ok) {
          throw new Error('Failed to fetch students');
        }
        
        const studentsData = await studentsResponse.json();
        setStudents(studentsData.students || []);
        
        // Then fetch existing attendance records
        const attendanceResponse = await fetch(
          `${config.API_URL}/api/faculty/attendance/class?classId=${selectedClass}&subjectId=${selectedSubject}&date=${selectedDate}&slotNumber=${selectedSlot}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        if (attendanceResponse.ok) {
          const attendanceData = await attendanceResponse.json();
          
          // Convert array to object for easier updates
          const records: { [key: string]: any } = {};
          if (attendanceData.data && attendanceData.data.records) {
            attendanceData.data.records.forEach((record: any) => {
              records[record.student._id] = {
                status: record.status,
                reason: record.reason || '',
                recordId: record._id
              };
            });
          }
          
          setAttendanceRecords(records);
        }
      } catch (error) {
        console.error('Error fetching attendance data:', error);
        simpleToast({
          title: 'Error',
          description: 'Failed to fetch attendance data. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchAttendanceData();
  }, [selectedClass, selectedSubject, selectedDate, selectedSlot, token]);
  
  // Handle timetable slot selection
  const handleTimetableSlotSelect = (slot: TimetableSlot) => {
    if (!slot) return;
    
    setSelectedClass(slot.classId || '');
    setSelectedSubject(slot.subjectId || '');
    setSelectedSlot(String(slot.slotNumber) || '1');
  };
  
  // Handle toggle between timetable and manual selection
  const handleToggleTimetable = (checked: boolean) => {
    setUseTimetable(checked);
    
    // If switching to timetable mode and we have timetable slots, select the first one
    if (checked && timetableSlots.length > 0) {
      handleTimetableSlotSelect(timetableSlots[0]);
    } else {
      // If switching to manual, clear selections
      setSelectedClass('');
      setSelectedSubject('');
      setSelectedSlot('1');
    }
  };
  
  // Handle marking a class as cancelled (e.g., due to faculty absence)
  const handleMarkClassCancelled = async () => {
    if (!selectedClass || !selectedSubject || !selectedDate || !selectedSlot) {
      simpleToast({
        title: 'Missing Information',
        description: 'Please select a class, subject, date and slot',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setSaving(true);
      
      const response = await fetch(`${config.API_URL}/api/faculty/attendance/cancel-class`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          classId: selectedClass,
          subjectId: selectedSubject,
          date: selectedDate,
          slotNumber: selectedSlot,
          reason: 'Class cancelled by faculty'
        })
      });
      
      if (response.ok) {
        simpleToast({
          title: 'Success',
          description: 'Class has been marked as cancelled.',
          variant: 'default'
        });
        
        setSuccessMessage('Class has been marked as cancelled.');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to mark class as cancelled');
      }
    } catch (error) {
      console.error('Error marking class as cancelled:', error);
      simpleToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to mark class as cancelled',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Handle status change for a student
  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status: status
      }
    }));
    setHasModified(true);
  };
  
  // Handle reason change for a student
  const handleReasonChange = (studentId: string, reason: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        reason: reason
      }
    }));
    setHasModified(true);
  };
  
  // Mark all students with the same status
  const handleMarkAll = (status: string) => {
    const updatedRecords: { [studentId: string]: AttendanceRecord } = {};
    
    students.forEach((student) => {
      updatedRecords[student._id] = {
        ...attendanceRecords[student._id],
        status: status
      };
    });
    
    setAttendanceRecords(updatedRecords);
    setHasModified(true);
    setMarkAll('');
  };
  
  // Save attendance records
  const handleSaveAttendance = async () => {
    if (!selectedClass || !selectedSubject || !selectedDate || !selectedSlot) {
      simpleToast({
        title: 'Missing Information',
        description: 'Please select a class, subject, date and slot',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setSaving(true);
      
      // Prepare data for API
      const attendanceData = students.map((student) => {
        const record = attendanceRecords[student._id] || {
          status: AttendanceStatus.ABSENT,
          reason: ''
        };
        
        return {
          student: student._id,
          status: record.status,
          reason: record.reason || '',
          recordId: record.recordId // Include existing record ID if available
        };
      });
      
      const response = await fetch(`${config.API_URL}/api/faculty/attendance/mark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          class: selectedClass,
          subject: selectedSubject,
          date: selectedDate,
          slotNumber: parseInt(selectedSlot),
          attendanceRecords: attendanceData
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          simpleToast({
            title: 'Success',
            description: 'Attendance records saved successfully',
            variant: 'default'
          });
          setSuccessMessage('Attendance saved successfully!');
          setHasModified(false);
        } else {
          throw new Error(data.message || 'Failed to save attendance');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save attendance');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      simpleToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save attendance. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Get status color class
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return 'text-green-600 border-green-200 bg-green-50';
      case AttendanceStatus.ABSENT:
        return 'text-red-600 border-red-200 bg-red-50';
      case AttendanceStatus.LATE:
        return 'text-amber-600 border-amber-200 bg-amber-50';
      case AttendanceStatus.EXCUSED:
        return 'text-blue-600 border-blue-200 bg-blue-50';
      default:
        return '';
    }
  };
  
  // In the holiday API call, handle 404 as a non-error (feature not configured)
  const fetchHoliday = async (date: string) => {
    try {
      setHolidayError('');
      const response = await fetch(`${config.API_URL}/api/faculty/holidays?date=${date}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.status === 404) {
        // Treat as not a holiday, do not show error
        setIsHoliday(false);
        setHolidayReason('');
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setIsHoliday(data.isHoliday);
        setHolidayReason(data.reason || '');
      } else {
        setHolidayError('Failed to check holiday.');
      }
    } catch (error) {
      setHolidayError('Failed to check holiday.');
    }
  };
  
  // Render the component
  return (
    <div className="container mx-auto py-6">
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded flex items-center">
          <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
          <span className="text-red-700">{errorMessage}</span>
        </div>
      )}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Mark Attendance</h1>
        <p className="text-gray-500">Record attendance for your classes</p>
      </div>
      
      {/* Date Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Date</CardTitle>
          <CardDescription>Choose the date for which to mark attendance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input 
                type="date" 
                id="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            {/* Timetable Toggle */}
            <div className="flex items-center space-x-2 pt-4">
              <Switch 
                id="use-timetable" 
                checked={useTimetable}
                onCheckedChange={handleToggleTimetable}
              />
              <Label htmlFor="use-timetable" className="font-medium">
                Use Today's Timetable
              </Label>
              <span className="text-sm text-muted-foreground ml-2">
                {useTimetable ? 'Using scheduled classes' : 'Manual selection'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {isHoliday ? (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800 flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Holiday - No Classes
            </CardTitle>
            <CardDescription className="text-amber-700">
              {holidayReason}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-amber-700">There are no classes scheduled for this date as it is a holiday.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {useTimetable && timetableSlots.length > 0 ? (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Today's Schedule</CardTitle>
                <CardDescription>Select a class from your timetable</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {timetableSlots.map((slot: TimetableSlot, index: number) => (
                    <div 
                      key={index}
                      onClick={() => handleTimetableSlotSelect(slot)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedSubject === slot.subjectId && selectedClass === slot.classId 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium">{slot.time}</div>
                        <div className="text-sm text-gray-500">Slot {slot.slotNumber}</div>
                      </div>
                      <div className="mb-1">
                        {slot.subjectName || 'Unknown Subject'} ({slot.subjectCode || 'N/A'})
                      </div>
                      <div className="text-sm text-gray-600">
                        {slot.className || 'Unknown Class'}
                      </div>
                      {selectedSubject === slot.subjectId && selectedClass === slot.classId && (
                        <div className="mt-2 text-sm text-primary">Selected</div>
                      )}
                    </div>
                  ))}
                </div>
                
                {timetableSlots.length === 0 && (
                  <div className="text-center py-8">
                    <CalendarClock className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-600 mb-1">No Classes Scheduled</h3>
                    <p className="text-gray-500 mb-4">You don't have any classes scheduled for this day.</p>
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        onClick={() => setUseTimetable(false)}
                      >
                        Switch to Manual Selection
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : useTimetable && timetableSlots.length === 0 ? (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Today's Schedule</CardTitle>
                <CardDescription>No classes found in your timetable for today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CalendarClock className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <h3 className="text-lg font-medium text-gray-600 mb-1">No Classes Scheduled</h3>
                  <p className="text-gray-500 mb-4">You don't have any classes scheduled for this day.</p>
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setUseTimetable(false)}
                    >
                      Switch to Manual Selection
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
          
          {/* Class and Subject Selection (only show if not using timetable or no timetable available) */}
          {(!useTimetable || timetableSlots.length === 0) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Class & Subject</CardTitle>
                <CardDescription>Select the class and subject for attendance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="class">Class</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger id="class">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((classItem) => (
                          <SelectItem key={classItem._id} value={classItem._id}>
                            {classItem.name || `${classItem.year}-${classItem.division} (Sem ${classItem.semester})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Select 
                      value={selectedSubject} 
                      onValueChange={setSelectedSubject}
                      disabled={!selectedClass}
                    >
                      <SelectTrigger id="subject">
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject._id} value={subject._id}>
                            {subject.name} ({subject.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="slot">Time Slot</Label>
                    <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                      <SelectTrigger id="slot">
                        <SelectValue placeholder="Select slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((slot) => (
                          <SelectItem key={slot} value={slot.toString()}>
                            Slot {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Class Cancellation Option */}
          {(selectedClass && selectedSubject && !loading) && (
            <Card className="mb-6 border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-700">Class Status</CardTitle>
                <CardDescription>Mark if the class was conducted or cancelled</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    onClick={handleMarkClassCancelled}
                    disabled={saving}
                    className="border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Mark Class as Cancelled
                  </Button>
                  <span className="text-sm text-gray-500">
                    This will record that the class did not take place
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Continue with the existing attendance marking UI */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : students.length > 0 ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Student Attendance</CardTitle>
                  <CardDescription>
                    {students.length} students in {
                      classes.find(c => c._id === selectedClass)?.name
                    } for {
                      subjects.find(s => s._id === selectedSubject)?.name
                    } on {format(new Date(selectedDate), 'dd MMM yyyy')} (Slot {selectedSlot})
                  </CardDescription>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Label htmlFor="mark-all" className="text-sm">Mark All:</Label>
                  <Select value={markAll} onValueChange={(value) => {
                    setMarkAll(value);
                    handleMarkAll(value);
                  }}>
                    <SelectTrigger id="mark-all" className="w-[140px]">
                      <SelectValue placeholder="Choose status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AttendanceStatus.PRESENT}>Present</SelectItem>
                      <SelectItem value={AttendanceStatus.ABSENT}>Absent</SelectItem>
                      <SelectItem value={AttendanceStatus.LATE}>Late</SelectItem>
                      <SelectItem value={AttendanceStatus.EXCUSED}>Excused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              
              <CardContent>
                {successMessage && (
                  <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-md flex items-center">
                    <Check className="h-5 w-5 mr-2 text-green-500" />
                    <span>{successMessage}</span>
                  </div>
                )}
                
                {hasModified && (
                  <div className="mb-4 p-3 bg-amber-50 text-amber-800 rounded-md flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                    <span>You have unsaved changes. Click "Save Attendance" to save your changes.</span>
                  </div>
                )}
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">#</th>
                        <th className="text-left p-2">Register No</th>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Reason (For Absent/Excused)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student, index) => (
                        <tr key={student._id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{index + 1}</td>
                          <td className="p-2">{student.registerNumber}</td>
                          <td className="p-2">{student.name}</td>
                          <td className="p-2">
                            <RadioGroup
                              value={attendanceRecords[student._id]?.status || AttendanceStatus.ABSENT}
                              onValueChange={(value) => handleStatusChange(student._id, value)}
                              className="flex space-x-2"
                            >
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem 
                                  value={AttendanceStatus.PRESENT} 
                                  id={`present-${student._id}`} 
                                  className="text-green-600"
                                />
                                <Label 
                                  htmlFor={`present-${student._id}`}
                                  className="text-xs text-green-600"
                                >
                                  Present
                                </Label>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem 
                                  value={AttendanceStatus.ABSENT} 
                                  id={`absent-${student._id}`}
                                  className="text-red-600"
                                />
                                <Label 
                                  htmlFor={`absent-${student._id}`}
                                  className="text-xs text-red-600"
                                >
                                  Absent
                                </Label>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem 
                                  value={AttendanceStatus.LATE} 
                                  id={`late-${student._id}`}
                                  className="text-amber-600"
                                />
                                <Label 
                                  htmlFor={`late-${student._id}`}
                                  className="text-xs text-amber-600"
                                >
                                  Late
                                </Label>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <RadioGroupItem 
                                  value={AttendanceStatus.EXCUSED} 
                                  id={`excused-${student._id}`}
                                  className="text-blue-600"
                                />
                                <Label 
                                  htmlFor={`excused-${student._id}`}
                                  className="text-xs text-blue-600"
                                >
                                  Excused
                                </Label>
                              </div>
                            </RadioGroup>
                          </td>
                          <td className="p-2">
                            {(attendanceRecords[student._id]?.status === AttendanceStatus.ABSENT || 
                              attendanceRecords[student._id]?.status === AttendanceStatus.EXCUSED) && (
                              <Input
                                value={attendanceRecords[student._id]?.reason || ''}
                                onChange={(e) => handleReasonChange(student._id, e.target.value)}
                                placeholder="Enter reason"
                                className={getStatusColorClass(attendanceRecords[student._id]?.status)}
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <Button 
                    onClick={handleSaveAttendance} 
                    disabled={saving || !hasModified}
                    className="w-full md:w-auto"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Attendance
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : selectedClass && selectedSubject && selectedDate && selectedSlot ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <div className="text-center">
                  <p className="text-lg text-gray-500">No students found for the selected class.</p>
                  <p className="text-sm text-gray-400 mt-2">Please select a different class or check if students are enrolled.</p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
};

export default MarkAttendance; 