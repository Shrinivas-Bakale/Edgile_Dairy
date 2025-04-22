import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  InputAdornment,
  CircularProgress,
  Container,
  Stepper,
  Step,
  StepLabel,
  IconButton,
} from '@mui/material';
import {
  IconUser,
  IconLock,
  IconEye,
  IconEyeOff,
  IconSchool,
  IconArrowLeft,
  IconCheck,
  IconMail,
  IconKey,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import InteractiveGridPattern from '../../components/InteractiveGridPattern';
import api from '../../utils/api';

type FormData = {
  email: string;
  universityCode: string;
  otp: string;
  password: string;
  confirmPassword: string;
};

// Password validation functions
const hasMinLength = (password: string) => password.length >= 8;
const hasUppercase = (password: string) => /[A-Z]/.test(password);
const hasLowercase = (password: string) => /[a-z]/.test(password);
const hasNumber = (password: string) => /\d/.test(password);
const hasSpecialChar = (password: string) => /[!@#$%^&*(),.?":{}|<>]/.test(password);

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<FormData>({
    email: '',
    universityCode: '',
    otp: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [studentId, setStudentId] = useState<string>('');
  
  // Password strength state
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Update password strength indicators
    if (name === 'password') {
      setPasswordStrength({
        hasMinLength: hasMinLength(value),
        hasUppercase: hasUppercase(value),
        hasLowercase: hasLowercase(value),
        hasNumber: hasNumber(value),
        hasSpecialChar: hasSpecialChar(value),
      });
    }
  };

  const handleRequestOTP = async () => {
    setError('');
    setLoading(true);

    if (!formData.email || !formData.universityCode) {
      setError('Email and University Code are required');
      setLoading(false);
      return;
    }

    try {
      // Request for OTP to reset password
      const response = await api.post('/student/auth/request-password-reset', {
        email: formData.email,
        universityCode: formData.universityCode,
      });

      showSnackbar('OTP sent to your email', 'success');
      setStudentId(response.data.studentId);
      setActiveStep(1);
    } catch (err: any) {
      console.error('Error requesting OTP:', err);
      setError(err.message || 'Failed to send OTP. Please check your details.');
      showSnackbar(err.message || 'Failed to send OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError('');
    setLoading(true);

    if (!formData.otp) {
      setError('OTP is required');
      setLoading(false);
      return;
    }

    try {
      // Verify OTP
      await api.post('/student/auth/verify-reset-otp', {
        studentId,
        otp: formData.otp,
      });

      showSnackbar('OTP verified successfully', 'success');
      setActiveStep(2);
    } catch (err: any) {
      console.error('Error verifying OTP:', err);
      setError(err.message || 'Invalid OTP. Please try again.');
      showSnackbar(err.message || 'Invalid OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setLoading(true);

    if (!formData.password || !formData.confirmPassword) {
      setError('Please enter and confirm your new password');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Check if all password requirements are met
    const allRequirementsMet = Object.values(passwordStrength).every(Boolean);
    if (!allRequirementsMet) {
      setError('Please ensure your password meets all requirements');
      setLoading(false);
      return;
    }

    try {
      // Reset password
      await api.post('/student/auth/reset-password', {
        studentId,
        password: formData.password,
      });

      showSnackbar('Password reset successful!', 'success');
      navigate('/login');
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setError(err.message || 'Failed to reset password. Please try again.');
      showSnackbar(err.message || 'Failed to reset password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    } else {
      navigate('/login');
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <>
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, color: 'white' }}>
              Reset Your Password
            </Typography>
            <Typography variant="body1" sx={{ mb: 4, color: 'rgba(255, 255, 255, 0.7)' }}>
              Enter your email and university code to receive a verification code
            </Typography>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              autoComplete="username"
              value={formData.email}
              onChange={handleChange}
              variant="outlined"
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconMail size={18} color="rgba(255, 255, 255, 0.7)" />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "rgba(255, 255, 255, 0.9)",
                  transition: "all 0.2s ease",
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(124, 58, 237, 0.5)",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255, 255, 255, 0.2)",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#7c3aed",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: "rgba(255, 255, 255, 0.7)",
                  "&.Mui-focused": {
                    color: "#7c3aed",
                  },
                },
              }}
            />
            <TextField
              fullWidth
              label="University Code"
              name="universityCode"
              value={formData.universityCode}
              onChange={handleChange}
              variant="outlined"
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSchool size={18} color="rgba(255, 255, 255, 0.7)" />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "rgba(255, 255, 255, 0.9)",
                  transition: "all 0.2s ease",
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(124, 58, 237, 0.5)",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255, 255, 255, 0.2)",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#7c3aed",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: "rgba(255, 255, 255, 0.7)",
                  "&.Mui-focused": {
                    color: "#7c3aed",
                  },
                },
              }}
            />
            <Button
              fullWidth
              variant="contained"
              disabled={loading}
              onClick={handleRequestOTP}
              sx={{
                mt: 3,
                py: 1.5,
                background: "linear-gradient(45deg, #7c3aed 30%, #60a5fa 90%)",
                boxShadow: "0 5px 15px rgba(124, 58, 237, 0.4)",
                fontWeight: 600,
                letterSpacing: "0.05em",
                border: "none",
                transition: "all 0.3s ease",
                "&:hover": {
                  background: "linear-gradient(45deg, #8b5cf6 30%, #3b82f6 90%)",
                  boxShadow: "0 8px 20px rgba(124, 58, 237, 0.5)",
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Send Verification Code"}
            </Button>
          </>
        );
      case 1:
        return (
          <>
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, color: 'white' }}>
              Enter Verification Code
            </Typography>
            <Typography variant="body1" sx={{ mb: 4, color: 'rgba(255, 255, 255, 0.7)' }}>
              A verification code has been sent to your email
            </Typography>
            <TextField
              fullWidth
              label="OTP Code"
              name="otp"
              value={formData.otp}
              onChange={handleChange}
              variant="outlined"
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconKey size={18} color="rgba(255, 255, 255, 0.7)" />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "rgba(255, 255, 255, 0.9)",
                  transition: "all 0.2s ease",
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(124, 58, 237, 0.5)",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255, 255, 255, 0.2)",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#7c3aed",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: "rgba(255, 255, 255, 0.7)",
                  "&.Mui-focused": {
                    color: "#7c3aed",
                  },
                },
              }}
            />
            <Button
              fullWidth
              variant="contained"
              disabled={loading}
              onClick={handleVerifyOTP}
              sx={{
                mt: 3,
                py: 1.5,
                background: "linear-gradient(45deg, #7c3aed 30%, #60a5fa 90%)",
                boxShadow: "0 5px 15px rgba(124, 58, 237, 0.4)",
                fontWeight: 600,
                letterSpacing: "0.05em",
                border: "none",
                transition: "all 0.3s ease",
                "&:hover": {
                  background: "linear-gradient(45deg, #8b5cf6 30%, #3b82f6 90%)",
                  boxShadow: "0 8px 20px rgba(124, 58, 237, 0.5)",
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Verify Code"}
            </Button>
          </>
        );
      case 2:
        return (
          <>
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, color: 'white' }}>
              Create New Password
            </Typography>
            <Typography variant="body1" sx={{ mb: 4, color: 'rgba(255, 255, 255, 0.7)' }}>
              Choose a strong, secure password
            </Typography>
            <TextField
              fullWidth
              label="New Password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              variant="outlined"
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconLock size={18} color="rgba(255, 255, 255, 0.7)" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                    >
                      {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "rgba(255, 255, 255, 0.9)",
                  transition: "all 0.2s ease",
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(124, 58, 237, 0.5)",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255, 255, 255, 0.2)",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#7c3aed",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: "rgba(255, 255, 255, 0.7)",
                  "&.Mui-focused": {
                    color: "#7c3aed",
                  },
                },
              }}
            />
            <TextField
              fullWidth
              label="Confirm Password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={handleChange}
              variant="outlined"
              margin="normal"
              required
              error={
                formData.confirmPassword !== '' &&
                formData.password !== formData.confirmPassword
              }
              helperText={
                formData.confirmPassword !== '' &&
                formData.password !== formData.confirmPassword
                  ? 'Passwords do not match'
                  : ''
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconLock size={18} color="rgba(255, 255, 255, 0.7)" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      sx={{ color: "rgba(255, 255, 255, 0.7)" }}
                    >
                      {showConfirmPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "rgba(255, 255, 255, 0.9)",
                  transition: "all 0.2s ease",
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(124, 58, 237, 0.5)",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255, 255, 255, 0.2)",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#7c3aed",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: "rgba(255, 255, 255, 0.7)",
                  "&.Mui-focused": {
                    color: "#7c3aed",
                  },
                },
                "& .MuiFormHelperText-root": {
                  color: "rgba(255, 87, 87, 0.8)",
                },
              }}
            />

            {/* Password strength indicators */}
            <Box sx={{ mt: 2, mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1, color: 'rgba(255, 255, 255, 0.7)' }}>
                Password Requirements:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: passwordStrength.hasMinLength ? 'green' : 'rgba(255, 255, 255, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <IconCheck 
                    size={16} 
                    style={{ 
                      marginRight: '4px',
                      color: passwordStrength.hasMinLength ? 'green' : 'rgba(255, 255, 255, 0.5)' 
                    }} 
                  />
                  At least 8 characters
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: passwordStrength.hasUppercase ? 'green' : 'rgba(255, 255, 255, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <IconCheck 
                    size={16} 
                    style={{ 
                      marginRight: '4px',
                      color: passwordStrength.hasUppercase ? 'green' : 'rgba(255, 255, 255, 0.5)' 
                    }} 
                  />
                  At least one uppercase letter
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: passwordStrength.hasLowercase ? 'green' : 'rgba(255, 255, 255, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <IconCheck 
                    size={16} 
                    style={{ 
                      marginRight: '4px',
                      color: passwordStrength.hasLowercase ? 'green' : 'rgba(255, 255, 255, 0.5)' 
                    }} 
                  />
                  At least one lowercase letter
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: passwordStrength.hasNumber ? 'green' : 'rgba(255, 255, 255, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <IconCheck 
                    size={16} 
                    style={{ 
                      marginRight: '4px',
                      color: passwordStrength.hasNumber ? 'green' : 'rgba(255, 255, 255, 0.5)' 
                    }} 
                  />
                  At least one number
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: passwordStrength.hasSpecialChar ? 'green' : 'rgba(255, 255, 255, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <IconCheck 
                    size={16} 
                    style={{ 
                      marginRight: '4px',
                      color: passwordStrength.hasSpecialChar ? 'green' : 'rgba(255, 255, 255, 0.5)' 
                    }} 
                  />
                  At least one special character
                </Typography>
              </Box>
            </Box>

            <Button
              fullWidth
              variant="contained"
              disabled={
                loading ||
                !Object.values(passwordStrength).every(Boolean) ||
                formData.password !== formData.confirmPassword ||
                !formData.confirmPassword
              }
              onClick={handleResetPassword}
              sx={{
                mt: 3,
                py: 1.5,
                background: "linear-gradient(45deg, #7c3aed 30%, #60a5fa 90%)",
                boxShadow: "0 5px 15px rgba(124, 58, 237, 0.4)",
                fontWeight: 600,
                letterSpacing: "0.05em",
                border: "none",
                transition: "all 0.3s ease",
                "&:hover": {
                  background: "linear-gradient(45deg, #8b5cf6 30%, #3b82f6 90%)",
                  boxShadow: "0 8px 20px rgba(124, 58, 237, 0.5)",
                },
                "&.Mui-disabled": {
                  background: "rgba(100, 100, 100, 0.3)",
                  color: "rgba(255, 255, 255, 0.5)",
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Reset Password"}
            </Button>
          </>
        );
      default:
        return "Unknown step";
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#080818",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Back button */}
      <IconButton
        onClick={handleGoBack}
        sx={{ 
          position: 'absolute', 
          top: 20, 
          left: 20, 
          zIndex: 10,
          color: 'white',
          backgroundColor: 'rgba(124, 58, 237, 0.2)',
          '&:hover': {
            backgroundColor: 'rgba(124, 58, 237, 0.4)',
          }
        }}
        aria-label="Go back"
      >
        <IconArrowLeft size={24} />
      </IconButton>

      {/* Background */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "hidden",
        }}
      >
        <InteractiveGridPattern 
          dotColor="rgba(124, 58, 237, 0.6)"
          dotSize={1.2}
          dotSpacing={28}
        />
      </Box>

      <Container maxWidth="sm" sx={{ p: 3, position: 'relative' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper
            elevation={5}
            sx={{
              p: 4,
              background: "rgba(15, 15, 25, 0.8)",
              backdropFilter: "blur(10px)",
              borderRadius: 3,
              border: "1px solid rgba(124, 58, 237, 0.2)",
            }}
          >
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              <Step>
                <StepLabel 
                  StepIconProps={{
                    sx: {
                      color: activeStep >= 0 ? '#7c3aed' : undefined,
                    }
                  }}
                >
                  <Typography sx={{ color: 'white' }}>Step 1</Typography>
                </StepLabel>
              </Step>
              <Step>
                <StepLabel
                  StepIconProps={{
                    sx: {
                      color: activeStep >= 1 ? '#7c3aed' : undefined,
                    }
                  }}
                >
                  <Typography sx={{ color: 'white' }}>Step 2</Typography>
                </StepLabel>
              </Step>
              <Step>
                <StepLabel
                  StepIconProps={{
                    sx: {
                      color: activeStep >= 2 ? '#7c3aed' : undefined,
                    }
                  }}
                >
                  <Typography sx={{ color: 'white' }}>Step 3</Typography>
                </StepLabel>
              </Step>
            </Stepper>

            {error && (
              <Typography color="#ff5c8d" align="center" variant="body2" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}

            {getStepContent(activeStep)}
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default ForgotPassword; 