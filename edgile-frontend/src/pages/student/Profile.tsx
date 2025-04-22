import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardWrapper from '../../components/DashboardWrapper';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button,
  CircularProgress,
  Alert,
  TextField,
  Paper,
  Card,
  CardContent,
  Avatar,
  Divider,
  Snackbar,
  Link,
} from '@mui/material';
import { 
  ExitToApp as LogoutIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  School as SchoolIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  Business as BusinessIcon,
  Info as InfoIcon
} from '@mui/icons-material';

interface University {
  _id: string;
  name?: string;
  email?: string;
  universityName?: string;
  contactInfo?: {
    phone?: string;
    address?: string;
  };
}

interface StudentProfile {
  _id?: string;
  name: string;
  email: string;
  registerNumber: string;
  division?: string;
  classYear?: number;
  semester?: number;
  phone?: string;
  universityCode?: string;
  university?: University;
  createdAt?: string;
  updatedAt?: string;
  role?: string;
  status?: string;
}

const StudentProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [updatedProfile, setUpdatedProfile] = useState<Partial<StudentProfile>>({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [universityInfo, setUniversityInfo] = useState<{name: string; adminName: string} | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get('/student/profile');
        
        if (response.data && response.data.success && response.data.student) {
          const studentData = response.data.student;
          setProfile(studentData);
          
          // Set updated profile fields for edit mode - only phone is editable
          setUpdatedProfile({
            phone: studentData.phone || '',
          });
          
          // Fetch university info if not present or incomplete
          if (!studentData.university || !studentData.university.universityName) {
            fetchUniversityInfo(studentData.universityCode);
          } else {
            setUniversityInfo({
              name: studentData.university.universityName || '',
              adminName: studentData.university.name || ''
            });
          }
        } else {
          throw new Error('Invalid response structure');
        }
      } catch (err) {
        setError('Failed to load profile data. Please try again later.');
        
        // Try to load from localStorage as fallback
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            // Validate the user data has the minimum required fields
            if (parsedUser && parsedUser.email) {
              setProfile(parsedUser);
              setUpdatedProfile({
                phone: parsedUser.phone || '',
              });
              
              // Fetch university info based on university code
              if (parsedUser.universityCode) {
                fetchUniversityInfo(parsedUser.universityCode);
              }
              
              setError(null);
            } else {
              setError('Invalid user data structure in local storage');
            }
          } catch (parseErr) {
            setError('Error parsing user data. Please log out and log in again.');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);
  
  const fetchUniversityInfo = async (universityCode: string) => {
    try {
      const response = await api.get(`/universities/info/${universityCode}`);
      if (response.data && response.data.success) {
        setUniversityInfo({
          name: response.data.university.universityName || '',
          adminName: response.data.university.name || ''
        });
      }
    } catch (err) {
      // Create a fallback API endpoint to get university info by code
      try {
        const fallbackResponse = await api.get(`/admin/university-by-code/${universityCode}`);
        if (fallbackResponse.data && fallbackResponse.data.success) {
          setUniversityInfo({
            name: fallbackResponse.data.university.universityName || '',
            adminName: fallbackResponse.data.university.name || ''
          });
        }
      } catch (fallbackErr) {
        // Silently handle this error as university info is not critical
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleCancel = () => {
    setEditMode(false);
    // Reset to original values
    if (profile) {
      setUpdatedProfile({
        phone: profile.phone || '',
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUpdatedProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await api.put('/student/update', updatedProfile);
      
      if (response.data && response.data.student) {
        setProfile(response.data.student);
        setSnackbar({
          open: true,
          message: 'Profile updated successfully',
          severity: 'success'
        });
      }
      setEditMode(false);
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to update profile',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Format date function
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get university name
  const getUniversityName = () => {
    if (universityInfo?.name) {
      return universityInfo.name;
    }
    if (profile?.university?.universityName) {
      return profile.university.universityName;
    }
    return profile?.universityCode || 'Not specified';
  };
  
  // Get admin name
  const getAdminName = () => {
    if (universityInfo?.adminName) {
      return universityInfo.adminName;
    }
    if (profile?.university?.name) {
      return profile.university.name;
    }
    return 'University Administrator';
  };

  if (loading) {
    return (
      <DashboardWrapper>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
          <Typography ml={2} variant="h6">Loading your profile...</Typography>
        </Box>
      </DashboardWrapper>
    );
  }

  if (error) {
    return (
      <DashboardWrapper>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <Alert severity="error">
            Error: {error}
            <div>Please try refreshing the page.</div>
          </Alert>
        </Box>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper>
      <div className="p-6 w-3/4 mx-auto">
        <Paper elevation={3} className="p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <Typography variant="h4" gutterBottom>Student Profile</Typography>
            <Button 
              variant="contained" 
              color="error" 
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Summary Card */}
            <div className="col-span-1">
              <Card elevation={2} className="text-center">
                <CardContent className="flex flex-col items-center p-6">
                  <Avatar 
                    sx={{ 
                      width: 100, 
                      height: 100, 
                      bgcolor: 'primary.main',
                      fontSize: '2.5rem',
                      mb: 2
                    }}
                  >
                    {profile?.name ? profile.name.charAt(0).toUpperCase() : 'S'}
                  </Avatar>
                  <Typography variant="h5" className="font-bold">
                    {profile?.name}
                  </Typography>
                  <Divider className="w-full my-4" />
                  <div className="flex items-center justify-center mt-2">
                    <SchoolIcon color="primary" className="mr-2" />
                    <Typography variant="body1">
                      Year {profile?.classYear || '–'}, Semester {profile?.semester || '–'}
                    </Typography>
                  </div>
                  <div className="flex items-center justify-center mt-2">
                    <BadgeIcon color="primary" className="mr-2" />
                    <Typography variant="body1">
                      {profile?.registerNumber}
                    </Typography>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Profile Details */}
            <div className="col-span-2">
              <Card elevation={2}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <Typography variant="h6" gutterBottom>
                      Personal Information
                    </Typography>
                    {!editMode ? (
                      <Button 
                        startIcon={<EditIcon />} 
                        variant="outlined" 
                        onClick={handleEdit}
                      >
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button 
                          startIcon={<SaveIcon />} 
                          variant="contained" 
                          color="primary" 
                          onClick={handleSave}
                        >
                          Save
                        </Button>
                        <Button 
                          startIcon={<CancelIcon />} 
                          variant="outlined" 
                          onClick={handleCancel}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-3">
                      <EmailIcon color="primary" />
                      <div>
                        <Typography variant="body2" color="textSecondary">Email</Typography>
                        <Typography variant="body1">{profile?.email}</Typography>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <PhoneIcon color="primary" />
                      <div>
                        <Typography variant="body2" color="textSecondary">Phone</Typography>
                        {editMode ? (
                          <TextField
                            name="phone"
                            value={updatedProfile.phone || ''}
                            onChange={handleChange}
                            variant="outlined"
                            size="small"
                            fullWidth
                            placeholder="Enter your phone number"
                          />
                        ) : (
                          <Typography variant="body1">{profile?.phone || 'Not specified'}</Typography>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <SchoolIcon color="primary" />
                      <div>
                        <Typography variant="body2" color="textSecondary">Division</Typography>
                        <Typography variant="body1">{profile?.division || 'Not specified'}</Typography>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <BusinessIcon color="primary" />
                      <div>
                        <Typography variant="body2" color="textSecondary">University Name</Typography>
                        <Typography variant="body1">{getUniversityName()}</Typography>
                      </div>
                    </div>
                  </div>

                  <Divider className="my-4" />

                  {/* <Typography variant="h6" gutterBottom className="mt-4">
                    Academic Information
                  </Typography>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-3">
                    <div>
                      <Typography variant="body2" color="textSecondary">Class Year</Typography>
                      <Typography variant="body1">{profile?.classYear || 'Not specified'}</Typography>
                    </div>
                    
                    <div>
                      <Typography variant="body2" color="textSecondary">Current Semester</Typography>
                      <Typography variant="body1">{profile?.semester || 'Not specified'}</Typography>
                    </div>
                    
                    <div>
                      <Typography variant="body2" color="textSecondary">Enrollment Date</Typography>
                      <Typography variant="body1">{formatDate(profile?.createdAt)}</Typography>
                    </div>
                    
                    <div>
                      <Typography variant="body2" color="textSecondary">University Code</Typography>
                      <Typography variant="body1">{profile?.universityCode || 'Not specified'}</Typography>
                    </div>
                  </div> */}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Admin Contact Note */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <InfoIcon color="info" className="mt-1" />
              <div>
                <Typography variant="body1" fontWeight="medium">Note:</Typography>
                <Typography variant="body2">
                  If you have any issues with your account or need assistance, please contact the administrator: {getAdminName()}.
                  {profile?.university?.email && (
                    <span> Email: <Link href={`mailto:${profile.university.email}`}>{profile.university.email}</Link></span>
                  )}
                </Typography>
              </div>
            </div>
          </div>
        </Paper>
      </div>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={snackbar.message}
      />
    </DashboardWrapper>
  );
};

export default StudentProfile; 