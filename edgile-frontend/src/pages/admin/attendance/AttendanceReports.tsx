import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Loader2, Download, FileDown, AlertTriangle } from 'lucide-react';
import config from '@/config';

const AttendanceReports = () => {
  const { token } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [lowAttendanceData, setLowAttendanceData] = useState(null);
  
  // Form states
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportType, setReportType] = useState('summary');
  const [threshold, setThreshold] = useState('75');
  
  // Generated report
  const [report, setReport] = useState(null);
  
  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${config.API_URL}/api/admin/classes`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setClasses(data.classes || []);
        } else {
          console.error('Failed to fetch classes');
        }
      } catch (error) {
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
        const response = await fetch(`${config.API_URL}/api/admin/subjects?classId=${selectedClass}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSubjects(data.subjects || []);
        } else {
          console.error('Failed to fetch subjects');
        }
      } catch (error) {
        console.error('Error fetching subjects:', error);
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
        const response = await fetch(`${config.API_URL}/api/admin/students?classId=${selectedClass}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setStudents(data.students || []);
        } else {
          console.error('Failed to fetch students');
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudents();
  }, [selectedClass, token]);
  
  // Fetch attendance reports
  const fetchAttendanceReports = async () => {
    try {
      setLoading(true);
      
      let url = `${config.API_URL}/api/admin/attendance/reports?startDate=${startDate}&endDate=${endDate}`;
      
      if (selectedClass) {
        url += `&classId=${selectedClass}`;
      }
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReportData(data.data);
        } else {
          console.error('Failed to fetch reports:', data.message);
        }
      } else {
        console.error('Failed to fetch reports');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch low attendance students
  const fetchLowAttendanceStudents = async () => {
    try {
      setLoading(true);
      
      let url = `${config.API_URL}/api/admin/attendance/low-attendance?threshold=${threshold}`;
      
      if (selectedClass) {
        url += `&classId=${selectedClass}`;
      }
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLowAttendanceData(data.data);
        } else {
          console.error('Failed to fetch low attendance data:', data.message);
        }
      } else {
        console.error('Failed to fetch low attendance data');
      }
    } catch (error) {
      console.error('Error fetching low attendance data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Generate report
  const handleGenerateReport = async () => {
    if (!selectedClass) {
      alert('Please select a class');
      return;
    }
    
    try {
      setGenerating(true);
      
      let url = `${config.API_URL}/api/admin/attendance/generate-report?classId=${selectedClass}&startDate=${startDate}&endDate=${endDate}&reportType=${reportType}`;
      
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
          alert('Report generated successfully');
        } else {
          throw new Error(data.message || 'Failed to generate report');
        }
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Attendance Reports & Analytics</h1>
        <p className="text-gray-500">Generate reports, view statistics, and identify students with attendance issues</p>
      </div>
      
      <Tabs defaultValue="reports">
        <TabsList className="mb-4">
          <TabsTrigger value="reports">Attendance Reports</TabsTrigger>
          <TabsTrigger value="low-attendance">Low Attendance</TabsTrigger>
          <TabsTrigger value="generate">Generate PDF Report</TabsTrigger>
        </TabsList>
        
        <TabsContent value="reports">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Reports</CardTitle>
                <CardDescription>
                  View attendance statistics for classes and subjects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Label htmlFor="report-class">Class</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger id="report-class">
                        <SelectValue placeholder="Select class (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All classes</SelectItem>
                        {classes.map(cls => (
                          <SelectItem key={cls._id} value={cls._id}>
                            {cls.name || `${cls.year}-${cls.division} (Sem ${cls.semester})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="w-full md:w-48">
                    <Label htmlFor="report-start-date">Start Date</Label>
                    <Input
                      id="report-start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  
                  <div className="w-full md:w-48">
                    <Label htmlFor="report-end-date">End Date</Label>
                    <Input
                      id="report-end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                    />
                  </div>
                  
                  <div className="w-full md:w-auto self-end">
                    <Button onClick={fetchAttendanceReports} disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>Generate Report</>
                      )}
                    </Button>
                  </div>
                </div>
                
                {reportData ? (
                  <div className="space-y-6">
                    <div className="border-b pb-2">
                      <h3 className="text-lg font-medium">
                        Attendance Report for {reportData.dateRange.start} to {reportData.dateRange.end}
                      </h3>
                    </div>
                    
                    {reportData.classes.map((cls) => (
                      <div key={cls.id} className="border rounded-md p-4">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h3 className="text-lg font-medium">{cls.name}</h3>
                            <p className="text-sm text-gray-500">
                              Year {cls.year}, Semester {cls.semester}, Division {cls.division}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              Overall Attendance: {cls.attendanceRate}%
                            </div>
                            <div className="text-xs text-gray-500">
                              {cls.totalStudents} students, {cls.totalClasses} classes
                            </div>
                          </div>
                        </div>
                        
                        <h4 className="text-md font-medium mb-2">Subject Breakdown</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2">Subject</th>
                                <th className="text-left p-2">Code</th>
                                <th className="text-right p-2">Present</th>
                                <th className="text-right p-2">Absent</th>
                                <th className="text-right p-2">Late</th>
                                <th className="text-right p-2">Excused</th>
                                <th className="text-right p-2">Total Classes</th>
                                <th className="text-right p-2">Attendance %</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cls.subjects.map((subject) => (
                                <tr key={subject.id} className="border-b hover:bg-gray-50">
                                  <td className="p-2">{subject.name}</td>
                                  <td className="p-2">{subject.code}</td>
                                  <td className="p-2 text-right text-green-600">{subject.present}</td>
                                  <td className="p-2 text-right text-red-600">{subject.absent}</td>
                                  <td className="p-2 text-right text-amber-600">{subject.late}</td>
                                  <td className="p-2 text-right text-blue-600">{subject.excused}</td>
                                  <td className="p-2 text-right">{subject.totalClasses}</td>
                                  <td className="p-2 text-right font-medium">{subject.attendanceRate}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !loading && (
                  <div className="text-center p-6 border rounded-md">
                    <p className="text-gray-500">
                      Select parameters and click "Generate Report" to view attendance statistics.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="low-attendance">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Students with Low Attendance</CardTitle>
                <CardDescription>
                  Identify students who need attention due to low attendance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Label htmlFor="low-attendance-class">Class</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger id="low-attendance-class">
                        <SelectValue placeholder="Select class (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All classes</SelectItem>
                        {classes.map(cls => (
                          <SelectItem key={cls._id} value={cls._id}>
                            {cls.name || `${cls.year}-${cls.division} (Sem ${cls.semester})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="w-full md:w-48">
                    <Label htmlFor="threshold">Threshold (%)</Label>
                    <Input
                      id="threshold"
                      type="number"
                      value={threshold}
                      onChange={(e) => setThreshold(e.target.value)}
                      min="0"
                      max="100"
                    />
                  </div>
                  
                  <div className="w-full md:w-auto self-end">
                    <Button onClick={fetchLowAttendanceStudents} disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>Find Students</>
                      )}
                    </Button>
                  </div>
                </div>
                
                {lowAttendanceData ? (
                  <div className="space-y-6">
                    <div className="border-b pb-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                        Students Below {lowAttendanceData.threshold}% Attendance
                      </h3>
                    </div>
                    
                    {lowAttendanceData.students.length > 0 ? (
                      lowAttendanceData.students.map((student) => (
                        <div key={student.student.id} className="border rounded-md p-4">
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              <h3 className="text-lg font-medium">{student.student.name}</h3>
                              <p className="text-sm text-gray-500">
                                Register No: {student.student.registerNumber}, {student.class.name}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-red-600">
                                Overall Attendance: {student.overallAttendance.percentage}%
                              </div>
                              <div className="text-xs text-gray-500">
                                {student.overallAttendance.totalPresent} present out of {student.overallAttendance.totalClasses} classes
                              </div>
                            </div>
                          </div>
                          
                          <h4 className="text-md font-medium mb-2">Subject Breakdown</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-2">Subject</th>
                                  <th className="text-left p-2">Code</th>
                                  <th className="text-right p-2">Present</th>
                                  <th className="text-right p-2">Absent</th>
                                  <th className="text-right p-2">Late</th>
                                  <th className="text-right p-2">Excused</th>
                                  <th className="text-right p-2">Total Classes</th>
                                  <th className="text-right p-2">Attendance %</th>
                                </tr>
                              </thead>
                              <tbody>
                                {student.subjectAttendance.map((subject) => (
                                  <tr key={subject.subject.id} className="border-b hover:bg-gray-50">
                                    <td className="p-2">{subject.subject.name}</td>
                                    <td className="p-2">{subject.subject.code}</td>
                                    <td className="p-2 text-right text-green-600">{subject.present}</td>
                                    <td className="p-2 text-right text-red-600">{subject.absent}</td>
                                    <td className="p-2 text-right text-amber-600">{subject.late}</td>
                                    <td className="p-2 text-right text-blue-600">{subject.excused}</td>
                                    <td className="p-2 text-right">{subject.totalClasses}</td>
                                    <td className={`p-2 text-right font-medium ${
                                      parseFloat(subject.percentage) < lowAttendanceData.threshold
                                        ? 'text-red-600'
                                        : 'text-green-600'
                                    }`}>
                                      {subject.percentage}%
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-6 border rounded-md">
                        <p className="text-gray-500">
                          No students found with attendance below {lowAttendanceData.threshold}%.
                        </p>
                      </div>
                    )}
                  </div>
                ) : !loading && (
                  <div className="text-center p-6 border rounded-md">
                    <p className="text-gray-500">
                      Set threshold and click "Find Students" to identify students with low attendance.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="generate">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Generate PDF Report</CardTitle>
                <CardDescription>Set parameters for the PDF attendance report</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="pdf-class">Class</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass} required>
                      <SelectTrigger id="pdf-class">
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
                      <Label htmlFor="pdf-student">Student</Label>
                      <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                        <SelectTrigger id="pdf-student">
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
                    <Label htmlFor="pdf-subject">Subject (Optional)</Label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger id="pdf-subject">
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
                    <Label htmlFor="pdf-start-date">Start Date</Label>
                    <Input
                      id="pdf-start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="pdf-end-date">End Date</Label>
                    <Input
                      id="pdf-end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                    />
                  </div>
                  
                  <Button
                    onClick={handleGenerateReport}
                    disabled={generating || !selectedClass}
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
                </div>
              </CardContent>
            </Card>
            
            <Card className="lg:col-span-2">
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
                      as="a"
                      href={`${config.API_URL}${report.reportUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttendanceReports; 