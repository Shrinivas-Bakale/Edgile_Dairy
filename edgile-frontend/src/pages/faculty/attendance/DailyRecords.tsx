import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFacultyAuth } from '@/contexts/FacultyAuthContext';
import { Loader2, FileDown, AlertTriangle, Search, Edit } from 'lucide-react';
import config from '@/config';

// Define interfaces for type safety
interface Class {
  _id: string;
  name?: string;
  year?: string;
  division?: string;
  semester?: number;
}

interface Subject {
  _id: string;
  name: string;
  code: string;
}

interface Student {
  _id: string;
  name: string;
  registerNumber: string;
}

interface Faculty {
  _id: string;
  name: string;
}

interface AttendanceRecord {
  student: Student;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  reason?: string;
}

interface Slot {
  slotNumber: number;
  subject: Subject;
  faculty: Faculty;
  attendance: AttendanceRecord[];
}

interface DailyRecordsData {
  classId: string;
  className: string;
  date: string;
  slots: Slot[];
}

const DailyAttendanceRecords = () => {
  const { token } = useFacultyAuth();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSubject, setSelectedSubject] = useState('');
  const [records, setRecords] = useState<DailyRecordsData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  
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
        
        if (response.ok) {
          const data = await response.json();
          setClasses(data.classes || []);
        } else {
          setErrorMessage('Failed to fetch classes. Backend may not be set up.');
        }
      } catch (error) {
        setErrorMessage('Failed to fetch classes. Please try again.');
        console.error('Error fetching classes:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchClasses();
  }, [token]);
  
  // Fetch subjects when class changes
  useEffect(() => {
    if (!selectedClass) {
      setSubjects([]);
      return;
    }
    
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
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubjects();
  }, [selectedClass, token]);
  
  // Handle search
  const handleSearch = async () => {
    if (!selectedClass || !selectedDate) {
      alert('Please select a class and date');
      return;
    }
    
    try {
      setLoading(true);
      
      let url = `${config.API_URL}/api/faculty/attendance/daily?classId=${selectedClass}&date=${selectedDate}`;
      
      if (selectedSubject) {
        url += `&subjectId=${selectedSubject}`;
      }
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecords(data.data);
      } else {
        console.error('Failed to fetch records');
      }
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), 'dd MMM yyyy');
  };
  
  // Navigate to edit page
  const handleEditAttendance = (slotNumber: number, subjectId: string): void => {
    // Redirect to mark attendance page with pre-filled values
    window.location.href = `/faculty/attendance/mark?classId=${selectedClass}&date=${selectedDate}&subjectId=${subjectId}&slotNumber=${slotNumber}`;
  };
  
  return (
    <div className="container mx-auto py-6">
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded flex items-center">
          <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
          <span className="text-red-700">{errorMessage}</span>
        </div>
      )}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Daily Attendance Records</h1>
        <p className="text-gray-500">View and manage attendance records for specific dates</p>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Parameters</CardTitle>
          <CardDescription>Select class, date and optional subject</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="class">Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger id="class">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls._id} value={cls._id}>
                      {cls.name || `${cls.year}-${cls.division} (Sem ${cls.semester})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            
            <div>
              <Label htmlFor="subject">Subject (Optional)</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedClass}>
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
          
          <Button onClick={handleSearch} className="w-full md:w-auto">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search Records
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : records ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                Attendance Records for {formatDate(selectedDate)}
              </CardTitle>
              <CardDescription>
                {records.className || 'Class'} | {records.slots?.length || 0} slots
              </CardDescription>
            </CardHeader>
            <CardContent>
              {records.slots && records.slots.length > 0 ? (
                records.slots.map((slot) => (
                  <div key={slot.slotNumber} className="mb-6 border rounded-md p-4">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-medium">
                          Slot {slot.slotNumber}: {slot.subject?.name} ({slot.subject?.code})
                        </h3>
                        <p className="text-sm text-gray-500">
                          Marked by: {slot.faculty?.name || 'Unknown'}
                        </p>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditAttendance(slot.slotNumber, slot.subject?._id)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Student</th>
                            <th className="text-left p-2">Register No.</th>
                            <th className="text-left p-2">Status</th>
                            <th className="text-left p-2">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {slot.attendance.map((record) => (
                            <tr key={record.student?._id} className="border-b hover:bg-gray-50">
                              <td className="p-2">{record.student?.name}</td>
                              <td className="p-2">{record.student?.registerNumber}</td>
                              <td className="p-2">
                                <span 
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    record.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                                    record.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                                    record.status === 'LATE' ? 'bg-amber-100 text-amber-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {record.status}
                                </span>
                              </td>
                              <td className="p-2">{record.reason || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="mt-4 text-sm">
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div className="p-2 bg-green-50 rounded-md">
                          <p className="text-green-800 font-medium">Present</p>
                          <p className="text-lg">{slot.attendance.filter(r => r.status === 'PRESENT').length}</p>
                        </div>
                        <div className="p-2 bg-red-50 rounded-md">
                          <p className="text-red-800 font-medium">Absent</p>
                          <p className="text-lg">{slot.attendance.filter(r => r.status === 'ABSENT').length}</p>
                        </div>
                        <div className="p-2 bg-amber-50 rounded-md">
                          <p className="text-amber-800 font-medium">Late</p>
                          <p className="text-lg">{slot.attendance.filter(r => r.status === 'LATE').length}</p>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-md">
                          <p className="text-blue-800 font-medium">Excused</p>
                          <p className="text-lg">{slot.attendance.filter(r => r.status === 'EXCUSED').length}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-6 border rounded-md">
                  <AlertTriangle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                  <p className="text-gray-500">No attendance records found for this date and class.</p>
                  <p className="text-sm text-gray-400 mt-2">Try selecting a different date or class, or mark attendance first.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center p-6 border rounded-md">
          <p className="text-gray-500">Select a class and date to view attendance records.</p>
        </div>
      )}
    </div>
  );
};

export default DailyAttendanceRecords; 