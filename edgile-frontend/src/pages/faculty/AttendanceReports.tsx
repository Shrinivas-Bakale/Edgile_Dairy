import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  SelectChangeEvent,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { facultyAPI } from '../../api/faculty';

interface AttendanceReport {
  class: {
    name: string;
    course: {
      name: string;
      code: string;
    };
  };
  date: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  attendancePercentage: number;
}

const AttendanceReports: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<AttendanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass && startDate && endDate) {
      fetchReports();
    }
  }, [selectedClass, startDate, endDate]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await facultyAPI.getClasses();
      setClasses(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch classes. Please try again later.');
      console.error('Error fetching classes:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await facultyAPI.getAttendanceReports({
        classId: selectedClass,
        startDate: startDate?.toISOString().split('T')[0],
        endDate: endDate?.toISOString().split('T')[0],
      });
      setReports(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch attendance reports. Please try again later.');
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (event: SelectChangeEvent) => {
    setSelectedClass(event.target.value);
  };

  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
  };

  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
  };

  const handleDownloadReport = async () => {
    try {
      const response = await facultyAPI.downloadAttendanceReport({
        classId: selectedClass,
        startDate: startDate?.toISOString().split('T')[0],
        endDate: endDate?.toISOString().split('T')[0],
      });
      
      // Create a blob from the response data
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance-report-${selectedClass}-${startDate?.toISOString().split('T')[0]}-${endDate?.toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading report:', err);
      setError('Failed to download report. Please try again later.');
    }
  };

  if (loading && !selectedClass) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading classes...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Attendance Reports
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid component="div" item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel>Select Class</InputLabel>
            <Select
              value={selectedClass}
              onChange={handleClassChange}
              label="Select Class"
            >
              {classes.map((classItem) => (
                <MenuItem key={classItem._id} value={classItem._id}>
                  {classItem.name} - {classItem.course.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid component="div" item xs={12} md={4}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={handleStartDateChange}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid component="div" item xs={12} md={4}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={handleEndDateChange}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>
        </Grid>
      </Grid>

      {selectedClass && startDate && endDate && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Attendance Summary</Typography>
              <Box>
                <IconButton onClick={fetchReports} sx={{ mr: 1 }}>
                  <RefreshIcon />
                </IconButton>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadReport}
                >
                  Download Report
                </Button>
              </Box>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Class</TableCell>
                    <TableCell>Course</TableCell>
                    <TableCell align="center">Total Students</TableCell>
                    <TableCell align="center">Present</TableCell>
                    <TableCell align="center">Absent</TableCell>
                    <TableCell align="center">Attendance %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.map((report, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(report.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>{report.class.name}</TableCell>
                      <TableCell>
                        {report.class.course.name} ({report.class.course.code})
                      </TableCell>
                      <TableCell align="center">{report.totalStudents}</TableCell>
                      <TableCell align="center">{report.presentCount}</TableCell>
                      <TableCell align="center">{report.absentCount}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${report.attendancePercentage}%`}
                          color={
                            report.attendancePercentage >= 75
                              ? 'success'
                              : report.attendancePercentage >= 60
                              ? 'warning'
                              : 'error'
                          }
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default AttendanceReports; 