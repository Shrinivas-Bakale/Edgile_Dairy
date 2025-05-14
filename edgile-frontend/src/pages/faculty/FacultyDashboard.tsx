import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Card, 
  CardContent, 
  CircularProgress,
  Avatar,
  IconButton,
  Divider,
  useTheme,
  CardHeader,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardWrapper from '../../components/DashboardWrapper';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  IconCalendarEvent,
  IconBook2,
  IconUsers,
  IconChartBar,
  IconArrowRight,
  IconClipboard,
  IconRefresh,
  IconBuildingSkyscraper,
  IconClock,
  IconBell,
  IconChalkboard
} from '@tabler/icons-react';
import { facultyAPI } from '../../utils/api';
import COEViewPage from '../admin/COEViewPage';
import { format } from 'date-fns';
import config from '../../config';

// Interface for faculty dashboard data
interface DashboardData {
  totalCourses: number;
  totalStudents: number;
  upcomingClasses: number;
  pendingAssignments: number;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  date: string;
  type: 'class' | 'meeting' | 'deadline' | 'other';
  location?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

interface DashboardResponse extends ApiResponse<{
  dashboardData: DashboardData;
  upcomingEvents: Event[];
}> {}

interface CoursesResponse extends ApiResponse<{
  courses: any[];
}> {}

const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const theme = useTheme();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [recentCourses, setRecentCourses] = useState<any[]>([]);
  const [needsReload, setNeedsReload] = useState<boolean>(false);
  const [coes, setCOEs] = useState<any[]>([]);
  const [coeModalOpen, setCOEModalOpen] = useState(false);
  const [selectedCOE, setSelectedCOE] = useState<any | null>(null);
  
  // Check if this is the initial login by looking for a flag in session storage
  useEffect(() => {
    const isInitialLogin = !sessionStorage.getItem('facultyDashboardLoaded');
    
    if (isInitialLogin) {
      console.log('Initial faculty dashboard load detected - sidebar may not render correctly');
      setNeedsReload(true);
      
      // Mark that we've loaded the dashboard once in this session
      sessionStorage.setItem('facultyDashboardLoaded', 'true');
    }
  }, []);

  // Auto-reload the page once if this is the initial login to fix sidebar issues
  useEffect(() => {
    if (needsReload) {
      // Set a small timeout to allow the component to mount before reloading
      const timer = setTimeout(() => {
        console.log('Reloading faculty dashboard to ensure sidebar renders correctly');
        window.location.reload();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [needsReload]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        // API call to fetch dashboard data
        const response = await facultyAPI.getDashboard() as any;
        if (response && response.success && response.data) {
          setDashboardData(response.data.dashboardData);
          setUpcomingEvents(response.data.upcomingEvents || mockEvents);
          // Fetch recent courses
          const coursesResponse = await facultyAPI.getCourses() as any;
          if (coursesResponse && coursesResponse.success && coursesResponse.data?.courses) {
            setRecentCourses(coursesResponse.data.courses.slice(0, 3));
          } else {
            setRecentCourses([]);
            showSnackbar('Failed to load recent courses', 'error');
          }
        } else {
          showSnackbar((response as any)?.message || 'Failed to load dashboard data', 'error');
          setDashboardData({
            totalCourses: 0,
            totalStudents: 0,
            upcomingClasses: 0,
            pendingAssignments: 0
          });
          setRecentCourses([]);
          setUpcomingEvents(mockEvents);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        showSnackbar('Failed to load dashboard data', 'error');
        setDashboardData({
          totalCourses: 0,
          totalStudents: 0,
          upcomingClasses: 0,
          pendingAssignments: 0
        });
        setRecentCourses([]);
        setUpcomingEvents(mockEvents);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [showSnackbar]);

  // Fetch published COEs
  useEffect(() => {
    const fetchCOEs = async () => {
      try {
        const res = await fetch(`${config.API_URL}/api/admin/coes/published`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) setCOEs(data.data);
      } catch (e) { /* ignore */ }
    };
    fetchCOEs();
  }, []);

  // Mock events for testing
  const mockEvents = [
    {
      id: '1',
      title: 'Data Structures Lecture',
      description: 'Introduction to Trees and Graphs',
      startTime: '10:00',
      endTime: '11:30',
      date: new Date().toISOString().split('T')[0],
      type: 'class',
      location: 'Room 301'
    },
    {
      id: '2',
      title: 'Computer Science Lab',
      description: 'Practical session on algorithms',
      startTime: '13:00',
      endTime: '15:00',
      date: new Date().toISOString().split('T')[0],
      type: 'class',
      location: 'Lab 102'
    },
    {
      id: '3',
      title: 'Faculty Meeting',
      startTime: '16:00',
      endTime: '17:00',
      date: new Date().toISOString().split('T')[0],
      type: 'meeting',
      location: 'Conference Room'
    }
  ] as Event[];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await facultyAPI.getDashboard() as DashboardResponse;
      if (response.success && response.data) {
        setDashboardData(response.data.dashboardData);
        setUpcomingEvents(response.data.upcomingEvents || mockEvents);
        showSnackbar('Dashboard refreshed successfully', 'success');
      } else {
        showSnackbar(response.message || 'Failed to refresh data', 'error');
      }
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      showSnackbar('Failed to refresh data', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'class':
        return <IconChalkboard size={20} />;
      case 'meeting':
        return <IconUsers size={20} />;
      case 'deadline':
        return <IconClock size={20} />;
      default:
        return <IconBell size={20} />;
    }
  };

  const getEventChipColor = (type: string) => {
    switch (type) {
      case 'class':
        return { bg: '#e3f2fd', color: '#1976d2' };
      case 'meeting':
        return { bg: '#e8f5e9', color: '#2e7d32' };
      case 'deadline':
        return { bg: '#fff3e0', color: '#ef6c00' };
      default:
        return { bg: '#f5f5f5', color: '#757575' };
    }
  };

  if (isLoading) {
    return (
      <DashboardWrapper>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
        </Box>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper>
      {/* Header Section */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
            Welcome, {user?.name || 'Faculty'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Typography>
        </Box>
        <Button 
          variant="outlined" 
          color="primary" 
          startIcon={<IconRefresh size={18} />} 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>
      
      {/* Stats Cards */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 3,
          mb: 4,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <Box
            key={i}
            sx={{ 
              flex: '1 1 220px',
              minWidth: { xs: '100%', sm: '48%', md: '23%' },
              maxWidth: { xs: '100%', sm: '48%', md: '23%' },
              display: 'flex',
            }}
          >
            {i === 0 && (
              <Card elevation={0} sx={{ borderRadius: 2, height: '100%', width: '100%', background: 'linear-gradient(45deg, #42a5f5 30%, #64b5f6 90%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white', fontSize: 36 }}>{dashboardData?.totalCourses || 0}</Typography>
                      <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)' }}>Courses</Typography>
                </Box>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}><IconBook2 size={24} /></Avatar>
              </Box>
                  <Button sx={{ mt: 2, color: 'white', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }} variant="outlined" size="small" endIcon={<IconArrowRight size={16} />} onClick={() => navigate('/faculty/courses')}>View Courses</Button>
            </CardContent>
          </Card>
            )}
            {i === 1 && (
              <Card elevation={0} sx={{ borderRadius: 2, height: '100%', width: '100%', background: 'linear-gradient(45deg, #ec407a 30%, #f48fb1 90%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white', fontSize: 36 }}>{dashboardData?.totalStudents || 0}</Typography>
                      <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)' }}>Students</Typography>
                </Box>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}><IconUsers size={24} /></Avatar>
              </Box>
                  <Button sx={{ mt: 2, color: 'white', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }} variant="outlined" size="small" endIcon={<IconArrowRight size={16} />} onClick={() => navigate('/faculty/students')}>View Students</Button>
            </CardContent>
          </Card>
            )}
            {i === 2 && (
              <Card elevation={0} sx={{ borderRadius: 2, height: '100%', width: '100%', background: 'linear-gradient(45deg, #66bb6a 30%, #81c784 90%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white', fontSize: 36 }}>{dashboardData?.upcomingClasses || 0}</Typography>
                      <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)' }}>Upcoming Classes</Typography>
                </Box>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}><IconCalendarEvent size={24} /></Avatar>
              </Box>
                  <Button sx={{ mt: 2, color: 'white', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }} variant="outlined" size="small" endIcon={<IconArrowRight size={16} />} onClick={() => navigate('/faculty/timetable')}>View Timetable</Button>
            </CardContent>
          </Card>
            )}
            {i === 3 && (
              <Card elevation={0} sx={{ borderRadius: 2, height: '100%', width: '100%', background: 'linear-gradient(45deg, #ff9800 30%, #ffb74d 90%)', color: 'white' }}>
              <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white', fontSize: 36 }}>{dashboardData?.pendingAssignments || 0}</Typography>
                      <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)' }}>Pending Tasks</Typography>
                </Box>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}><IconClipboard size={24} /></Avatar>
              </Box>
                  <Button sx={{ mt: 2, color: 'white', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }} variant="outlined" size="small" endIcon={<IconArrowRight size={16} />} onClick={() => navigate('/faculty/attendance')}>Attendance</Button>
            </CardContent>
          </Card>
            )}
          </Box>
        ))}
      </Box>
      
      {/* Main Content Flex */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 3,
          mb: 4,
        }}
      >
        {/* Recent Courses */}
        <Box sx={{ flex: '1 1 340px', minWidth: { xs: '100%', md: '48%' }, maxWidth: { xs: '100%', md: '48%' }, display: 'flex' }}>
          <Card sx={{ borderRadius: 2, boxShadow: theme.shadows[1], mb: 3, height: '100%', width: '100%' }}>
            <CardHeader 
              title={<Typography variant="h6" fontWeight="bold">Recent Courses</Typography>}
              action={<Button size="small" endIcon={<IconArrowRight size={16} />} onClick={() => navigate('/faculty/courses')}>View All</Button>}
            />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              {recentCourses.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">No courses available</Typography>
                </Box>
              ) : (
                recentCourses.map((course, index) => (
                  <React.Fragment key={course._id}>
                    <Box 
                      sx={{ p: 2, display: 'flex', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' } }}
                      onClick={() => navigate(`/faculty/courses/${course._id}`)}
                    >
                      <Avatar sx={{ bgcolor: course.type === 'core' ? '#bbdefb' : course.type === 'lab' ? '#e1bee7' : '#dcedc8', color: course.type === 'core' ? '#1565c0' : course.type === 'lab' ? '#6a1b9a' : '#33691e', mr: 2 }}>
                        {course.subjectCode.substring(0, 2)}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>{course.subjectName}</Typography>
                        <Typography variant="body2" color="text.secondary">{course.subjectCode} • Year {course.year}, Semester {course.semester}</Typography>
                      </Box>
                      <Chip label={course.type.charAt(0).toUpperCase() + course.type.slice(1)} size="small" sx={{ bgcolor: course.type === 'core' ? '#e3f2fd' : course.type === 'lab' ? '#f3e5f5' : '#f1f8e9', color: course.type === 'core' ? '#1565c0' : course.type === 'lab' ? '#6a1b9a' : '#33691e' }} />
                    </Box>
                    {index < recentCourses.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              )}
            </CardContent>
            {recentCourses.length > 0 && (
              <CardActions sx={{ justifyContent: 'center', p: 2 }}>
                <Button variant="outlined" size="small" onClick={() => navigate('/faculty/courses')} fullWidth>View All Courses</Button>
              </CardActions>
            )}
            </Card>
        </Box>
        {/* Today's Schedule */}
        <Box sx={{ flex: '1 1 340px', minWidth: { xs: '100%', md: '48%' }, maxWidth: { xs: '100%', md: '48%' }, display: 'flex' }}>
          <Card sx={{ borderRadius: 2, boxShadow: theme.shadows[1], mb: 3, height: '100%', width: '100%' }}>
            <CardHeader 
              title={<Typography variant="h6" fontWeight="bold">Today's Schedule</Typography>}
              action={<Button size="small" endIcon={<IconArrowRight size={16} />} onClick={() => navigate('/faculty/timetable')}>View Timetable</Button>}
            />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              {upcomingEvents.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">No events scheduled for today</Typography>
                </Box>
              ) : (
                upcomingEvents.map((event, index) => (
                  <React.Fragment key={event.id}>
                    <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2, bgcolor: getEventChipColor(event.type).bg, color: getEventChipColor(event.type).color }}>{getEventIcon(event.type)}</Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>{event.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{event.startTime} - {event.endTime}{event.location && ` • ${event.location}`}</Typography>
                        {event.description && (<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{event.description}</Typography>)}
                      </Box>
                      <Chip label={event.type.charAt(0).toUpperCase() + event.type.slice(1)} size="small" sx={{ bgcolor: getEventChipColor(event.type).bg, color: getEventChipColor(event.type).color }} />
                    </Box>
                    {index < upcomingEvents.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              )}
            </CardContent>
            {upcomingEvents.length > 0 && (
              <CardActions sx={{ justifyContent: 'center', p: 2 }}>
                <Button variant="outlined" size="small" onClick={() => navigate('/faculty/timetable')} fullWidth>View Full Schedule</Button>
              </CardActions>
            )}
          </Card>
        </Box>
      </Box>
      
      {/* Quick Access Buttons */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          mt: 2,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <Box
            key={i}
            sx={{ 
              flex: '1 1 220px',
              minWidth: { xs: '100%', sm: '48%', md: '23%' },
              maxWidth: { xs: '100%', sm: '48%', md: '23%' },
              display: 'flex',
            }}
          >
            {i === 0 && (
              <Card sx={{ borderRadius: 2, cursor: 'pointer', transition: 'all 0.3s', '&:hover': { boxShadow: theme.shadows[4], transform: 'translateY(-4px)' }, height: '100%', width: '100%' }} onClick={() => navigate('/faculty/attendance')}>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Avatar sx={{ mx: 'auto', mb: 2, bgcolor: '#e8f5e9', color: '#2e7d32', width: 56, height: 56 }}><IconClipboard size={28} /></Avatar>
              <Typography variant="h6" gutterBottom>Attendance</Typography>
                  <Typography variant="body2" color="text.secondary">Mark and manage student attendance records</Typography>
              </CardContent>
            </Card>
            )}
            {i === 1 && (
              <Card sx={{ borderRadius: 2, cursor: 'pointer', transition: 'all 0.3s', '&:hover': { boxShadow: theme.shadows[4], transform: 'translateY(-4px)' }, height: '100%', width: '100%' }} onClick={() => navigate('/faculty/students')}>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Avatar sx={{ mx: 'auto', mb: 2, bgcolor: '#f3e5f5', color: '#7b1fa2', width: 56, height: 56 }}><IconUsers size={28} /></Avatar>
              <Typography variant="h6" gutterBottom>Students</Typography>
                  <Typography variant="body2" color="text.secondary">View and manage student information</Typography>
            </CardContent>
          </Card>
            )}
            {i === 2 && (
              <Card sx={{ borderRadius: 2, cursor: 'pointer', transition: 'all 0.3s', '&:hover': { boxShadow: theme.shadows[4], transform: 'translateY(-4px)' }, height: '100%', width: '100%' }} onClick={() => navigate('/faculty/timetable')}>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Avatar sx={{ mx: 'auto', mb: 2, bgcolor: '#e3f2fd', color: '#1565c0', width: 56, height: 56 }}><IconCalendarEvent size={28} /></Avatar>
              <Typography variant="h6" gutterBottom>Timetable</Typography>
                  <Typography variant="body2" color="text.secondary">View your teaching schedule</Typography>
                </CardContent>
              </Card>
            )}
            {i === 3 && (
              <Card sx={{ borderRadius: 2, cursor: 'pointer', transition: 'all 0.3s', '&:hover': { boxShadow: theme.shadows[4], transform: 'translateY(-4px)' }, height: '100%', width: '100%' }} onClick={() => navigate('/faculty/profile')}>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Avatar sx={{ mx: 'auto', mb: 2, bgcolor: '#fff3e0', color: '#e65100', width: 56, height: 56 }}><IconBuildingSkyscraper size={28} /></Avatar>
                  <Typography variant="h6" gutterBottom>Profile</Typography>
                  <Typography variant="body2" color="text.secondary">Update personal information</Typography>
            </CardContent>
          </Card>
            )}
          </Box>
        ))}
      </Box>

      {/* COE Cards Section */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" fontWeight={700} mb={2}>Calendar of Events</Typography>
        <Box
            sx={{ 
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          {coes.length === 0 ? (
            <Box sx={{ flex: '1 1 100%' }}><Typography color="text.secondary">No published calendars available</Typography></Box>
          ) : coes.map(coe => (
            <Box key={coe._id} sx={{ flex: '1 1 320px', minWidth: { xs: '100%', sm: '48%', md: '32%' }, maxWidth: { xs: '100%', sm: '48%', md: '32%' }, display: 'flex' }}>
              <Card sx={{ borderRadius: 2, boxShadow: 1, width: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700}>{coe.name}</Typography>
                  <Typography variant="body2" color="text.secondary" mb={1}>{format(new Date(coe.startDate), 'd MMM yyyy')} to {format(new Date(coe.endDate), 'd MMM yyyy')}</Typography>
                  <Button variant="outlined" onClick={() => { setSelectedCOE(coe); setCOEModalOpen(true); }}>View</Button>
            </CardContent>
          </Card>
            </Box>
          ))}
        </Box>
        {/* Modal to show COEViewPage in public mode */}
        <Dialog open={coeModalOpen} onClose={() => setCOEModalOpen(false)} maxWidth="xl" fullWidth>
          <DialogTitle>Calendar of Events</DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            {selectedCOE && <COEViewPage publicMode={true} id={selectedCOE._id} />}
          </DialogContent>
        </Dialog>
      </Box>
    </DashboardWrapper>
  );
};

export default FacultyDashboard; 