import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFacultyAuth } from '@/contexts/FacultyAuthContext';
import { Loader2, FileDown, Download, ArrowLeft, AlertTriangle } from 'lucide-react';
import config from '@/config';
import simpleToast from '@/hooks/use-simple-toast';
import { useNavigate } from 'react-router-dom';

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

interface Report {
  reportUrl: string;
  reportType: string;
  generatedAt: string;
}

const AttendanceReports = () => {
  const { token } = useFacultyAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  // Form states
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportType, setReportType] = useState('summary');
  
  // Generated report
  const [report, setReport] = useState<Report | null>(null);
  
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
  
  // Fetch students when class changes
  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      return;
    }
    
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${config.API_URL}/api/faculty/students?classId=${selectedClass}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setStudents(data.students || []);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        simpleToast({
          title: 'Error',
          description: 'Failed to fetch students. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudents();
  }, [selectedClass, token]);
  
  // Generate report
  const handleGenerateReport = async () => {
    if (!selectedClass) {
      simpleToast({
        title: 'Missing Information',
        description: 'Please select a class',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setGenerating(true);
      
      let url = `${config.API_URL}/api/faculty/attendance/generate-report?classId=${selectedClass}&startDate=${startDate}&endDate=${endDate}&reportType=${reportType}`;
      
      if (selectedSubject) {
        url += `&subjectId=${selectedSubject}`;
      }
      
      if (reportType === 'student' && selectedStudent) {
        url += `&studentId=${selectedStudent}`;
      }
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          setReport(data.data);
          simpleToast({
            title: 'Success',
            description: 'Report generated successfully',
            variant: 'default'
          });
        } else {
          throw new Error(data.message || 'Failed to generate report');
        }
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      simpleToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
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
      <div className="flex items-center gap-2 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/faculty/attendance')}
          className="text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Attendance
        </Button>
      </div>
    
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Attendance Reports</h1>
        <p className="text-gray-500">Generate and download attendance reports in PDF format</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle>Generate PDF Report</CardTitle>
            <CardDescription>Set parameters for the attendance report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="class">Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass} required>
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
              <Label htmlFor="report-type">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="report-type">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary Report</SelectItem>
                  <SelectItem value="daily">Daily Report</SelectItem>
                  <SelectItem value="student">Student Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {reportType === 'student' && (
              <div>
                <Label htmlFor="student">Student</Label>
                <Select 
                  value={selectedStudent} 
                  onValueChange={setSelectedStudent}
                  disabled={!selectedClass || students.length === 0}
                >
                  <SelectTrigger id="student">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map(student => (
                      <SelectItem key={student._id} value={student._id}>
                        {student.name} ({student.registerNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label htmlFor="subject">Subject (Optional)</Label>
              <Select 
                value={selectedSubject} 
                onValueChange={setSelectedSubject}
                disabled={!selectedClass || subjects.length === 0}
              >
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
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleGenerateReport}
              disabled={generating || !selectedClass || (reportType === 'student' && !selectedStudent)}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>Generate PDF Report</>
              )}
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>Generated Reports</CardTitle>
            <CardDescription>Download your generated PDF reports</CardDescription>
          </CardHeader>
          <CardContent>
            {report ? (
              <div className="border rounded-md p-6 flex flex-col items-center justify-center space-y-4">
                <FileDown className="h-16 w-16 text-primary" />
                <h3 className="text-xl font-bold">Report Generated</h3>
                <p className="text-gray-500 text-center">
                  Your attendance report has been generated and is ready for download
                </p>
                <Button
                  onClick={() => window.open(`${config.API_URL}${report.reportUrl}`, '_blank')}
                  className="mt-4"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Report
                </Button>
              </div>
            ) : (
              <div className="border rounded-md p-6 flex flex-col items-center justify-center space-y-4 h-[300px]">
                <p className="text-gray-500 text-center">
                  No reports generated yet. Select parameters and click "Generate PDF Report" to create a new report.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AttendanceReports; 