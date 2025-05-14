import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useFacultyAuth } from '@/contexts/FacultyAuthContext';
import { Loader2, BarChart2, AlertTriangle, PieChart } from 'lucide-react';
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
  id: string;
  name: string;
  registerNumber: string;
}

interface StudentAttendance {
  student: Student;
  totalClasses: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
}

interface OverallStats {
  totalRecords: number;
  totalClasses: number;
  averageAttendance: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalExcused: number;
}

interface StatsData {
  classId: string;
  className: string;
  subjectId?: string;
  subjectName?: string;
  dateRange: {
    start: string;
    end: string;
  };
  minAttendanceRequired: number;
  studentsAtRisk: number;
  overallStats: OverallStats;
  students: StudentAttendance[];
}

// Define attendance status colors
const STATUS_COLORS = {
  PRESENT: 'bg-green-500',
  ABSENT: 'bg-red-500',
  LATE: 'bg-amber-500',
  EXCUSED: 'bg-blue-500'
};

const AttendanceStats = () => {
  const { token } = useFacultyAuth();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statsData, setStatsData] = useState<StatsData | null>(null);
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
  
  // Generate stats
  const generateStats = async () => {
    if (!selectedClass) {
      alert('Please select a class');
      return;
    }
    
    try {
      setLoading(true);
      
      let url = `${config.API_URL}/api/faculty/attendance/stats?classId=${selectedClass}&startDate=${startDate}&endDate=${endDate}`;
      
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
        setStatsData(data.data);
      } else {
        console.error('Failed to fetch statistics');
      }
    } catch (error) {
      console.error('Error generating statistics:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Render student attendance table
  const renderStudentTable = () => {
    if (!statsData || !statsData.students || statsData.students.length === 0) {
      return (
        <div className="text-center p-6 border rounded-md">
          <AlertTriangle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
          <p className="text-gray-500">No student attendance data found.</p>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Student</th>
              <th className="text-left p-2">Register No.</th>
              <th className="text-left p-2">Attendance Rate</th>
              <th className="text-right p-2">Present</th>
              <th className="text-right p-2">Absent</th>
              <th className="text-right p-2">Late</th>
              <th className="text-right p-2">Excused</th>
              <th className="text-right p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {statsData.students.map((student) => (
              <tr key={student.student?.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{student.student?.name}</td>
                <td className="p-2">{student.student?.registerNumber}</td>
                <td className="p-2 w-48">
                  <div className="flex items-center">
                    <Progress 
                      value={student.attendanceRate} 
                      className={`h-2 mr-2 ${student.attendanceRate < statsData.minAttendanceRequired ? 'bg-red-200' : ''}`}
                    />
                    <span className={`text-sm font-medium ${
                      student.attendanceRate < statsData.minAttendanceRequired ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {student.attendanceRate}%
                    </span>
                  </div>
                </td>
                <td className="p-2 text-right text-green-600">{student.present}</td>
                <td className="p-2 text-right text-red-600">{student.absent}</td>
                <td className="p-2 text-right text-amber-600">{student.late}</td>
                <td className="p-2 text-right text-blue-600">{student.excused}</td>
                <td className="p-2 text-right font-medium">{student.totalClasses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
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
        <h1 className="text-3xl font-bold">Attendance Statistics</h1>
        <p className="text-gray-500">Analyze attendance patterns and identify trends</p>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Generate Statistics</CardTitle>
          <CardDescription>Select parameters to analyze attendance data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
            
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>
          
          <Button onClick={generateStats} className="w-full md:w-auto">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <BarChart2 className="mr-2 h-4 w-4" />
                Generate Statistics
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : statsData ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                Overall Statistics {selectedSubject && statsData.subjectName ? `- ${statsData.subjectName}` : ''}
              </CardTitle>
              <CardDescription>
                {statsData.className} | {statsData.dateRange?.start} to {statsData.dateRange?.end}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Attendance Overview</h3>
                  
                  <div className="flex items-center space-x-4">
                    <div className="bg-green-100 p-4 rounded-md flex-1 text-center">
                      <p className="text-sm text-gray-500">Average Attendance</p>
                      <p className="text-2xl font-bold text-green-700">{statsData.overallStats?.averageAttendance}%</p>
                    </div>
                    
                    <div className="bg-blue-100 p-4 rounded-md flex-1 text-center">
                      <p className="text-sm text-gray-500">Required</p>
                      <p className="text-2xl font-bold text-blue-700">{statsData.minAttendanceRequired}%</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 text-center text-sm">
                    <div className="p-2 bg-green-50 rounded-md">
                      <div className="flex justify-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 mt-1 mr-1" />
                        <p>Present</p>
                      </div>
                      <p className="text-lg text-green-700">{statsData.overallStats?.totalPresent}</p>
                    </div>
                    <div className="p-2 bg-red-50 rounded-md">
                      <div className="flex justify-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 mt-1 mr-1" />
                        <p>Absent</p>
                      </div>
                      <p className="text-lg text-red-700">{statsData.overallStats?.totalAbsent}</p>
                    </div>
                    <div className="p-2 bg-amber-50 rounded-md">
                      <div className="flex justify-center">
                        <div className="w-3 h-3 rounded-full bg-amber-500 mt-1 mr-1" />
                        <p>Late</p>
                      </div>
                      <p className="text-lg text-amber-700">{statsData.overallStats?.totalLate}</p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-md">
                      <div className="flex justify-center">
                        <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 mr-1" />
                        <p>Excused</p>
                      </div>
                      <p className="text-lg text-blue-700">{statsData.overallStats?.totalExcused}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Attendance Distribution</h3>
                  
                  <div className="h-8 w-full flex rounded-md overflow-hidden mb-2">
                    {statsData.overallStats?.totalPresent > 0 && (
                      <div 
                        className="bg-green-500" 
                        style={{ width: `${(statsData.overallStats.totalPresent / statsData.overallStats.totalRecords) * 100}%` }}
                      />
                    )}
                    {statsData.overallStats?.totalLate > 0 && (
                      <div 
                        className="bg-amber-500" 
                        style={{ width: `${(statsData.overallStats.totalLate / statsData.overallStats.totalRecords) * 100}%` }}
                      />
                    )}
                    {statsData.overallStats?.totalExcused > 0 && (
                      <div 
                        className="bg-blue-500" 
                        style={{ width: `${(statsData.overallStats.totalExcused / statsData.overallStats.totalRecords) * 100}%` }}
                      />
                    )}
                    {statsData.overallStats?.totalAbsent > 0 && (
                      <div 
                        className="bg-red-500" 
                        style={{ width: `${(statsData.overallStats.totalAbsent / statsData.overallStats.totalRecords) * 100}%` }}
                      />
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    <p>Total Records: {statsData.overallStats?.totalRecords}</p>
                    <p>Total Classes: {statsData.overallStats?.totalClasses}</p>
                    <p>Students: {statsData.students?.length}</p>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Students below required attendance: {statsData.studentsAtRisk} of {statsData.students?.length}</h4>
                    <Progress 
                      value={(statsData.studentsAtRisk / statsData.students?.length) * 100} 
                      className="h-2 bg-red-100"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Student Attendance Details</CardTitle>
              <CardDescription>
                Individual attendance records for all students
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderStudentTable()}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center p-6 border rounded-md">
          <p className="text-gray-500">Select parameters and generate statistics to view attendance analysis.</p>
        </div>
      )}
    </div>
  );
};

export default AttendanceStats; 