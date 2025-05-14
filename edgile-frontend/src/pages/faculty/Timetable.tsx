import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  Alert,
  AlertTitle,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Button,
  Badge,
  Tooltip,
  Divider,
  LinearProgress,
  Modal,
  IconButton,
  Grid,
  CardContent,
  CardActionArea,
  CardMedia,
  CardActions,
  Avatar,
  useTheme,
  Skeleton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import DashboardWrapper from '../../components/DashboardWrapper';
import axios from 'axios';
import config from '../../config';
import { facultyAPI } from '../../utils/api';
import {
  IconCalendar,
  IconRefresh,
  IconInfoCircle,
  IconClockHour4,
  IconCheck,
  IconAlertTriangle,
  IconCalendarTime,
  IconCalendarEvent,
  IconCalendarStats,
  IconX,
  IconChevronRight,
  IconEye,
  IconUser,
  IconBook,
  IconDownload,
  IconSchool,
  IconBuildingSkyscraper,
  IconId,
  IconClock,
  IconFilter,
  IconChalkboard,
  IconArrowRight
} from '@tabler/icons-react';

// Interfaces
interface TimeSlot {
  startTime: string;
  endTime: string;
  subjectCode: string;
  subjectName?: string;
  facultyId?: string;
  facultyName?: string;
  type?: string;
}

interface Day {
  day: string;
  slots: TimeSlot[];
}

interface FacultySlot {
  day: string;
  startTime: string;
  endTime: string;
  subjectCode: string;
  subjectName: string;
  type: string;
}

interface Timetable {
  _id: string;
  year: string;
  semester: number;
  division: string;
  academicYear: string;
  classroomId: {
    _id: string;
    name: string;
    building?: string;
  } | string;
  classroomName?: string;
  days: Day[];
  publishedAt: Date;
  status?: string;
  classTeacherId?: string;
  facultySlots?: FacultySlot[];
  relevantToFaculty?: boolean;
}

interface Subject {
  _id: string;
  name: string;
  subjectCode: string;
  type: string;
}

interface Faculty {
  _id: string;
  name: string;
  email: string;
  department?: string;
}

const FacultyTimetable: React.FC = () => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicYear, setAcademicYear] = useState<string>(getCurrentAcademicYear());
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [divisions, setDivisions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [todaysSchedule, setTodaysSchedule] = useState<TimeSlot[]>([]);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [showFilter, setShowFilter] = useState<boolean>(false);
  const [displayMode, setDisplayMode] = useState<'card' | 'list'>('card');
  const [isUniversityMismatch, setIsUniversityMismatch] = useState<boolean>(false);
  
  // Get current academic year
  function getCurrentAcademicYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // If we're in the second half of the year (July onwards), it's year/year+1
    // Otherwise it's year-1/year
    if (month >= 6) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }

  useEffect(() => {
    fetchTimetable();
    fetchSubjects();
    fetchFaculty();

    // Debug logging
    if (debugMode) {
      console.log('Component mounted with settings:', {
        academicYear,
        selectedDivision,
        debugMode
      });
    }
  }, [academicYear, selectedDivision]);

  // Extract today's schedule when timetable changes
  useEffect(() => {
    if (timetable) {
      const currentDay = getCurrentDay();
      const daySchedule = timetable.days.find(day => day.day === currentDay);
      
      if (daySchedule) {
        // Filter slots that belong to the current faculty
        const facultySlots = daySchedule.slots.filter(slot => 
          user && slot.facultyId === user._id
        );
        
        setTodaysSchedule(facultySlots);
        
        if (debugMode) {
          console.log(`Found ${facultySlots.length} slots for today (${currentDay}) for current faculty`);
        }
      } else {
        setTodaysSchedule([]);
        if (debugMode) {
          console.log(`No schedule found for today (${currentDay})`);
        }
      }
    } else {
      setTodaysSchedule([]);
    }
  }, [timetable, user, debugMode]);

  const fetchTimetable = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIsUniversityMismatch(false);
      setLoadingProgress(25);
      
      // Show current settings in debug mode
      if (debugMode) {
        console.log('Fetching timetable for:', {
          academicYear,
          division: selectedDivision
        });
      }
      
      setLoadingProgress(50);
      
      // Use facultyAPI with proper parameters
      console.log('Making API request to fetch timetables...');
      const params = {
        academicYear,
        division: selectedDivision !== 'all' ? selectedDivision : undefined
      };
      
      const response = await facultyAPI.getTimetables(params);
      
      // Always log the response regardless of debug mode to diagnose issues
      console.log('Timetable API complete response:', response);
      
      setLoadingProgress(75);
      
      if (response.success && Array.isArray(response.data)) {
        console.log(`Successfully fetched ${response.data.length} timetables`);
        
        // Check if there was a university mismatch
        if (response.isUniversityMismatch) {
          setIsUniversityMismatch(true);
          console.log('Note: University mismatch detected by the server, showing all available timetables');
        }
        
        // No need to filter by academicYear and division as the API already did that
        // But we'll still sort by publishedAt
        const sortedTimetables = response.data.sort((a: Timetable, b: Timetable) => 
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
        
        console.log('Processed timetables:', sortedTimetables);
        
        setTimetables(sortedTimetables);
        
        if (sortedTimetables.length > 0) {
          // Set the first timetable as the active one
          setTimetable(sortedTimetables[0]);
          
          // Extract unique divisions for filtering
          const allDivisions = Array.from(new Set(
            sortedTimetables.map((t: Timetable) => t.division)
          ));
          
          setDivisions(allDivisions as string[]);
          
          console.log(`Loaded ${sortedTimetables.length} timetables`);
          console.log('Available divisions:', allDivisions);
        } else {
          setTimetable(null);
          setError('No timetables found matching the selected filters. Try changing the filters or contact your administrator.');
        }
      } else {
        console.error('API request succeeded but no valid timetables found:');
        console.error('Response success:', response.success);
        console.error('Response data type:', typeof response.data);
        console.error('Response data:', response.data);
        
        setTimetables([]);
        setTimetable(null);
        setError(response.message || 'No published timetables found for you. Please check with your administrator.');
      }
      
      setLoadingProgress(100);
      // Reset retry count on successful fetch
      setRetryCount(0);
    } catch (error) {
      console.error('Error fetching timetable:', error);
      setError('Failed to fetch timetable data. Please try again later.');
      showSnackbar('Failed to fetch timetable data', 'error');
      
      // Increment retry count for tracking purposes
      setRetryCount(prev => prev + 1);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  const fetchSubjects = async () => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Use facultyAPI instead of direct axios call
      const response = await facultyAPI.getSubjects();
      
      if (response.success && response.subjects) {
        setSubjects(response.subjects);
        if (debugMode) {
          console.log('Subjects fetched:', response.subjects.length);
        }
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      // Don't show an error message here as subjects are complementary data
      // and the timetable can still function without them
    }
  };
  
  const fetchFaculty = async () => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Use facultyAPI instead of direct axios call
      const response = await facultyAPI.getFaculty();
      
      if (response.success && response.faculty) {
        setFaculty(response.faculty);
        if (debugMode) {
          console.log('Faculty fetched:', response.faculty.length);
        }
      }
    } catch (error) {
      console.error('Error fetching faculty:', error);
      // Don't show an error message here as faculty data is complementary
      // and the timetable can still function without it
    }
  };
  
  const handleDivisionChange = (event: SelectChangeEvent) => {
    setSelectedDivision(event.target.value);
    if (debugMode) {
      console.log('Division changed to:', event.target.value);
    }
  };
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    if (debugMode) {
      console.log('Manual refresh triggered');
    }
    fetchTimetable();
  };
  
  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
    console.log(`Debug mode ${!debugMode ? 'enabled' : 'disabled'}`);
  };
  
  const handleOpenModal = (tt: Timetable) => {
    setSelectedTimetable(tt);
    setModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setModalOpen(false);
  };
  
  const getSubjectDetails = (subjectCode: string) => {
    return subjects.find(subject => subject.subjectCode === subjectCode);
  };
  
  const getSubjectChipColor = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'core':
        return 'primary';
      case 'lab':
        return 'success';
      case 'elective':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusChipColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'published':
        return 'success';
      case 'draft':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Format time from 24hr to 12hr format
  const formatTime = (time: string) => {
    if (!time) return 'N/A';
    
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };
  
  // Get the day of the week for the current day
  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };
  
  // Check if the timetable is published recently (within the last 7 days)
  const isRecentlyPublished = (publishedAt?: Date) => {
    if (!publishedAt) return false;
    
    const publishDate = new Date(publishedAt);
    const now = new Date();
    const diffTime = now.getTime() - publishDate.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    
    return diffDays <= 7;
  };

  // Check if a time slot is currently active
  const isCurrentTimeSlot = (slot: TimeSlot) => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return currentTime >= slot.startTime && currentTime <= slot.endTime;
  };

  // Calculate if a slot is upcoming (within the next hour)
  const isUpcomingTimeSlot = (slot: TimeSlot) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    const [slotHours, slotMinutes] = slot.startTime.split(':').map(n => parseInt(n, 10));
    
    // Calculate total minutes difference
    const currentTotalMinutes = currentHour * 60 + currentMinutes;
    const slotTotalMinutes = slotHours * 60 + slotMinutes;
    
    const minutesDifference = slotTotalMinutes - currentTotalMinutes;
    
    // If the slot starts within the next 60 minutes and hasn't started yet
    return minutesDifference > 0 && minutesDifference <= 60;
  };

  if (isLoading) {
    return (
      <DashboardWrapper>
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <Typography variant="h6" gutterBottom>Loading Timetable</Typography>
          <Box sx={{ width: '300px', mb: 2 }}>
            <LinearProgress variant="determinate" value={loadingProgress} />
          </Box>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
            Fetching published timetables...
          </Typography>
        </Box>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper>
      {/* Header with Title and Actions */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Typography variant="h4" component="h1" sx={{ 
          color: 'primary.main', 
          fontWeight: 700,
          fontSize: { xs: '1.5rem', sm: '2rem' }
        }}>
          Your Timetables
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<IconFilter size={18} />}
            onClick={() => setShowFilter(!showFilter)}
            size="small"
          >
            Filter
          </Button>
          <Button
            variant="contained"
            startIcon={<IconRefresh size={18} />}
            onClick={handleRefresh}
            disabled={isRefreshing}
            size="small"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
      </Box>
      
      {/* Filters */}
      {showFilter && (
        <Card sx={{ mb: 3, p: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flexBasis: { xs: '100%', sm: '47%', md: '30%' } }}>
              <FormControl fullWidth size="small">
                <InputLabel id="division-select-label">Division</InputLabel>
                <Select
                  labelId="division-select-label"
                  value={selectedDivision}
                  label="Division"
                  onChange={handleDivisionChange}
                >
                  <MenuItem value="all">All Divisions</MenuItem>
                  {divisions.map((div) => (
                    <MenuItem key={div} value={div}>{div}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flexBasis: { xs: '100%', sm: '47%', md: '30%' } }}>
              <FormControl fullWidth size="small">
                <InputLabel id="year-select-label">Academic Year</InputLabel>
                <Select
                  labelId="year-select-label"
                  value={academicYear}
                  label="Academic Year"
                  onChange={(e) => setAcademicYear(e.target.value)}
                >
                  <MenuItem value={getCurrentAcademicYear()}>{getCurrentAcademicYear()}</MenuItem>
                  <MenuItem value={`${parseInt(getCurrentAcademicYear().split('-')[0])-1}-${parseInt(getCurrentAcademicYear().split('-')[1])-1}`}>
                    {`${parseInt(getCurrentAcademicYear().split('-')[0])-1}-${parseInt(getCurrentAcademicYear().split('-')[1])-1}`}
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Card>
      )}

      {/* Info message if no timetables */}
      {timetables.length === 0 && !isLoading && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>No Timetables Available</AlertTitle>
          <Typography variant="body2">
            {error || "Timetables are published by the administrator. If you don't see your timetable, it may not have been published yet."}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              Possible reasons:
            </Typography>
            <ul style={{ marginTop: 4, paddingLeft: 20 }}>
              <li>No timetables have been published for the current academic year</li>
              <li>You have not been assigned to any classes in the published timetables</li>
              <li>Your filter settings may be restricting the view</li>
            </ul>
          </Box>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Try selecting "All Divisions" in the filter or clicking the refresh button.
          </Typography>
        </Alert>
      )}

      {/* University Mismatch Warning */}
      {/* {isUniversityMismatch && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          <AlertTitle>Possible Configuration Issue</AlertTitle>
          <Typography variant="body2">
            There may be a configuration issue with your university settings. The system is showing all published timetables.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Please notify your administrator about this message to ensure you only see timetables relevant to your university.
          </Typography>
        </Alert>
      )} */}

      {/* Today's Schedule */}
      <Card sx={{ mb: 4, borderRadius: 2, overflow: 'hidden', boxShadow: theme.shadows[3] }}>
        <Box sx={{ p: 2, bgcolor: theme.palette.primary.main, color: 'white' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            <IconCalendarTime size={20} style={{ marginRight: 8 }} />
            Today's Schedule ({getCurrentDay()})
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          {todaysSchedule.length > 0 ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {todaysSchedule.map((slot, index) => (
                <Box key={index} sx={{ flexBasis: { xs: '100%', sm: '47%', md: '31%' } }}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: 2,
                      transition: 'all 0.2s ease-in-out',
                      boxShadow: isCurrentTimeSlot(slot) ? `0 0 0 2px ${theme.palette.primary.main}` : 
                                 isUpcomingTimeSlot(slot) ? `0 0 0 2px ${theme.palette.warning.main}` : 'none',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: theme.shadows[4]
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2, pb: 1 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        mb: 1 
                      }}>
                        <Typography variant="subtitle1" fontWeight={600} sx={{ lineHeight: 1.2 }}>
                          {getSubjectDetails(slot.subjectCode)?.name || slot.subjectName || slot.subjectCode}
                        </Typography>
                        <Chip 
                          size="small"
                          color={getSubjectChipColor(getSubjectDetails(slot.subjectCode)?.type)}
                          label={getSubjectDetails(slot.subjectCode)?.type || 'N/A'}
                          sx={{ ml: 1, height: 20, '& .MuiChip-label': { px: 1, fontSize: '0.7rem' } }}
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mb: 1 }}>
                        <IconClock size={16} style={{ minWidth: 16, marginRight: 6 }} />
                        <Typography variant="body2">
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                        <IconUser size={16} style={{ minWidth: 16, marginRight: 6 }} />
                        <Typography variant="body2">
                          {slot.facultyName || 'Faculty not assigned'}
                        </Typography>
                      </Box>
                    </CardContent>
                    
                    {(isCurrentTimeSlot(slot) || isUpcomingTimeSlot(slot)) && (
                      <Box sx={{ 
                        mt: 'auto', 
                        px: 2, 
                        py: 1, 
                        bgcolor: isCurrentTimeSlot(slot) ? 'rgba(25, 118, 210, 0.08)' : 'rgba(255, 193, 7, 0.08)',
                        borderTop: '1px solid',
                        borderColor: isCurrentTimeSlot(slot) ? 'rgba(25, 118, 210, 0.12)' : 'rgba(255, 193, 7, 0.12)',
                      }}>
                        <Typography 
                          variant="caption" 
                          color={isCurrentTimeSlot(slot) ? 'primary' : 'warning.dark'}
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            fontWeight: 500 
                          }}
                        >
                          {isCurrentTimeSlot(slot) ? (
                            <>
                              <IconCheck size={14} style={{ marginRight: 4 }} />
                              Currently Ongoing
                            </>
                          ) : (
                            <>
                              <IconClock size={14} style={{ marginRight: 4 }} />
                              Starting Soon
                            </>
                          )}
                        </Typography>
                      </Box>
                    )}
                  </Card>
                </Box>
              ))}
            </Box>
          ) : (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                {timetable ? 'No classes scheduled for today.' : 'Please select a timetable to view today\'s schedule.'}
              </Typography>
            </Alert>
          )}
        </Box>
      </Card>

      {/* All Timetables Grid */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <IconCalendar size={20} style={{ marginRight: 8 }} />
          Available Timetables
        </Typography>
        
        {timetables.length > 0 ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {timetables.map((tt) => (
              <Box key={tt._id} sx={{ flexBasis: { xs: '100%', sm: '47%', md: '31%' } }}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    overflow: 'hidden',
                    transition: 'all 0.2s ease-in-out',
                    cursor: 'pointer',
                    boxShadow: theme.shadows[2],
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme.shadows[6]
                    }
                  }}
                  onClick={() => handleOpenModal(tt)}
                >
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: theme.palette.primary.main, 
                    color: 'white',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                      {tt.year}, {tt.division}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.85 }}>
                      Semester {tt.semester}
                    </Typography>
                  </Box>
                  
                  <CardContent sx={{ p: 0, flexGrow: 1 }}>
                    <List sx={{ py: 0 }}>
                      <ListItem sx={{ py: 1.5, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <IconSchool size={20} color={theme.palette.primary.main} />
                        </ListItemIcon>
                        <ListItemText 
                          primary={<Typography variant="body2">Academic Year: {tt.academicYear || academicYear}</Typography>}
                        />
                      </ListItem>
                      
                      <ListItem sx={{ py: 1.5, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <IconBuildingSkyscraper size={20} color={theme.palette.primary.main} />
                        </ListItemIcon>
                        <ListItemText 
                          primary={
                            <Typography variant="body2">
                              Classroom: {tt.classroomId && typeof tt.classroomId === 'object' ? tt.classroomId.name : 'Not assigned'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      
                      <ListItem sx={{ py: 1.5 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <IconBook size={20} color={theme.palette.primary.main} />
                        </ListItemIcon>
                        <ListItemText 
                          primary={
                            <Typography variant="body2">
                              {tt.facultySlots?.length || 0} Classes assigned to you
                            </Typography>
                          }
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                  
                  <CardActions sx={{ 
                    p: 2, 
                    pt: 1,
                    mt: 'auto',
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                    justifyContent: 'space-between'
                  }}>
                    <Box>
                      <Chip 
                        size="small" 
                        color="success" 
                        label="Published" 
                        icon={<IconCheck size={14} />}
                        sx={{ height: 24 }}
                      />
                    </Box>
                    <Button 
                      size="small" 
                      endIcon={<IconChevronRight size={16} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(tt);
                      }}
                    >
                      View
                    </Button>
                  </CardActions>
                </Card>
              </Box>
            ))}
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No timetables found
            </Typography>
          </Box>
        )}
      </Box>
      
      {/* Error Message */}
      {error && timetables.length === 0 && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          <AlertTitle>Note</AlertTitle>
          <Typography variant="body2">{error}</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            If this issue persists, please contact your administrator or IT support.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={handleRefresh}
              startIcon={<IconRefresh size={18} />}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing...' : 'Retry'}
            </Button>
          </Box>
        </Alert>
      )}

      {/* Information Message */}
      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        <Typography variant="body2">
          <IconInfoCircle size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Timetables are published by the administrator. If you don't see your timetable, it may not have been published yet. Please check with your administrator.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, pl: 4 }}>
          You can click the refresh button to check for newly published timetables.
        </Typography>
      </Alert>
      
      {/* Debug Information (hidden unless in debug mode) */}
      {debugMode && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Debug Information</AlertTitle>
          <Typography variant="body2">API Retry Count: {retryCount}</Typography>
          <Typography variant="body2">Selected Division: {selectedDivision}</Typography>
          <Typography variant="body2">Academic Year: {academicYear}</Typography>
          <Typography variant="body2">Available Timetables: {timetables.length}</Typography>
          <Typography variant="body2">Available Divisions: {divisions.join(', ') || 'None'}</Typography>
          <Typography variant="body2">Current Day: {getCurrentDay()}</Typography>
          <Typography variant="body2">Today's Schedule Count: {todaysSchedule.length}</Typography>
          <Button 
            variant="text" 
            size="small" 
            color="error"
            onClick={toggleDebugMode}
          >
            Disable Debug Mode
          </Button>
        </Alert>
      )}
      
      {/* Timetable Detail Modal */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        aria-labelledby="timetable-modal-title"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '95%', sm: '90%', md: '85%' },
          maxHeight: '90vh',
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 0,
          borderRadius: 2,
          overflow: 'auto'
        }}>
          {selectedTimetable ? (
            <>
              <Box sx={{ 
                p: 2, 
                bgcolor: theme.palette.primary.main, 
                color: 'white', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <Box>
                  <Typography variant="h6" id="timetable-modal-title">
                    {selectedTimetable.year}, Division {selectedTimetable.division}, Semester {selectedTimetable.semester}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
                    {selectedTimetable.classroomId && typeof selectedTimetable.classroomId === 'object' 
                      ? `Classroom: ${selectedTimetable.classroomId.name}` 
                      : 'Classroom not assigned'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<IconDownload size={18} />}
                    sx={{ 
                      color: 'white', 
                      borderColor: 'rgba(255,255,255,0.5)',
                      '&:hover': { 
                        borderColor: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)' 
                      } 
                    }}
                  >
                    Download
                  </Button>
                  <IconButton 
                    size="small" 
                    onClick={handleCloseModal}
                    sx={{ 
                      color: 'white',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } 
                    }}
                  >
                    <IconX size={20} />
                  </IconButton>
                </Box>
              </Box>
              
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Weekly Schedule</Typography>
                
                <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden', mb: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'rgba(0, 0, 0, 0.04)' }}>
                        <TableCell width="12%" sx={{ fontWeight: 600 }}>Day</TableCell>
                        {['09:00', '10:00', '11:00', '12:00', '01:00', '02:00', '03:00', '04:00'].map((time, index) => (
                          <TableCell key={index} align="center" sx={{ fontWeight: 600 }}>
                            {time}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedTimetable.days.map((day) => (
                        <TableRow key={day.day} hover>
                          <TableCell sx={{ fontWeight: 500 }}>{day.day}</TableCell>
                          {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'].map((time, idx) => {
                            const slot = day.slots.find(s => s.startTime === time);
                            const isCurrentUserSlot = slot && String(slot.facultyId) === String(user?._id);
                            
                            return (
                              <TableCell 
                                key={idx} 
                                align="center" 
                                sx={{ 
                                  p: 0.75,
                                  bgcolor: isCurrentUserSlot ? 'rgba(25, 118, 210, 0.08)' : 'inherit',
                                  border: isCurrentUserSlot ? `1px solid ${theme.palette.primary.main}` : undefined
                                }}
                              >
                                {slot ? (
                                  <Tooltip 
                                    title={
                                      <>
                                        <Typography variant="body2" fontWeight={600}>
                                          {getSubjectDetails(slot.subjectCode)?.name || slot.subjectName || slot.subjectCode}
                                        </Typography>
                                        <Typography variant="body2">
                                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                        </Typography>
                                        <Typography variant="body2">
                                          Faculty: {slot.facultyName || 'Not assigned'}
                                        </Typography>
                                      </>
                                    } 
                                    arrow
                                  >
                                    <Chip 
                                      size="small"
                                      label={slot.subjectCode}
                                      color={isCurrentUserSlot ? "primary" : "default"}
                                      sx={{ 
                                        height: 24,
                                        fontWeight: isCurrentUserSlot ? 600 : 400
                                      }}
                                    />
                                  </Tooltip>
                                ) : null}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>Your Classes</Typography>
                
                {selectedTimetable.facultySlots && selectedTimetable.facultySlots.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {selectedTimetable.facultySlots.map((slot, idx) => (
                      <Box key={idx} sx={{ flexBasis: { xs: '100%', sm: '47%', md: '31%' } }}>
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                          <CardContent sx={{ p: 2 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {slot.subjectName || slot.subjectCode}
                            </Typography>
                            <Chip 
                              size="small" 
                              label={slot.type || 'N/A'} 
                              color={getSubjectChipColor(slot.type)}
                              sx={{ mt: 1, mb: 2 }}
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                              <IconCalendarTime size={16} style={{ marginRight: 8 }} />
                              <Typography variant="body2">
                                {slot.day}, {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    <Typography variant="body2">
                      You have no classes assigned in this timetable.
                    </Typography>
                  </Alert>
                )}
              </Box>
            </>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress size={30} />
              <Typography variant="body1" sx={{ mt: 2 }}>Loading timetable details...</Typography>
            </Box>
          )}
        </Box>
      </Modal>
    </DashboardWrapper>
  );
};

export default FacultyTimetable; 