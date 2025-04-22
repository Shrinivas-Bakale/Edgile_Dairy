import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  CircularProgress, 
  Dialog, 
  DialogContent, 
  DialogTitle,
  Stack,
  Divider,
  Chip,
  Alert
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { facultyAPI } from '../../utils/api';
import { useFacultyAuth } from '../../contexts/FacultyAuthContext';

interface RegistrationModalProps {
  open: boolean;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({ open }) => {
  const { showSnackbar } = useSnackbar();
  const { updateActivationStatus } = useFacultyAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    phone: '',
    dateOfBirth: '',
    address: '',
    qualification: '',
    specialization: '',
    experience: '',
    researchInterests: [] as string[],
    newInterest: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Password validation function matching the backend
  const validatePassword = (password: string) => {
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };
  
  // Password strength state
  const [passwordValid, setPasswordValid] = useState<boolean>(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Check password validity when it changes
    if (name === 'newPassword') {
      setPasswordValid(validatePassword(value));
    }
  };

  const handleAddInterest = () => {
    if (formData.newInterest.trim()) {
      setFormData(prev => ({
        ...prev,
        researchInterests: [...prev.researchInterests, formData.newInterest.trim()],
        newInterest: ''
      }));
    }
  };

  const handleDeleteInterest = (interestToDelete: string) => {
    setFormData(prev => ({
      ...prev,
      researchInterests: prev.researchInterests.filter(interest => interest !== interestToDelete)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Check if we have a token before proceeding
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      if (!formData.dateOfBirth) {
        throw new Error('Date of birth is required');
      }

      if (formData.newPassword !== formData.confirmPassword) {
        throw new Error('New passwords do not match');
      }

      // Validate password strength
      if (!validatePassword(formData.newPassword)) {
        throw new Error('Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character (@$!%*?&)');
      }

      if (formData.researchInterests.length === 0) {
        throw new Error('At least one research interest is required');
      }

      console.log('Submitting registration data...');

      // First change the password
      await facultyAPI.changePassword(formData.currentPassword, formData.newPassword);
      console.log('Password changed successfully');

      // Then complete the profile
      const response = await facultyAPI.completeProfile({
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address,
        qualification: formData.qualification,
        specialization: formData.specialization,
        experience: formData.experience,
        researchInterests: formData.researchInterests
      });
      
      console.log('Profile completed successfully:', response);

      // Update activation status in context and localStorage
      updateActivationStatus(true);

      showSnackbar('Account activated successfully!', 'success');
      
      // Force page reload to reflect new activation status
      window.location.reload();
    } catch (error: any) {
      console.error('Registration completion error:', error);
      setError(error.message || 'Failed to activate account');
      showSnackbar(error.message || 'Failed to activate account', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      maxWidth="md"
      fullWidth
      // No onClose prop - prevent closing until completed
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
        }
      }}
    >
      <DialogTitle sx={{ 
        borderBottom: '1px solid', 
        borderColor: 'divider',
        pb: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center' 
      }}>
        <Typography variant="h5" component="div" fontWeight="bold">
          Complete Your Registration
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          You must complete your profile before accessing the dashboard
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {/* Password Change Section */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Change Password
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Current Password"
                  type="password"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  required
                  fullWidth
                />
                <TextField
                  label="New Password"
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  error={formData.newPassword.length > 0 && !passwordValid}
                  helperText={
                    formData.newPassword.length > 0 && !passwordValid 
                      ? "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character (@$!%*?&)" 
                      : "Password must be at least 8 characters"
                  }
                />
                <TextField
                  label="Confirm New Password"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  error={formData.newPassword !== formData.confirmPassword && formData.confirmPassword !== ''}
                  helperText={formData.newPassword !== formData.confirmPassword && formData.confirmPassword !== '' ? "Passwords don't match" : ""}
                />
              </Stack>
            </Box>

            <Divider />

            {/* Profile Information Section */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Profile Information
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  fullWidth
                />
                <TextField
                  label="Date of Birth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  multiline
                  rows={3}
                />
                <TextField
                  label="Qualification"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleInputChange}
                  required
                  fullWidth
                />
                <TextField
                  label="Specialization"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleInputChange}
                  required
                  fullWidth
                />
                <TextField
                  label="Experience (Years)"
                  name="experience"
                  type="number"
                  value={formData.experience}
                  onChange={handleInputChange}
                  required
                  fullWidth
                />
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Research Interests
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <TextField
                      label="Add Research Interest"
                      name="newInterest"
                      value={formData.newInterest}
                      onChange={handleInputChange}
                      fullWidth
                    />
                    <Button
                      variant="contained"
                      onClick={handleAddInterest}
                      disabled={!formData.newInterest.trim()}
                    >
                      Add
                    </Button>
                  </Stack>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    {formData.researchInterests.map((interest) => (
                      <Chip
                        key={interest}
                        label={interest}
                        onDelete={() => handleDeleteInterest(interest)}
                      />
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isLoading}
              color="primary"
              sx={{ mt: 3 }}
            >
              {isLoading ? <CircularProgress size={24} /> : "Activate Account"}
            </Button>
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RegistrationModal; 