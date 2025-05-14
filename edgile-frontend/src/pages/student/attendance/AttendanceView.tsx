import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Download, CalendarClock, AlertCircle, Search, Filter } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import config from '@/config';
import simpleToast from '@/hooks/use-simple-toast';

// Add types for attendance records and slots
interface AttendanceRecord {
  status: string;
  subjectId?: string;
  facultyId?: string;
  date?: string;
  slotNumber?: number;
  [key: string]: any;
}

const AttendanceView = () => {
  const navigate = useNavigate();
  const { token } = useStudentAuth();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [attendanceData, setAttendanceData] = useState({ records: [], stats: {} });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [startDate, setStartDate] = useState(
    format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
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
  
  // Fetch attendance data
  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        setLoading(true);
        
        const queryParams = new URLSearchParams({
          startDate,
          endDate
        });
        
        if (selectedSubject) {
          queryParams.append('subjectId', selectedSubject);
        }
        
        const response = await fetch(`${config.API_URL}/api/student/attendance?${queryParams}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setAttendanceData(data.data);
          } else {
            throw new Error(data.message || 'Failed to fetch attendance data');
          }
        } else {
          throw new Error('Failed to fetch attendance data');
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
  }, [selectedSubject, startDate, endDate, token]);
  
  // Filter and search records
  const filteredRecords: AttendanceRecord[] = attendanceData.records?.filter(record => {
    const rec = record as AttendanceRecord;
    const matchesStatus = filterStatus ? rec.status === filterStatus : true;
    const matchesSearch = searchTerm
      ? (rec.subjectId || '').toLowerCase().includes((searchTerm).toLowerCase()) ||
        (rec.facultyId || '').toLowerCase().includes((searchTerm).toLowerCase())
      : true;
    return matchesStatus && matchesSearch;
  }) || [];
  
  // Get attendance status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <Badge className="bg-green-500">Present</Badge>;
      case 'ABSENT':
        return <Badge className="bg-red-500">Absent</Badge>;
      case 'LATE':
        return <Badge className="bg-amber-500">Late</Badge>;
      case 'EXCUSED':
        return <Badge className="bg-blue-500">Excused</Badge>;
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>;
    }
  };

  // Get formatted date
  const getFormattedDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return dateString;
    }
  };
  
  // Export attendance records as CSV
  const exportToCSV = () => {
    if (!filteredRecords.length) {
      simpleToast({
        title: 'No Data',
        description: 'No attendance records to export.',
        variant: 'destructive'
      });
      return;
    }
    
    // Create CSV header
    const headers = ['Date', 'Subject', 'Subject Code', 'Slot', 'Status', 'Faculty', 'Reason'];
    
    // Create CSV rows
    const rows = filteredRecords.map(record => [
      getFormattedDate(record.date || ''),
      record.subjectId || 'Unknown',
      record.subjectId || 'Unknown',
      record.slotNumber || '-',
      record.status || 'Unknown',
      record.facultyId || 'Unknown',
      record.reason || '-'
    ]);
    
    // Join headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
      
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Get attendance statistics
  const stats = attendanceData.stats || {
    totalClasses: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    percentage: 0,
    minRequired: 75
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
        <h1 className="text-3xl font-bold">Attendance Records</h1>
        <p className="text-gray-500">View and analyze your attendance details</p>
      </div>
      
      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter your attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              />
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="PRESENT">Present</SelectItem>
                  <SelectItem value="ABSENT">Absent</SelectItem>
                  <SelectItem value="LATE">Late</SelectItem>
                  <SelectItem value="EXCUSED">Excused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by subject or faculty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('');
                setSelectedSubject('');
                setStartDate(format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'));
                setEndDate(format(new Date(), 'yyyy-MM-dd'));
              }}
              title="Reset filters"
            >
              <Filter className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              onClick={exportToCSV}
              disabled={!filteredRecords.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Statistics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Attendance Statistics</CardTitle>
          <CardDescription>
            {selectedSubject
              ? `Stats for ${subjects.find(s => s._id === selectedSubject)?.name || 'selected subject'}`
              : 'Statistics for all subjects'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">
                  Attendance Rate: {stats.percentage?.toFixed(1) || 0}%
                </span>
                <span className="text-sm font-medium">
                  Min. Required: {stats.minRequired || 75}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={stats.percentage || 0} 
                  className="h-2 flex-1" 
                />
                <span className="text-xs text-gray-500 w-12 text-right">
                  {stats.percentage?.toFixed(1) || 0}%
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 rounded-md p-3 text-center">
                <div className="text-green-700 text-lg font-semibold">{stats.present || 0}</div>
                <div className="text-green-600 text-sm">Present</div>
              </div>
              
              <div className="bg-red-50 rounded-md p-3 text-center">
                <div className="text-red-700 text-lg font-semibold">{stats.absent || 0}</div>
                <div className="text-red-600 text-sm">Absent</div>
              </div>
              
              <div className="bg-amber-50 rounded-md p-3 text-center">
                <div className="text-amber-700 text-lg font-semibold">{stats.late || 0}</div>
                <div className="text-amber-600 text-sm">Late</div>
              </div>
              
              <div className="bg-blue-50 rounded-md p-3 text-center">
                <div className="text-blue-700 text-lg font-semibold">{stats.excused || 0}</div>
                <div className="text-blue-600 text-sm">Excused</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription>
            {filteredRecords.length} record(s) found for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : filteredRecords.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Faculty</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record: AttendanceRecord) => (
                    <TableRow key={(record as AttendanceRecord)._id}>
                      <TableCell className="font-medium">
                        {getFormattedDate((record as AttendanceRecord).date || '')}
                      </TableCell>
                      <TableCell>
                        <div>{(record as AttendanceRecord).subjectId || 'Unknown'}</div>
                      </TableCell>
                      <TableCell>{(record as AttendanceRecord).slotNumber || '-'}</TableCell>
                      <TableCell>{getStatusBadge((record as AttendanceRecord).status || 'Unknown')}</TableCell>
                      <TableCell>{(record as AttendanceRecord).facultyId || 'Unknown'}</TableCell>
                      <TableCell>{(record as AttendanceRecord).reason || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              {attendanceData.records?.length === 0 ? (
                <>
                  <AlertCircle className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                  <h3 className="text-lg font-medium text-gray-600 mb-1">No Records Found</h3>
                  <p className="text-gray-500">There are no attendance records available for the selected filters.</p>
                </>
              ) : (
                <>
                  <Search className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                  <h3 className="text-lg font-medium text-gray-600 mb-1">No Matching Records</h3>
                  <p className="text-gray-500">Try adjusting your search or filters.</p>
                </>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/student/attendance/calendar')}
          >
            <CalendarClock className="h-4 w-4 mr-2" />
            View Calendar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={!filteredRecords.length}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AttendanceView; 