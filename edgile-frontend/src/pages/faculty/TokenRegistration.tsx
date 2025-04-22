import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  CircularProgress, 
  Container,
  Paper,
  Stack,
  Divider,
  Chip,
  Alert
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { adminAPI } from '../../utils/api';

interface FormData {
  phone: string;
  dateOfBirth: string;
  address: string;
  qualification: string;
  specialization: string;
  experience: string;
  researchInterests: string[];
  newInterest: string;
  password: string;
  confirmPassword: string;
}

const TokenRegistration: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validToken, setValidToken] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    phone: '',
    dateOfBirth: '',
    address: '',
    qualification: '',
    specialization: '',
    experience: '',
    researchInterests: [] as string[],
    newInterest: '',
    password: '',
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

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('No registration token provided');
        setIsValidating(false);
        return;
      }

      try {
        // Here we would verify the token is valid with the backend
        // For now, we'll just set it as valid
        setValidToken(true);
        setIsValidating(false);
      } catch (error: any) {
        console.error('Error validating token:', error);
        setError('Invalid or expired registration token');
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Check password validity when it changes
    if (name === 'password') {
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
      if (!token) {
        throw new Error('Registration token is missing');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (!validatePassword(formData.password)) {
        throw new Error('Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character (@$!%*?&)');
      }

      if (!formData.dateOfBirth) {
        throw new Error('Date of birth is required');
      }

      if (formData.researchInterests.length === 0) {
        throw new Error('At least one research interest is required');
      }

      // Call the API to complete registration
      await adminAPI.completeFacultyRegistration(token, {
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address,
        qualification: formData.qualification,
        specialization: formData.specialization,
        experience: formData.experience,
        researchInterests: formData.researchInterests,
        password: formData.password
      });

      showSnackbar('Registration completed successfully!', 'success');
      navigate('/login', { replace: true });
    } catch (error: any) {
      console.error('Registration completion error:', error);
      setError(error.message || 'Failed to complete registration');
      showSnackbar(error.message || 'Failed to complete registration', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!validToken) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h5" gutterBottom color="error">
            Invalid Registration Link
          </Typography>
          <Typography variant="body1" paragraph>
            This registration link is invalid or has expired. Please contact your administrator for assistance.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/login')}>
            Go to Login
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Typography variant="h4" gutterBottom align="center" sx={{ mb: 3 }}>
          Complete Your Faculty Registration
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {/* Password Section */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Set Your Password
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="New Password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  error={formData.password.length > 0 && !passwordValid}
                  helperText={
                    formData.password.length > 0 && !passwordValid 
                      ? "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character (@$!%*?&)" 
                      : "Password must be at least 8 characters"
                  }
                />
                <TextField
                  label="Confirm Password"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  error={formData.password !== formData.confirmPassword && formData.confirmPassword !== ''}
                  helperText={formData.password !== formData.confirmPassword && formData.confirmPassword !== '' ? "Passwords don't match" : ""}
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
              {isLoading ? <CircularProgress size={24} /> : "Complete Registration"}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};

export default TokenRegistration; 