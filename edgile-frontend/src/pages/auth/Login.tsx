import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useFacultyAuth } from "../../contexts/FacultyAuthContext";
import { useTheme } from "@mui/material/styles";
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
  useMediaQuery,
} from "@mui/material";
import {
  IconUser,
  IconLock,
  IconEye,
  IconEyeOff,
  IconBuildingCommunity,
  IconArrowLeft,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import InteractiveGridPattern from "../../components/InteractiveGridPattern";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: facultyLogin } = useFacultyAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [universityCode, setUniversityCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Clear any existing tokens on component mount to ensure fresh login
  useEffect(() => {
    // Only clear storage if user is explicitly logging in, not if redirected
    // from a protected route that requires authentication
    const isRedirected = location.state && location.state.from;
    
    if (!isRedirected) {
      console.log('Clearing authentication data on login page load');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } else {
      console.log('Redirected to login - preserving auth data');
    }
    
    // Add event listener to clear sensitive data on page refresh
    const handleBeforeUnload = () => {
      sessionStorage.removeItem('password');
      sessionStorage.removeItem('credentials');
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      console.log("Attempting login with:", { email, role: "faculty" });

      if (!universityCode) {
        throw new Error("University code is required");
      }
      
      try {
        console.log("Making faculty login API call with university code...");
        // Faculty login - returns token, user, etc. - pass universityCode
        const facultyResponse = await facultyLogin(email, password, universityCode);
        console.log('Faculty login response received:', facultyResponse);
        
        // Clear password from memory after successful login
        setPassword("");
        
        // Make sure data is stored in localStorage before redirect
        // (this should already be done in the facultyLogin function)
        if (!localStorage.getItem('token') || !localStorage.getItem('user')) {
          console.log('Ensuring auth data is stored in localStorage');
          localStorage.setItem('token', facultyResponse.token);
          localStorage.setItem('user', JSON.stringify(facultyResponse.user));
        }
        
        // Use a short timeout to ensure localStorage is updated before navigating
        console.log('Faculty login successful - redirecting to dashboard');
        
        setTimeout(() => {
          // Use navigate for better state handling
          navigate('/faculty/dashboard', { replace: true });
        }, 100);
        
        return;
      } catch (facultyError: unknown) {
        console.error("Faculty login error:", facultyError);
        throw facultyError;
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      
      // Get the error message
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      
      // Show error message in UI and snackbar, but never refresh the page
      setError(errorMessage);
      
      // Keep form inputs intact for the user to correct
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate('/');
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f0f9ff", // Light blue background
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
          color: '#1e40af', // Dark blue color
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          '&:hover': {
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
          },
          transition: 'all 0.2s ease'
        }}
        aria-label="Go back to landing page"
      >
        <IconArrowLeft size={24} />
      </IconButton>

      {/* Background Elements */}
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
        {/* Decorative elements */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "40%",
            height: "40%",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)",
            borderBottomLeftRadius: "100%",
            opacity: 0.7,
            zIndex: 0,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "35%",
            height: "35%",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)",
            borderTopRightRadius: "100%",
            opacity: 0.7,
            zIndex: 0,
          }}
        />

        {/* Primary Grid Pattern */}
        <InteractiveGridPattern 
          dotColor="rgba(59, 130, 246, 0.6)" // Blue color
          dotSize={1.2}
          dotSpacing={30}
          dotOpacity={0.3}
          blur={0.8}
          speed={0.05}
          sx={{
            inset: 0,
            height: "200%",
            width: "200%",
            transform: "translate(-25%, -25%) skewY(-12deg)",
            transformOrigin: "top left",
            opacity: 0.5,
          }}
        />

        {/* Secondary Grid Pattern */}
        <InteractiveGridPattern 
          dotColor="rgba(37, 99, 235, 0.5)" // Darker blue
          dotSize={1.5}
          dotSpacing={45}
          dotOpacity={0.2}
          blur={1.5}
          speed={0.03}
          sx={{
            inset: 0,
            height: "200%",
            width: "200%",
            transform: "translate(-10%, -10%) skewY(12deg)",
            transformOrigin: "bottom right",
            opacity: 0.5,
          }}
        />
      </Box>

      {/* Login Form */}
      <Container maxWidth="xs" sx={{ 
        display: "flex", 
        justifyContent: "center", 
        position: "relative",
        zIndex: 5,
        py: { xs: 2, sm: 3, md: 4 },
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ 
            width: "100%",
            maxWidth: "100%",
            position: "relative",
          }}
        >
          <Paper
            elevation={4}
            sx={{
              p: { xs: 3, sm: 4, md: 5 },
              width: "100%",
              borderRadius: 3,
              backgroundColor: "white",
              border: "1px solid rgba(59, 130, 246, 0.1)",
              position: "relative",
              zIndex: 1,
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
              overflow: "hidden",
            }}
          >
            {/* Blue accent border at top */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "4px",
                background: "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)",
              }}
            />

            <Typography
              variant={isMobile ? "h5" : "h4"}
              component="h1"
              gutterBottom
              align="center"
              sx={{
                fontWeight: 700,
                color: '#1e3a8a', // Deep blue
                mb: 1,
                letterSpacing: "-0.02em",
              }}
            >
              Welcome to Edgile
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              align="center"
              sx={{ mb: 4 }}
            >
              Please sign in to continue
            </Typography>

            {error && (
              <Typography
                variant="body2"
                color="error"
                align="center"
                sx={{ mb: 3 }}
              >
                {error}
              </Typography>
            )}

            <form onSubmit={handleSubmit}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2.5, sm: 3 } }}>
                <Box 
                  sx={{ 
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1
                  }}
                >
                  <IconBuildingCommunity size={18} style={{ color: '#1e40af' }} />
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontWeight: 600, 
                      color: '#1e40af'  // Blue-800
                    }}
                  >
                    Faculty Login
                  </Typography>
                </Box>

                <TextField
                  fullWidth
                  label="Email"
                  variant="outlined"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  name="email"
                  autoComplete="username"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconUser size={18} stroke={1.5} color="#64748b" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      color: "#1e293b", // Slate-900
                      transition: "all 0.2s ease",
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(59, 130, 246, 0.5)",
                      },
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(59, 130, 246, 0.2)",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#3b82f6", // Blue-500
                      },
                    },
                    "& .MuiInputLabel-root": {
                      color: "#64748b", // Slate-500
                      "&.Mui-focused": {
                        color: "#3b82f6", // Blue-500
                      },
                    },
                    "& .MuiInputAdornment-root": {
                      color: "#64748b", // Slate-500
                    },
                  }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  variant="outlined"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  name="password"
                  autoComplete="current-password"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconLock size={18} stroke={1.5} color="#64748b" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: "#64748b" }} // Slate-500
                        >
                          {showPassword ? (
                            <IconEyeOff size={18} />
                          ) : (
                            <IconEye size={18} />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      color: "#1e293b", // Slate-900
                      transition: "all 0.2s ease",
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(59, 130, 246, 0.5)",
                      },
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(59, 130, 246, 0.2)", 
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#3b82f6", // Blue-500
                      },
                    },
                    "& .MuiInputLabel-root": {
                      color: "#64748b", // Slate-500
                      "&.Mui-focused": {
                        color: "#3b82f6", // Blue-500
                      },
                    },
                  }}
                />

                <TextField
                  fullWidth
                  label="University Code"
                  variant="outlined"
                  value={universityCode}
                  onChange={(e) => setUniversityCode(e.target.value)}
                  required={true}
                  type="text"
                  name="universityCode"
                  autoComplete="one-time-code"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                      <IconBuildingCommunity size={18} stroke={1.5} color="#64748b" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                    color: "#1e293b", // Slate-900
                      transition: "all 0.2s ease",
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(59, 130, 246, 0.5)",
                      },
                      "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(59, 130, 246, 0.2)",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#3b82f6", // Blue-500
                      },
                    },
                    "& .MuiInputLabel-root": {
                    color: "#64748b", // Slate-500
                      "&.Mui-focused": {
                      color: "#3b82f6", // Blue-500
                      },
                    }
                  }}
                />

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ width: "100%" }}
                >
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={isLoading}
                    sx={{
                      mt: 2,
                      py: { xs: 1.5, sm: 1.75 },
                      background: "linear-gradient(90deg, #1e40af 0%, #3b82f6 100%)", // Blue gradient
                      boxShadow: "0 5px 15px rgba(59, 130, 246, 0.3)",
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                      border: "none",
                      borderRadius: "8px",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        background: "linear-gradient(90deg, #1e3a8a 0%, #2563eb 100%)", // Slightly darker blue
                        boxShadow: "0 8px 20px rgba(59, 130, 246, 0.4)",
                      },
                      "&:disabled": {
                        background: "#94a3b8", // Slate-400
                      }
                    }}
                  >
                    {isLoading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </motion.div>

                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  mt: 3, 
                  opacity: 0.9,
                  transition: 'opacity 0.3s ease'
                }}>
                  <Link 
                    to="/forgot-password" 
                    style={{ 
                      color: '#3b82f6', // Blue-500 
                      textDecoration: 'none',
                      fontWeight: '500',
                      textAlign: 'center'
                    }}
                  >
                    Forgot password?
                  </Link>
                </Box>
              </Box>
            </form>
          </Paper>
          
          {/* Footer text */}
          <Typography variant="body2" color="#64748b" align="center" sx={{ mt: 3 }}>
            Edgile Education Platform — Secure Login
          </Typography>
        </motion.div>
      </Container>
    </Box>
  );
};

export default Login;
