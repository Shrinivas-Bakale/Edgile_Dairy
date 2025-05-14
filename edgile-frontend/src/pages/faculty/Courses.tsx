import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  Chip, 
  Alert, 
  AlertTitle, 
  CircularProgress,
  Divider,
  Avatar,
  useTheme,
  CardActionArea
} from '@mui/material';
import { useFacultyAuth } from '../../contexts/FacultyAuthContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import DashboardWrapper from '../../components/DashboardWrapper';
import { facultyAPI } from '../../utils/api';
import { 
  IconInfoCircle, 
  IconBookmark, 
  IconRefresh,
  IconChalkboard,
  IconCalendarTime,
  IconUser,
  IconBuilding,
  IconClock,
  IconSchool,
  IconBook2,
  IconBook,
  IconCertificate
} from '@tabler/icons-react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Course {
  _id: string;
  subjectName: string;
  subjectCode: string;
  type: 'core' | 'lab' | 'elective';
  totalDuration: number;
  weeklyHours: number;
  year: string;
  semester: number;
  description?: string;
  academicYear?: string;
}

const FacultyCourses: React.FC = () => {
  const navigate = useNavigate();
  const { faculty } = useFacultyAuth();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseDetail, setCourseDetail] = useState<Course | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Safely fetch courses without triggering logout for auth errors
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          showSnackbar('Your session has expired. Please login again.', 'warning');
          navigate('/login');
          return;
        }
        const response = await facultyAPI.getCourses() as any;
        if (response.success && response.courses) {
          setCourses(response.courses);
        } else {
          showSnackbar(response.message || 'Failed to load courses', 'error');
          setError('Failed to load courses. Please try again later.');
        }
      } catch (err: any) {
        console.error('Error fetching courses:', err);
        setError('Failed to fetch courses. Please try again later.');
        showSnackbar('Error loading courses. Please try refreshing the page.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [navigate, showSnackbar]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await facultyAPI.getCourses() as any;
      if (response.success && response.courses) {
        setCourses(response.courses);
        showSnackbar('Courses refreshed successfully', 'success');
      } else {
        showSnackbar(response.message || 'Failed to refresh courses', 'error');
        setError('Failed to refresh courses. Please try again later.');
      }
    } catch (err) {
      console.error('Error refreshing courses:', err);
      setError('Failed to refresh courses. Please try again later.');
      showSnackbar('Error refreshing courses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'core':
        return {
          bg: '#e3f2fd',
          color: '#1565c0',
          lighter: '#bbdefb',
          darker: '#1976d2'
        };
      case 'lab':
        return {
          bg: '#f3e5f5',
          color: '#6a1b9a',
          lighter: '#e1bee7',
          darker: '#8e24aa'
        };
      case 'elective':
        return {
          bg: '#f1f8e9',
          color: '#33691e',
          lighter: '#dcedc8',
          darker: '#558b2f'
        };
      default:
        return {
          bg: '#e8f5e9',
          color: '#2e7d32',
          lighter: '#c8e6c9',
          darker: '#43a047'
        };
    }
  };

  const handleCardClick = async (id: string) => {
    setSelectedCourseId(id);
    setDetailLoading(true);
    setDetailError(null);
    setCourseDetail(null);
    try {
      const response = await facultyAPI.getCourseById(id) as any;
      if (response.success && response.course) {
        setCourseDetail(response.course);
      } else {
        setDetailError(response.message || 'Failed to load course details');
      }
    } catch (err: any) {
      setDetailError('Failed to fetch course details. Please try again later.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Card accent color by type
  const getAccent = (type: string) => {
    switch (type) {
      case 'core': return '#1976d2';
      case 'lab': return '#8e24aa';
      case 'elective': return '#558b2f';
      default: return '#2e7d32';
    }
  };

  // Helper for year name
  const getYearName = (year: string | number) => {
    switch (year) {
      case 1:
      case '1': return 'First';
      case 2:
      case '2': return 'Second';
      case 3:
      case '3': return 'Third';
      case 4:
      case '4': return 'Fourth';
      default: return year;
    }
  };

  if (loading) {
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
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center',  maxWidth: '7xl',  mx: 'auto' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
            My Courses
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View and manage your teaching courses
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<IconRefresh size={18} />}
            onClick={handleRefresh}
          >
            Refresh
        </Button>
      </Box>

        {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
        )}

        {courses.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: 2, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
            <Avatar sx={{ width: 80, height: 80, mb: 2, bgcolor: '#f5f5f5' }}>
              <IconBook2 size={40} color="#9e9e9e" />
            </Avatar>
            <Typography variant="h5" color="text.primary" sx={{ mb: 1, fontWeight: 'medium' }}>
              No courses assigned
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mb: 3 }}>
              You don't have any courses assigned at the moment. Please contact the administration if you believe this is an error.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<IconRefresh size={18} />}
              onClick={handleRefresh}
            >
              Refresh Courses
            </Button>
          </Box>
        </Card>
      ) : (
        <Grid container spacing={4}>
          {courses.map((course) => {
            const colors = getTypeColor(course.type);
            return (
              <Grid item xs={12} sm={6} md={4} key={course._id}>
                <Card
                  sx={{
                    borderRadius: 3,
                    border: '2px solid #bfc7d1',
                    boxShadow: 'none',
                    transition: 'box-shadow 0.2s, border-color 0.2s',
                    '&:hover': {
                      boxShadow: 6,
                      borderColor: colors.darker || '#1976d2',
                    },
                    p: 0,
                    minHeight: 240,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    background: '#fff',
                  }}
                >
                  <CardActionArea onClick={() => handleCardClick(course._id)} sx={{ p: 3, height: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {course.subjectName}
                      </Typography>
                      <Chip
                        label={course.type.charAt(0).toUpperCase() + course.type.slice(1)}
                        size="small"
                        sx={{ bgcolor: colors.bg, color: colors.color, fontWeight: 500, boxShadow: 'none', ml: 1 }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {course.subjectCode}
                    </Typography>
                    <Box component="dl" sx={{ m: 0, p: 0, fontSize: 15 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <dt style={{ color: '#6b7280' }}>Total Hours:</dt>
                        <dd style={{ fontWeight: 600, margin: 0 }}>{course.totalDuration}</dd>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <dt style={{ color: '#6b7280' }}>Weekly Hours:</dt>
                        <dd style={{ fontWeight: 600, margin: 0 }}>{course.weeklyHours}</dd>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <dt style={{ color: '#6b7280' }}>Year:</dt>
                        <dd style={{ fontWeight: 600, margin: 0 }}>{getYearName(course.year)}</dd>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <dt style={{ color: '#6b7280' }}>Semester:</dt>
                        <dd style={{ fontWeight: 600, margin: 0 }}>{course.semester}</dd>
                      </Box>
                    </Box>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
        )}

      {/* Modal for course details */}
      <Dialog open={!!selectedCourseId} onClose={() => setSelectedCourseId(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ m: 0, p: 3, fontWeight: 700, fontSize: 22, borderBottom: '1px solid #eee', letterSpacing: 0.5 }}>
          Course Details
          <IconButton
            aria-label="close"
            onClick={() => setSelectedCourseId(null)}
            sx={{ position: 'absolute', right: 16, top: 16, color: (theme) => theme.palette.grey[500] }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4, bgcolor: '#f9fafb', boxShadow: 2, borderRadius: 3 }}>
          {detailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
              <LoadingSpinner size={32} />
            </Box>
          ) : detailError ? (
            <Alert severity="error">{detailError}</Alert>
          ) : courseDetail ? (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{courseDetail.subjectName}</Typography>
                <Chip
                  label={courseDetail.type.charAt(0).toUpperCase() + courseDetail.type.slice(1)}
                  size="small"
                  sx={{ bgcolor: getTypeColor(courseDetail.type).bg, color: getTypeColor(courseDetail.type).color, fontWeight: 500, boxShadow: 'none', ml: 1 }}
                />
              </Box>
              <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>{courseDetail.subjectCode}</Typography>
              <Divider sx={{ mb: 3 }} />
              <Box component="dl" sx={{ m: 0, p: 0, fontSize: 16, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <dt style={{ color: '#6b7280' }}>Total Hours:</dt>
                  <dd style={{ fontWeight: 600, margin: 0 }}>{courseDetail.totalDuration}</dd>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <dt style={{ color: '#6b7280' }}>Weekly Hours:</dt>
                  <dd style={{ fontWeight: 600, margin: 0 }}>{courseDetail.weeklyHours}</dd>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <dt style={{ color: '#6b7280' }}>Year:</dt>
                  <dd style={{ fontWeight: 600, margin: 0 }}>{getYearName(courseDetail.year)}</dd>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <dt style={{ color: '#6b7280' }}>Semester:</dt>
                  <dd style={{ fontWeight: 600, margin: 0 }}>{courseDetail.semester}</dd>
                </Box>
                {courseDetail.academicYear && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <dt style={{ color: '#6b7280' }}>Academic Year:</dt>
                    <dd style={{ fontWeight: 600, margin: 0 }}>{courseDetail.academicYear}</dd>
                  </Box>
                )}
              </Box>
              {courseDetail.description && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Description
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                    {courseDetail.description}
                  </Typography>
                </Box>
              )}
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>
    </DashboardWrapper>
  );
};

export default FacultyCourses; 