import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useFacultyAuth } from "../../contexts/FacultyAuthContext";
import { useStudentAuth } from "../../contexts/StudentAuthContext";
import { useSnackbar } from "../../contexts/SnackbarContext";
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
  ToggleButton,
  ToggleButtonGroup,
  Container,
  useMediaQuery,
} from "@mui/material";
import {
  IconUser,
  IconLock,
  IconEye,
  IconEyeOff,
  IconSchool,
  IconBuildingCommunity,
  IconArrowLeft,
  IconTicket,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import InteractiveGridPattern from "../../components/InteractiveGridPattern";
import { codesAPI } from "../../utils/api";

type UserRole = "student" | "faculty";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: facultyLogin } = useFacultyAuth();
  const { login: studentLogin } = useStudentAuth();
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [universityCode, setUniversityCode] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);

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

      console.log("Attempting login with:", { email, role });

      switch (role) {
        case "faculty":
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
            showSnackbar("Login successful", "success");
            
            setTimeout(() => {
              // Use navigate for better state handling
              navigate('/faculty/dashboard', { replace: true });
            }, 100);
            
            return;
          } catch (facultyError: any) {
            console.error("Faculty login error:", facultyError);
            throw facultyError;
          }
          
        case "student":
          if (!universityCode) {
            throw new Error("University code is required");
          }
          
          try {
            console.log("Making student login API call...");
            // Student login
            await studentLogin(email, password, universityCode);
            
            // Clear password from memory after successful login
            setPassword("");
            
            console.log('Student login successful, redirecting to dashboard');
            showSnackbar("Login successful", "success");
            navigate("/student/dashboard", { replace: true });
            return; // Exit early after navigation
          } catch (studentError: any) {
            console.error("Student login error:", studentError);
            throw studentError;
          }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Check if it's a critical error that requires page refresh
      const errorMessage = err.message || "Login failed";
      const requiresRefresh = errorMessage.includes("university code") || 
                              errorMessage.includes("university/employee");
      
      setError(errorMessage);
      showSnackbar(errorMessage, "error");
      
      // Automatically refresh the page after 3 seconds for specific errors
      if (requiresRefresh) {
        showSnackbar("Page will refresh in 3 seconds to resolve the issue...", "info");
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    // Use window.location.href to force a complete page reload when going back to landing page
    window.location.href = '/';
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
        aria-label="Go back to landing page"
      >
        <IconArrowLeft size={24} />
      </IconButton>

      {/* Background Patterns and Effects */}
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
        {/* Primary Grid Pattern */}
        <InteractiveGridPattern 
          dotColor="rgba(124, 58, 237, 0.6)"
          dotSize={1.2}
          dotSpacing={28}
          dotOpacity={0.5}
          blur={0.8}
          speed={0.05}
          sx={{
            inset: 0,
            height: "200%",
            width: "200%",
            transform: "translate(-25%, -25%) skewY(-12deg)",
            transformOrigin: "top left",
          }}
        />

        {/* Secondary Grid Pattern (larger dots, slower movement) */}
        <InteractiveGridPattern 
          dotColor="rgba(59, 130, 246, 0.5)"
          dotSize={2}
          dotSpacing={45}
          dotOpacity={0.3}
          blur={1.5}
          speed={0.03}
          sx={{
            inset: 0,
            height: "200%",
            width: "200%",
            transform: "translate(-10%, -10%) skewY(12deg)",
            transformOrigin: "bottom right",
          }}
        />

        {/* Tertiary Grid Pattern (smaller, more subtle) */}
        <InteractiveGridPattern 
          dotColor="rgba(255, 255, 255, 0.4)"
          dotSize={0.8}
          dotSpacing={20}
          dotOpacity={0.2}
          blur={0.3}
          speed={0.07}
          sx={{
            inset: 0,
            height: "150%",
            width: "150%",
            transform: "translate(-10%, -10%)",
          }}
        />

        {/* Radial Gradient Overlay */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at center, transparent 10%, #080818 70%)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* Subtle glow effects */}
        <Box
          sx={{
            position: "absolute",
            top: "20%",
            left: "15%",
            width: "40vw",
            height: "40vh",
            background: "radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, transparent 70%)",
            filter: "blur(80px)",
            zIndex: 0,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: "10%",
            right: "10%",
            width: "30vw",
            height: "30vh",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
            filter: "blur(80px)",
            zIndex: 0,
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
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3, md: 4 },
              width: "100%",
              borderRadius: 3,
              backgroundColor: "rgba(16, 16, 28, 0.75)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              position: "relative",
              zIndex: 1,
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.7)",
              overflow: "hidden",
            }}
          >
            {/* Gradient overlay for glassmorphism effect */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "linear-gradient(135deg, rgba(120, 85, 230, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)",
                pointerEvents: "none",
                zIndex: -1,
              }}
            />

            <Typography
              variant={isMobile ? "h5" : "h4"}
              component="h1"
              gutterBottom
              align="center"
              sx={{
                fontWeight: 700,
                background: "linear-gradient(45deg, #7c3aed 30%, #60a5fa 90%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 2px 10px rgba(124, 58, 237, 0.3)",
                mb: 1,
                letterSpacing: "-0.02em",
              }}
            >
              Welcome to Edgile
            </Typography>
            <Typography
              variant="body2"
              color="rgba(255, 255, 255, 0.7)"
              align="center"
              sx={{ mb: 3 }}
            >
              Please sign in to continue
            </Typography>

            <form onSubmit={handleSubmit}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2, sm: 2.5 } }}>
                <ToggleButtonGroup
                  value={role}
                  exclusive
                  onChange={(_, newRole) => {
                    if (newRole) {
                      setRole(newRole);
                      setError(""); // Clear any previous errors
                    }
                  }}
                  fullWidth
                  sx={{
                    mb: 1,
                    ".MuiToggleButton-root": {
                      py: { xs: 0.75, sm: 1 },
                      color: "rgba(255, 255, 255, 0.7)",
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      transition: "all 0.2s ease",
                      "&.Mui-selected": {
                        bgcolor: "rgba(124, 58, 237, 0.2)",
                        color: "#ffffff",
                        fontWeight: 600,
                      },
                      "&:hover": {
                        bgcolor: "rgba(124, 58, 237, 0.1)",
                      },
                    },
                  }}
                >
                  <ToggleButton value="student">
                    <IconSchool size={18} style={{ marginRight: 8 }} />
                    Student
                  </ToggleButton>
                  <ToggleButton value="faculty">
                    <IconBuildingCommunity size={18} style={{ marginRight: 8 }} />
                    Faculty
                  </ToggleButton>
                </ToggleButtonGroup>

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
                        <IconUser size={18} color="rgba(255, 255, 255, 0.7)" />
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
                    "& .MuiInputAdornment-root": {
                      color: "rgba(255, 255, 255, 0.5)",
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

                {role === 'student' ? (
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
                      }
                    }}
                  />
                ) : (
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
                          <IconSchool size={18} color="rgba(255, 255, 255, 0.7)" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}

                {error && (
                  <Typography color="#ff5c8d" align="center" variant="body2" sx={{ mt: 1 }}>
                    {error}
                  </Typography>
                )}

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
                    disabled={isLoading || (role === 'faculty' && !universityCode)}
                    sx={{
                      mt: 2,
                      py: { xs: 1.25, sm: 1.5 },
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
                    {isLoading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      "SIGN IN"
                    )}
                  </Button>
                </motion.div>
                
                {role === 'student' && (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    mt: 2, 
                    opacity: 0.9,
                    transition: 'opacity 0.3s ease'
                  }}>
                    <Link 
                      to="/register" 
                      style={{ 
                        color: '#7c3aed', 
                        textDecoration: 'none',
                        fontWeight: '500',
                        textAlign: 'center'
                      }}
                    >
                      New user? Register here
                    </Link>
                    <Link 
                      to="/forgot-password" 
                      style={{ 
                        color: '#7c3aed', 
                        textDecoration: 'none',
                        fontWeight: '500',
                        textAlign: 'center'
                      }}
                    >
                      Forgot password?
                    </Link>
                  </Box>
                )}
              </Box>
            </form>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default Login;
