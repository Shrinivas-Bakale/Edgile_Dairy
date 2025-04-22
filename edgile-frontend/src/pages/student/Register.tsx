import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { studentAuthAPI, verifyUniversityCode } from '../../utils/api';
import { useStudentAuth } from '../../contexts/StudentAuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  IconButton,
  InputAdornment,
  CircularProgress,
  Container,
  Stepper,
  Step,
  StepLabel,
  FormHelperText,
  Alert,
  Fade,
  Stack,
  Divider,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  MenuItem,
  useMediaQuery,
} from '@mui/material';
import {
  IconUser,
  IconMail,
  IconKey,
  IconLock,
  IconEye,
  IconEyeOff,
  IconSchool,
  IconNumber123,
  IconPhone,
  IconArrowLeft,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import InteractiveGridPattern from '../../components/InteractiveGridPattern';
import { useTheme } from '@mui/material/styles';

const StudentRegister: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useStudentAuth();
  const { showSnackbar } = useSnackbar();
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    registerNumber: '',
    universityCode: '',
    division: 'A1', // Default division
    classYear: 1,   // Default class year
    semester: 1,    // Default semester
    phone: '',      // Phone number
    password: '',
    confirmPassword: ''
  });
  
  // Validation states
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    registerNumber: '',
    universityCode: '',
    division: '',
    classYear: '',
    semester: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  
  // University data state
  const [universityData, setUniversityData] = useState<{
    name: string;
    verified: boolean;
  } | null>(null);
  
  // OTP states
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  
  // Other states
  const [loading, setLoading] = useState(false);
  const [universityLoading, setUniversityLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [studentId, setStudentId] = useState('');
  
  // Password strength indicators
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  });
  
  // Login data state
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
    universityCode: ''
  });
  
  // Error message state
  const [errorMessage, setErrorMessage] = useState('');
  
  // Error dialog state
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  
  // Add a common text field styling object to be used across all fields
  const commonTextFieldSx = {
    "& .MuiOutlinedInput-root": {
      color: "rgba(255, 255, 255, 0.8)",
      transition: "all 0.2s ease",
      "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: "rgba(124, 58, 237, 0.4)",
      },
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: "rgba(255, 255, 255, 0.15)",
      },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderColor: "rgba(124, 58, 237, 0.7)",
      },
    },
    "& .MuiInputLabel-root": {
      color: "rgba(255, 255, 255, 0.6)",
      "&.Mui-focused": {
        color: "rgba(124, 58, 237, 0.8)",
      },
    },
    "& .MuiFormHelperText-root": {
      color: "rgba(255, 255, 255, 0.4)",
    },
    "& .MuiFormHelperText-root.Mui-error": {
      color: "rgba(239, 83, 80, 0.7)",
    },
  };
  
  // Update the common button styling to be more subtle
  const commonButtonSx = {
    py: 1.2,
    background: "linear-gradient(45deg, #7c3aed 30%, #3b82f6 90%)",
    boxShadow: "0 2px 8px rgba(124, 58, 237, 0.3)",
    fontWeight: 600,
    letterSpacing: "0.03em",
    border: "none",
    transition: "all 0.2s ease",
    "&:hover": {
      background: "linear-gradient(45deg, #8b5cf6 30%, #60a5fa 90%)",
      boxShadow: "0 3px 10px rgba(124, 58, 237, 0.4)",
    },
  };
  
  // Common outlined button style for back buttons
  const outlinedButtonSx = {
    color: 'rgba(255, 255, 255, 0.7)',
    borderColor: 'rgba(124, 58, 237, 0.2)',
    '&:hover': {
      borderColor: 'rgba(124, 58, 237, 0.3)',
      backgroundColor: 'rgba(124, 58, 237, 0.05)',
    }
  };
  
  // Validate email domain
  const validateEmail = (email: string) => {
    if (!email) {
      return 'Email is required';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Invalid email format';
    }
    
    if (!email.endsWith('@klebcahubli.in')) {
      return 'Only @klebcahubli.in email addresses are allowed';
    }
    
    return '';
  };
  
  // Validate university code
  useEffect(() => {
    const verifyUniCode = async () => {
      if (!formData.universityCode || formData.universityCode.length < 5) {
        setUniversityData(null);
        return;
      }
      
      setUniversityLoading(true);
      try {
        const response = await verifyUniversityCode(formData.universityCode);
        if (response.verified) {
          setUniversityData({
            name: response.universityName,
            verified: true
          });
          setErrors({...errors, universityCode: ''});
        } else {
          setUniversityData(null);
          setErrors({...errors, universityCode: response.message || 'Invalid university code'});
        }
      } catch (err: any) {
        setUniversityData(null);
        setErrors({...errors, universityCode: err.message || 'Invalid university code'});
      } finally {
        setUniversityLoading(false);
      }
    };
    
    const debounceTimeout = setTimeout(() => {
      if (formData.universityCode) {
        verifyUniCode();
      }
    }, 500);
    
    return () => clearTimeout(debounceTimeout);
  }, [formData.universityCode]);
  
  // Validate password
  useEffect(() => {
    const password = formData.password;
    
    const passwordRequirements = {
      hasMinLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    setPasswordStrength(passwordRequirements);
    
    // Check if all password requirements are met
    const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);
    
    // Update password error only if we have a password entered
    if (password) {
      if (allRequirementsMet) {
        setErrors(prev => ({...prev, password: ''}));
      } else {
        setErrors(prev => ({...prev, password: 'Password must meet all the requirements'}));
      }
    }
    
    // Validate confirm password
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      setErrors(prev => ({...prev, confirmPassword: 'Passwords do not match'}));
    } else {
      setErrors(prev => ({...prev, confirmPassword: ''}));
    }
  }, [formData.password, formData.confirmPassword]);
  
  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Handle different field types
    if (name === 'classYear' || name === 'semester') {
      // Convert to number for number fields
      const numValue = parseInt(value, 10);
      setFormData({ ...formData, [name]: isNaN(numValue) ? '' : numValue });
    } else {
      // Regular string value for other fields
      setFormData({ ...formData, [name]: value });
    }
    
    // Basic validation for required fields
    switch (name) {
      case 'email':
        setErrors({...errors, email: validateEmail(value)});
        break;
      case 'name':
        setErrors({...errors, name: value ? '' : 'Name is required'});
        break;
      case 'registerNumber':
        setErrors({...errors, registerNumber: value ? '' : 'Register number is required'});
        break;
      case 'phone':
        setErrors({...errors, phone: /^\d{10}$/.test(value) ? '' : 'Valid 10-digit phone number is required'});
        break;
      case 'password':
        const passwordError = validatePassword(value);
        setErrors({...errors, password: passwordError});
        break;
    }
  };
  
  // Validate password
  const validatePassword = (password: string) => {
    if (!password) {
      return 'Password is required';
    }
    
    // Check each requirement separately
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    // All requirements must be met
    const allRequirementsMet = hasMinLength && hasUppercase && hasLowercase && 
                               hasNumber && hasSpecialChar;
                               
    if (!allRequirementsMet) {
      return 'Password must meet all the requirements';
    }
    
    return '';
  };
  
  // Handle OTP field changes
  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers
    if (/^\d*$/.test(value)) {
      setOtp(value);
      setOtpError('');
    }
  };
  
  // Step 1: Initial verification
  const handleVerifyDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate only the first step fields
    const newErrors = {
      name: formData.name ? '' : 'Name is required',
      email: validateEmail(formData.email),
      registerNumber: formData.registerNumber ? '' : 'Register number is required',
      universityCode: !universityData?.verified ? 'Valid university code is required' : '',
      // Don't validate other fields yet
      division: '',
      classYear: '',
      semester: '',
      phone: '',
      password: '',
      confirmPassword: ''
    };
    
    setErrors(newErrors);
    
    // Check if there are any errors in the first step fields only
    const hasErrors = newErrors.name !== '' || newErrors.email !== '' || 
                     newErrors.registerNumber !== '' || newErrors.universityCode !== '';
    
    if (hasErrors) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await studentAuthAPI.verifyCode({
        name: formData.name,
        email: formData.email,
        registerNumber: formData.registerNumber,
        universityCode: formData.universityCode,
        division: formData.division,
        classYear: formData.classYear,
        semester: formData.semester,
        phone: formData.phone
      });
      
      setStudentId(response.studentId);
      
      if (response.resuming) {
        showSnackbar('Continuing your previous registration. OTP has been sent to your email', 'info');
      } else {
        showSnackbar('OTP has been sent to your email', 'success');
      }
      
      setActiveStep(1);
    } catch (err: any) {
      // Check if this is an already registered account
      if (err.message?.includes('already registered')) {
        showSnackbar(err.message, 'info');
        // Redirect to login page after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        showSnackbar(err.message || 'Failed to verify details. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp) {
      setOtpError('OTP is required');
      return;
    }
    
    setLoading(true);
    
    try {
      await studentAuthAPI.verifyOtp({
        studentId,
        otp
      });
      
      setOtpVerified(true);
      showSnackbar('OTP verified successfully', 'success');
      setActiveStep(2);
    } catch (err: any) {
      setOtpError(err.message || 'Invalid OTP. Please try again.');
      showSnackbar(err.message || 'Invalid OTP. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Step 3: Set password and complete registration
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    // Check if all password requirements are met
    const allRequirementsMet = Object.values(passwordStrength).every(Boolean);
    
    if (!allRequirementsMet) {
      setErrors(prev => ({
        ...prev, 
        password: 'Password must meet all the requirements'
      }));
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setErrors(prev => ({
        ...prev, 
        confirmPassword: 'Passwords do not match'
      }));
      return;
    }
    
    setLoading(true);
    
    try {
      // Call the API to complete registration
      const response = await studentAuthAPI.completeRegistration({
        studentId,
        password: formData.password
      });
      
      // Handle successful registration
      setLoading(false);
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
      
      // Store credentials for auto-login
      setLoginData({
        email: formData.email,
        password: formData.password,
        universityCode: formData.universityCode
      });
      
    } catch (error: any) {
      setLoading(false);
      setErrorMessage(error.message || "An error occurred during registration");
      setErrorDialogOpen(true);
    }
  };
  
  // Function to handle login after successful registration
  const handleLogin = async () => {
    if (loginData) {
      try {
        // Call login function with correct parameters
        await login(loginData.email, loginData.password, loginData.universityCode);
        navigate('/student/dashboard');
      } catch (error: any) {
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  };
  
  // Handle go back
  const handleGoBack = () => {
    if (activeStep === 0) {
      // Force reload when going back to landing page
      window.location.href = '/';
    } else {
      setActiveStep(activeStep - 1);
    }
  };
  
  // Render steps
  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <form onSubmit={handleVerifyDetails}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  error={!!errors.name}
                  helperText={errors.name}
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconUser size={18} color="rgba(255, 255, 255, 0.7)" />
                      </InputAdornment>
                    ),
                  }}
                  variant="outlined"
                  required
                  sx={commonTextFieldSx}
                />
              </Box>
              
              <Box>
                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={formData.email}
                  onChange={handleChange}
                  error={!!errors.email}
                  helperText={errors.email || "Use your college email (@klebcahubli.in)"}
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconMail size={18} color="rgba(255, 255, 255, 0.7)" />
                      </InputAdornment>
                    ),
                  }}
                  variant="outlined"
                  required
                  sx={commonTextFieldSx}
                />
              </Box>
              
              <Box>
                <TextField
                  fullWidth
                  label="Register Number"
                  name="registerNumber"
                  value={formData.registerNumber}
                  onChange={handleChange}
                  error={!!errors.registerNumber}
                  helperText={errors.registerNumber}
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconNumber123 size={18} color="rgba(255, 255, 255, 0.7)" />
                      </InputAdornment>
                    ),
                  }}
                  variant="outlined"
                  required
                  sx={commonTextFieldSx}
                />
              </Box>
              
              <Box>
                <TextField
                  fullWidth
                  label="University Code"
                  name="universityCode"
                  value={formData.universityCode}
                  onChange={handleChange}
                  error={!!errors.universityCode}
                  helperText={errors.universityCode}
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconSchool size={18} color="rgba(255, 255, 255, 0.7)" />
                      </InputAdornment>
                    ),
                    endAdornment: universityLoading ? (
                      <CircularProgress color="inherit" size={20} />
                    ) : universityData ? (
                      <Fade in={!!universityData.verified}>
                        <Box component="span" sx={{ color: 'success.main' }}>
                          ✓
                        </Box>
                      </Fade>
                    ) : null,
                  }}
                  variant="outlined"
                  required
                  sx={commonTextFieldSx}
                />
              </Box>
              
              {universityData?.verified && (
                <Alert 
                  severity="success" 
                  sx={{ 
                    mb: 2, 
                    backgroundColor: 'rgba(46, 125, 50, 0.1)', 
                    color: 'rgba(206, 246, 206, 0.9)',
                    '& .MuiAlert-icon': {
                      color: 'rgba(76, 175, 80, 0.9)'
                    }
                  }}
                >
                  University: {universityData.name}
                </Alert>
              )}
              
              <Box>
                <TextField
                  fullWidth
                  label="Class Year"
                  name="classYear"
                  type="number"
                  value={formData.classYear}
                  onChange={handleChange}
                  error={!!errors.classYear}
                  helperText={errors.classYear}
                  disabled={loading}
                  InputProps={{
                    inputProps: { min: 1, max: 3 },
                    sx: commonTextFieldSx
                  }}
                  variant="outlined"
                  required
                />
              </Box>
              
              <Box>
                <TextField
                  fullWidth
                  label="Semester"
                  name="semester"
                  type="number"
                  value={formData.semester}
                  onChange={handleChange}
                  error={!!errors.semester}
                  helperText={errors.semester}
                  disabled={loading}
                  InputProps={{
                    inputProps: { min: 1, max: 6 },
                    sx: commonTextFieldSx
                  }}
                  variant="outlined"
                  required
                />
              </Box>
              
              <Box>
                <TextField
                  fullWidth
                  select
                  label="Division"
                  name="division"
                  value={formData.division}
                  onChange={handleChange}
                  error={!!errors.division}
                  helperText={errors.division}
                  disabled={loading}
                  variant="outlined"
                  required
                  sx={commonTextFieldSx}
                >
                  {["A1", "A2", "A3", "A4", "A5", "A6"].map(option => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              
              <Box>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  error={!!errors.phone}
                  helperText={errors.phone || "10-digit phone number"}
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconPhone size={18} color="rgba(255, 255, 255, 0.7)" />
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{ maxLength: 10, pattern: "[0-9]{10}" }}
                  variant="outlined"
                  required
                  sx={commonTextFieldSx}
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  sx={{ ...commonButtonSx, px: 4 }}
                  disabled={loading || !universityData?.verified}
                  endIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  CONTINUE
                </Button>
              </Box>
            </Box>
          </form>
        );
        
      case 1:
        return (
          <form onSubmit={handleVerifyOtp}>
            <Typography variant="body1" gutterBottom sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              We've sent a verification code to <strong style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{formData.email}</strong>. 
              Please check your email and enter the code below.
            </Typography>
            
            <Box sx={{ my: 3 }}>
              <TextField
                fullWidth
                label="Verification Code (OTP)"
                value={otp}
                onChange={handleOtpChange}
                error={!!otpError}
                helperText={otpError}
                disabled={loading}
                inputProps={{ maxLength: 6 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconKey size={18} color="rgba(255, 255, 255, 0.7)" />
                    </InputAdornment>
                  ),
                }}
                variant="outlined"
                required
                sx={commonTextFieldSx}
              />
            </Box>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button 
                onClick={handleGoBack}
                disabled={loading}
                variant="outlined"
                sx={outlinedButtonSx}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading || !otp}
                sx={commonButtonSx}
              >
                {loading ? <CircularProgress size={24} /> : 'Verify OTP'}
              </Button>
            </Box>
          </form>
        );
        
      case 2:
        return (
          <form onSubmit={handleCompleteRegistration}>
            <Typography variant="body1" gutterBottom sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Create a strong password to secure your account.
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box>
                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  error={!!formData.password && !!errors.password}
                  helperText={formData.password && errors.password ? errors.password : ''}
                  disabled={loading}
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
                        >
                          {showPassword ? <IconEyeOff size={18} color="rgba(255, 255, 255, 0.7)" /> : <IconEye size={18} color="rgba(255, 255, 255, 0.7)" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  variant="outlined"
                  required
                  sx={commonTextFieldSx}
                />
              </Box>
              
              <Box>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="rgba(255, 255, 255, 0.5)">
                    Password must meet the following requirements:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ml: 2, mt: 0.5 }}>
                    <Typography variant="caption" color={passwordStrength.hasMinLength ? 'rgba(76, 175, 80, 0.8)' : 'rgba(255, 255, 255, 0.4)'}>
                      {passwordStrength.hasMinLength ? '✓' : '○'} At least 8 characters
                    </Typography>
                    <Typography variant="caption" color={passwordStrength.hasUppercase ? 'rgba(76, 175, 80, 0.8)' : 'rgba(255, 255, 255, 0.4)'}>
                      {passwordStrength.hasUppercase ? '✓' : '○'} Contains uppercase letter
                    </Typography>
                    <Typography variant="caption" color={passwordStrength.hasLowercase ? 'rgba(76, 175, 80, 0.8)' : 'rgba(255, 255, 255, 0.4)'}>
                      {passwordStrength.hasLowercase ? '✓' : '○'} Contains lowercase letter
                    </Typography>
                    <Typography variant="caption" color={passwordStrength.hasNumber ? 'rgba(76, 175, 80, 0.8)' : 'rgba(255, 255, 255, 0.4)'}>
                      {passwordStrength.hasNumber ? '✓' : '○'} Contains number
                    </Typography>
                    <Typography variant="caption" color={passwordStrength.hasSpecialChar ? 'rgba(76, 175, 80, 0.8)' : 'rgba(255, 255, 255, 0.4)'}>
                      {passwordStrength.hasSpecialChar ? '✓' : '○'} Contains special character
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              <Box>
                <TextField
                  fullWidth
                  label="Confirm Password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                  disabled={loading || 
                            !passwordStrength.hasMinLength || 
                            !passwordStrength.hasUppercase || 
                            !passwordStrength.hasLowercase || 
                            !passwordStrength.hasNumber || 
                            !passwordStrength.hasSpecialChar}
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
                        >
                          {showConfirmPassword ? <IconEyeOff size={18} color="rgba(255, 255, 255, 0.7)" /> : <IconEye size={18} color="rgba(255, 255, 255, 0.7)" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  variant="outlined"
                  required
                  sx={commonTextFieldSx}
                />
              </Box>
            </Box>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button 
                onClick={handleGoBack}
                disabled={loading}
                variant="outlined"
                sx={outlinedButtonSx}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading || 
                  !passwordStrength.hasMinLength || 
                  !passwordStrength.hasUppercase || 
                  !passwordStrength.hasLowercase || 
                  !passwordStrength.hasNumber || 
                  !passwordStrength.hasSpecialChar ||
                  formData.password !== formData.confirmPassword ||
                  !formData.confirmPassword}
                sx={commonButtonSx}
              >
                {loading ? <CircularProgress size={24} /> : 'Complete Registration'}
              </Button>
            </Box>
          </form>
        );
        
      default:
        return <div>Unknown step</div>;
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
        backgroundColor: "#0f1120",
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
          backgroundColor: 'rgba(124, 58, 237, 0.1)',
          '&:hover': {
            backgroundColor: 'rgba(124, 58, 237, 0.2)',
          }
        }}
        aria-label="Go back to login page"
      >
        <IconArrowLeft size={24} />
      </IconButton>

      {/* Background Patterns and Effects - with reduced intensity */}
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
        {/* Primary Grid Pattern - reduced opacity */}
        <InteractiveGridPattern 
          dotColor="rgba(124, 58, 237, 0.3)"
          dotSize={1}
          dotSpacing={32}
          dotOpacity={0.3}
          blur={0.6}
          speed={0.04}
          sx={{
            inset: 0,
            height: "200%",
            width: "200%",
            transform: "translate(-25%, -25%) skewY(-8deg)",
            transformOrigin: "top left",
          }}
        />

        {/* Secondary Grid Pattern - reduced opacity */}
        <InteractiveGridPattern 
          dotColor="rgba(59, 130, 246, 0.25)"
          dotSize={1.5}
          dotSpacing={50}
          dotOpacity={0.2}
          blur={1}
          speed={0.02}
          sx={{
            inset: 0,
            height: "200%",
            width: "200%",
            transform: "translate(-10%, -10%) skewY(8deg)",
            transformOrigin: "bottom right",
          }}
        />

        {/* Simpler radial gradient */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at center, transparent 20%, #0f1120 80%)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      </Box>

      <Container maxWidth="sm" sx={{ 
        display: "flex", 
        justifyContent: "center", 
        position: "relative",
        zIndex: 5,
        py: { xs: 2, sm: 3, md: 4 },
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ 
            width: "100%",
            maxWidth: "100%",
            position: "relative",
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3, md: 3.5 },
              width: "100%",
              borderRadius: 2,
              backgroundColor: "rgba(16, 16, 28, 0.65)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              position: "relative",
              zIndex: 1,
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
              overflow: "hidden",
            }}
          >
            {/* Simplified gradient overlay */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "linear-gradient(135deg, rgba(120, 85, 230, 0.05) 0%, rgba(59, 130, 246, 0.03) 100%)",
                pointerEvents: "none",
                zIndex: -1,
              }}
            />

            <Typography
              variant="h4"
              component="h1"
              align="center"
              gutterBottom
              sx={{
                fontWeight: 600,
                background: "linear-gradient(45deg, #8c5cf7 30%, #70a5fa 90%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 1px 5px rgba(124, 58, 237, 0.2)",
                mb: 1,
                letterSpacing: "-0.01em",
              }}
            >
              Student Registration
            </Typography>

            <Stepper 
              activeStep={activeStep} 
              sx={{ 
                mt: 3, 
                mb: 3,
                "& .MuiStepLabel-label": {
                  color: "rgba(255, 255, 255, 0.7)",
                },
                "& .MuiStepIcon-root": {
                  color: "rgba(124, 58, 237, 0.5)",
                },
                "& .MuiStepIcon-root.Mui-active": {
                  color: "#7c3aed",
                },
                "& .MuiStepIcon-root.Mui-completed": {
                  color: "#7c3aed",
                }
              }}
            >
              <Step>
                <StepLabel>Account Details</StepLabel>
              </Step>
              <Step>
                <StepLabel>Verify Email</StepLabel>
              </Step>
              <Step>
                <StepLabel>Set Password</StepLabel>
              </Step>
            </Stepper>
            
            <Box sx={{ mt: 2 }}>
              {getStepContent(activeStep)}
            </Box>
          </Paper>
          
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2" color="rgba(255, 255, 255, 0.5)">
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'rgba(124, 58, 237, 0.9)', fontWeight: '500', textDecoration: 'none' }}>
                Sign in
              </Link>
            </Typography>
          </Box>
        </motion.div>
      </Container>
      
      {/* Error Dialog */}
      <Dialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Registration Error"}</DialogTitle>
        <DialogContent>
          <Typography variant="body1">{errorMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorDialogOpen(false)} color="primary" autoFocus>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentRegister; 