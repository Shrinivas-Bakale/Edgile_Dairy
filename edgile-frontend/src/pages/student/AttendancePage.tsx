import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from '../../contexts/AuthContext';
import { studentAPI } from '../../api/student';

interface AttendanceRecord {
  date: string;
  class: {
    name: string;
    course: {
      name: string;
      code: string;
    };
  };
  status: 'present' | 'absent';
}

const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  useEffect(() => {
    fetchAttendance();
  }, [selectedMonth]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await studentAPI.getAttendance(selectedMonth);
      setAttendanceRecords(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch attendance records. Please try again later.');
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedMonth(event.target.value as string);
  };

  const getAttendancePercentage = () => {
    if (attendanceRecords.length === 0) return 0;
    const presentCount = attendanceRecords.filter(
      (record) => record.status === 'present'
    ).length;
    return Math.round((presentCount / attendanceRecords.length) * 100);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading attendance records...</Typography>
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
        My Attendance
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Select Month</InputLabel>
            <Select
              value={selectedMonth}
              onChange={handleMonthChange}
              label="Select Month"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                return date.toISOString().slice(0, 7);
              }).map((month) => (
                <MenuItem key={month} value={month}>
                  {new Date(month).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Overall Attendance
              </Typography>
              <Typography variant="h3" color="primary">
                {getAttendancePercentage()}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Attendance Records
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Class</TableCell>
                  <TableCell>Course</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendanceRecords.map((record, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {new Date(record.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>{record.class.name}</TableCell>
                    <TableCell>
                      {record.class.course.name} ({record.class.course.code})
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={record.status}
                        color={record.status === 'present' ? 'success' : 'error'}
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
    </Box>
  );
};

export default AttendancePage; 