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
  Checkbox,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { facultyAPI } from '../../api/faculty';

interface Student {
  _id: string;
  name: string;
  rollNumber: string;
  present: boolean;
}

interface Class {
  _id: string;
  name: string;
  course: {
    name: string;
    code: string;
  };
  students: Student[];
}

const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [attendanceData, setAttendanceData] = useState<Student[]>([]);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedDate) {
      fetchAttendance();
    }
  }, [selectedClass, selectedDate]);

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

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await facultyAPI.getAttendance(
        selectedClass,
        selectedDate?.toISOString().split('T')[0] || ''
      );
      setAttendanceData(response.data.students);
      setError(null);
    } catch (err) {
      setError('Failed to fetch attendance. Please try again later.');
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedClass(event.target.value as string);
  };

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
  };

  const handleStudentAttendanceChange = (studentId: string) => {
    setAttendanceData((prev) =>
      prev.map((student) =>
        student._id === studentId
          ? { ...student, present: !student.present }
          : student
      )
    );
  };

  const handleSaveAttendance = async () => {
    try {
      setLoading(true);
      await facultyAPI.markAttendance(
        selectedClass,
        selectedDate?.toISOString().split('T')[0] || '',
        { students: attendanceData }
      );
      setOpenDialog(true);
      setError(null);
    } catch (err) {
      setError('Failed to save attendance. Please try again later.');
      console.error('Error saving attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
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
        Mark Attendance
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
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
        <Grid item xs={12} md={6}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Select Date"
              value={selectedDate}
              onChange={handleDateChange}
              renderInput={(params) => <TextField {...params} fullWidth />}
            />
          </LocalizationProvider>
        </Grid>
      </Grid>

      {selectedClass && selectedDate && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Student Attendance</Typography>
              <Box>
                <IconButton onClick={fetchAttendance} sx={{ mr: 1 }}>
                  <RefreshIcon />
                </IconButton>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveAttendance}
                  disabled={loading}
                >
                  Save Attendance
                </Button>
              </Box>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Roll Number</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell align="center">Present</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendanceData.map((student) => (
                    <TableRow key={student._id}>
                      <TableCell>{student.rollNumber}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell align="center">
                        <Checkbox
                          checked={student.present}
                          onChange={() => handleStudentAttendanceChange(student._id)}
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

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography>Success</Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>Attendance marked successfully!</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendancePage; 