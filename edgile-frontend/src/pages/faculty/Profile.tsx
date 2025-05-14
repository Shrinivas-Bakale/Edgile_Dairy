import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Avatar, 
  Divider, 
  CircularProgress,
  Tab,
  Tabs
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useFacultyAuth } from '../../contexts/FacultyAuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import DashboardWrapper from '../../components/DashboardWrapper';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../../config';

// Interface for Profile data
interface FacultyProfile {
  name: string;
  email: string;
  department: string;
  employeeId: string;
  universityName: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  qualification?: string;
  specialization?: string;
  experience?: string;
  researchInterests?: string[];
  profileImage?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Tab panel component for organizing content
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const FacultyProfile: React.FC = () => {
  const { user } = useAuth();
  const { faculty, logout } = useFacultyAuth();
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<FacultyProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [editData, setEditData] = useState<Partial<FacultyProfile>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch faculty profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        
        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          showSnackbar('Authentication token not found. Please login again.', 'error');
          return;
        }
        
        // API call to fetch profile data
        const response = await axios.get(`${config.API_URL}/api/faculty/profile`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.data.success && response.data.faculty) {
          setProfileData(response.data.faculty);
        } else {
          // Fallback to data from context or localStorage
          const localUserData = localStorage.getItem('user');
          let userData = faculty;
          
          if (!userData && localUserData) {
            try {
              userData = JSON.parse(localUserData);
            } catch (error) {
              console.error('Error parsing user data from localStorage:', error);
            }
          }
          
          if (userData) {
            setProfileData({
              name: userData.name || 'Faculty Member',
              email: userData.email || 'faculty@example.com',
              department: userData.department || 'Computer Science',
              employeeId: userData.employeeId || 'FAC123456',
              universityName: userData.universityName || 'Edgile University'
            });
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        showSnackbar('Failed to load profile data', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfile();
  }, [faculty, showSnackbar]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing, reset form
      setIsEditing(false);
      setEditData({});
    } else {
      // Start editing, populate form with current data
      setIsEditing(true);
      setEditData(profileData || {});
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditData({
      ...editData,
      [name]: value
    });
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        showSnackbar('Authentication token not found. Please login again.', 'error');
        return;
      }
      
      // API call to update profile
      const response = await axios.post(`${config.API_URL}/api/faculty/profile/update`, editData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setProfileData({
          ...profileData!,
          ...editData
        });
        
        setIsEditing(false);
        showSnackbar('Profile updated successfully', 'success');
      } else {
        showSnackbar(response.data.message || 'Failed to update profile', 'error');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showSnackbar('Failed to update profile', 'error');
    } finally {
      setIsSubmitting(false);
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
      <Paper sx={{ p: 3, mb: 3, borderRadius: 1 }}>
        <Typography variant="h5" gutterBottom>
          Faculty Profile
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View and update your professional information
        </Typography>
      </Paper>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* Profile Summary Card */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 30%' } }}>
          <Paper sx={{ p: 3, borderRadius: 1, height: '100%' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Avatar 
                src={profileData?.profileImage} 
                alt={profileData?.name}
                sx={{ width: 100, height: 100, mb: 2 }}
              />
              <Typography variant="h6">
                {profileData?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {profileData?.employeeId}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {profileData?.department}
              </Typography>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Email
              </Typography>
              <Typography variant="body1">
                {profileData?.email}
              </Typography>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                University
              </Typography>
              <Typography variant="body1">
                {profileData?.universityName}
              </Typography>
            </Box>
            
            {profileData?.phone && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Phone
                </Typography>
                <Typography variant="body1">
                  {profileData?.phone}
                </Typography>
              </Box>
            )}
            
            <Button 
              variant="outlined" 
              fullWidth 
              onClick={handleEditToggle}
              sx={{ mt: 2 }}
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
            
            {isEditing && (
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth 
                onClick={handleSubmit}
                disabled={isSubmitting}
                sx={{ mt: 2 }}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            )}

            {/* Logout Button */}
            <Button
              variant="contained"
              color="error"
              fullWidth
              sx={{ mt: 2 }}
              onClick={() => {
                if (window.confirm('Are you sure you want to logout?')) {
                  logout();
                  navigate('/Login');
                }
              }}
            >
              Logout
            </Button>
          </Paper>
        </Box>
        
        {/* Main Content Area */}
        <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 70%' } }}>
          <Paper sx={{ borderRadius: 1 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={currentTab} onChange={handleTabChange}>
                <Tab label="Personal Information" />
                <Tab label="Academic & Experience" />
              </Tabs>
            </Box>
            
            {/* Personal Information Tab */}
            <TabPanel value={currentTab} index={0}>
              {!isEditing ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Full Name
                      </Typography>
                      <Typography variant="body1">
                        {profileData?.name}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Email
                      </Typography>
                      <Typography variant="body1">
                        {profileData?.email}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Phone
                      </Typography>
                      <Typography variant="body1">
                        {profileData?.phone || 'Not provided'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Date of Birth
                      </Typography>
                      <Typography variant="body1">
                        {profileData?.dateOfBirth ? new Date(profileData.dateOfBirth).toLocaleDateString() : 'Not provided'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Address
                      </Typography>
                      <Typography variant="body1">
                        {profileData?.address || 'Not provided'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ) : (
                // Edit Mode Form
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      name="name"
                      value={editData.name || ''}
                      onChange={handleInputChange}
                    />
                  </Box>
                  
                  <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                    <TextField
                      fullWidth
                      label="Email"
                      name="email"
                      value={editData.email || ''}
                      onChange={handleInputChange}
                      disabled
                      helperText="Email cannot be changed"
                    />
                  </Box>
                  
                  <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                    <TextField
                      fullWidth
                      label="Phone"
                      name="phone"
                      value={editData.phone || ''}
                      onChange={handleInputChange}
                    />
                  </Box>
                  
                  <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                    <TextField
                      fullWidth
                      label="Date of Birth"
                      name="dateOfBirth"
                      type="date"
                      value={editData.dateOfBirth || ''}
                      onChange={handleInputChange}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                  
                  <Box sx={{ width: '100%' }}>
                    <TextField
                      fullWidth
                      label="Address"
                      name="address"
                      value={editData.address || ''}
                      onChange={handleInputChange}
                      multiline
                      rows={2}
                    />
                  </Box>
                </Box>
              )}
            </TabPanel>
            
            {/* Academic & Experience Tab */}
            <TabPanel value={currentTab} index={1}>
              {!isEditing ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Department
                      </Typography>
                      <Typography variant="body1">
                        {profileData?.department}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Employee ID
                      </Typography>
                      <Typography variant="body1">
                        {profileData?.employeeId}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Qualification
                      </Typography>
                      <Typography variant="body1">
                        {profileData?.qualification || 'Not provided'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Specialization
                      </Typography>
                      <Typography variant="body1">
                        {profileData?.specialization || 'Not provided'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Experience
                      </Typography>
                      <Typography variant="body1">
                        {profileData?.experience || 'Not provided'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ) : (
                // Edit Mode Form
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                    <TextField
                      fullWidth
                      label="Department"
                      name="department"
                      value={editData.department || ''}
                      onChange={handleInputChange}
                    />
                  </Box>
                  
                  <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                    <TextField
                      fullWidth
                      label="Employee ID"
                      name="employeeId"
                      value={editData.employeeId || ''}
                      onChange={handleInputChange}
                      disabled
                      helperText="Employee ID cannot be changed"
                    />
                  </Box>
                  
                  <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                    <TextField
                      fullWidth
                      label="Qualification"
                      name="qualification"
                      value={editData.qualification || ''}
                      onChange={handleInputChange}
                    />
                  </Box>
                  
                  <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                    <TextField
                      fullWidth
                      label="Specialization"
                      name="specialization"
                      value={editData.specialization || ''}
                      onChange={handleInputChange}
                    />
                  </Box>
                  
                  <Box sx={{ width: '100%' }}>
                    <TextField
                      fullWidth
                      label="Experience"
                      name="experience"
                      value={editData.experience || ''}
                      onChange={handleInputChange}
                      multiline
                      rows={2}
                    />
                  </Box>
                </Box>
              )}
            </TabPanel>
          </Paper>
          
          {/* Password Change Section */}
          <Paper sx={{ p: 3, borderRadius: 1, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Security Settings
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Button 
              variant="outlined" 
              color="primary"
              onClick={() => navigate('/faculty/change-password')}
            >
              Change Password
            </Button>
          </Paper>
        </Box>
      </Box>
    </DashboardWrapper>
  );
};

export default FacultyProfile; 