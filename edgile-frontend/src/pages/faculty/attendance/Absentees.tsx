import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useFacultyAuth } from '@/contexts/FacultyAuthContext';
import { Loader2, AlertTriangle, Search, Mail, Download } from 'lucide-react';
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

interface SubjectData {
  subject: {
    id: string;
    name: string;
    code: string;
  };
  totalClasses: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendancePercentage: number;
  lastAttendance: string | null;
}

interface StudentData {
  student: {
    id: string;
    name: string;
    registerNumber: string;
    email?: string;
  };
  overallAttendance: number;
  consecutiveAbsences: number;
  subjectAttendance: SubjectData[];
}

interface AbsenteesData {
  classId: string;
  className: string;
  subjectId?: string;
  threshold: number;
  studentsAtRisk: number;
  totalStudents: number;
  students: StudentData[];
}

const AbsenteesTracking = () => {
  const { token } = useFacultyAuth();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [threshold, setThreshold] = useState('75');
  const [absentees, setAbsentees] = useState<AbsenteesData | null>(null);
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
  
  // Handle find absentees
  const handleFindAbsentees = async () => {
    if (!selectedClass) {
      alert('Please select a class');
      return;
    }
    
    try {
      setLoading(true);
      
      let url = `${config.API_URL}/api/faculty/attendance/absentees?classId=${selectedClass}&threshold=${threshold}`;
      
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
        setAbsentees(data.data);
      } else {
        console.error('Failed to fetch absentees');
      }
    } catch (error) {
      console.error('Error finding absentees:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle generate report
  const handleGenerateReport = async (studentId: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(`${config.API_URL}/api/faculty/attendance/generate-report?studentId=${studentId}&classId=${selectedClass}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data.reportUrl) {
          window.open(`${config.API_URL}${data.data.reportUrl}`, '_blank');
        } else {
          alert('Failed to generate report');
        }
      } else {
        console.error('Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle contact student/parent
  const handleContactStudent = (student: { name: string; email?: string }) => {
    if (student && student.email) {
      const subject = `Attendance Alert - ${selectedClass ? classes.find(c => c._id === selectedClass)?.name : 'Class'}`;
      const body = `Dear ${student.name},\n\nThis is to inform you that your attendance is below the required threshold of ${threshold}%. Please ensure regular attendance to avoid academic penalties.\n\nRegards,\nFaculty`;
      
      window.location.href = `mailto:${student.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
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
        <h1 className="text-3xl font-bold">Attendance Alerts</h1>
        <p className="text-gray-500">Track students with low attendance and frequent absences</p>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Find Students at Risk</CardTitle>
          <CardDescription>Identify students with attendance below threshold</CardDescription>
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
              <Label htmlFor="threshold">Attendance Threshold (%)</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="threshold"
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  min="0"
                  max="100"
                />
                <Button onClick={handleFindAbsentees} className="whitespace-nowrap">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Find
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : absentees ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>
                  Students Below {absentees.threshold}% Attendance
                </CardTitle>
                <CardDescription>
                  {absentees.studentsAtRisk} of {absentees.totalStudents} students found below threshold
                </CardDescription>
              </div>
              
              <div className="rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-sm font-medium">
                {Math.round((absentees.studentsAtRisk / absentees.totalStudents) * 100)}% At Risk
              </div>
            </CardHeader>
            <CardContent>
              {absentees.students && absentees.students.length > 0 ? (
                <div className="space-y-6">
                  {absentees.students.map((student) => (
                    <div key={student.student?.id} className="border rounded-md p-4">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                        <div>
                          <h3 className="text-lg font-medium">{student.student?.name}</h3>
                          <p className="text-sm text-gray-500">
                            Register No: {student.student?.registerNumber}
                            {student.student?.email && ` | ${student.student.email}`}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-2 md:mt-0">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleContactStudent(student.student)}
                            disabled={!student.student?.email}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Contact
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleGenerateReport(student.student?.id)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Report
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">Overall Attendance</span>
                          <span className={`text-sm font-medium ${
                            student.overallAttendance < absentees.threshold ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {student.overallAttendance}%
                          </span>
                        </div>
                        <Progress 
                          value={student.overallAttendance} 
                          className={`h-2 ${student.overallAttendance < absentees.threshold ? 'bg-red-100' : ''}`}
                        />
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Subject Breakdown</h4>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b text-xs">
                                <th className="text-left p-2">Subject</th>
                                <th className="text-center p-2">Attendance</th>
                                <th className="text-right p-2">Present/Total</th>
                                <th className="text-right p-2">Absent</th>
                                <th className="text-right p-2">Last Attendance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {student.subjectAttendance.map((subject) => (
                                <tr key={subject.subject?.id} className="border-b hover:bg-gray-50 text-sm">
                                  <td className="p-2">{subject.subject?.name}</td>
                                  <td className="p-2">
                                    <div className="flex items-center justify-center">
                                      <div className="w-24">
                                        <Progress 
                                          value={subject.attendancePercentage} 
                                          className={`h-2 ${subject.attendancePercentage < absentees.threshold ? 'bg-red-100' : ''}`}
                                        />
                                      </div>
                                      <span className={`text-xs ml-2 ${
                                        subject.attendancePercentage < absentees.threshold ? 'text-red-600' : 'text-green-600'
                                      }`}>
                                        {subject.attendancePercentage}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-2 text-right">{subject.present}/{subject.totalClasses}</td>
                                  <td className="p-2 text-right text-red-600">{subject.absent}</td>
                                  <td className="p-2 text-right">{subject.lastAttendance ? format(new Date(subject.lastAttendance), 'dd MMM yyyy') : 'N/A'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      
                      {student.consecutiveAbsences > 2 && (
                        <div className="mt-4 p-2 bg-red-50 rounded-md flex items-center text-sm">
                          <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                          <span className="text-red-800">
                            Alert: {student.consecutiveAbsences} consecutive absences detected
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 border rounded-md">
                  <p className="text-gray-500">
                    No students found with attendance below {absentees.threshold}%.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center p-6 border rounded-md">
          <AlertTriangle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
          <p className="text-gray-500">Select a class and threshold to find students with low attendance.</p>
        </div>
      )}
    </div>
  );
};

export default AbsenteesTracking; 