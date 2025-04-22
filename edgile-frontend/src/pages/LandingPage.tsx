import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Container, Typography, Box, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const LandingPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation */}
      <Paper elevation={1} sx={{ py: 2, mb: 4 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
              Edgile
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleNavigation('/login')}
              >
                Log in
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => handleNavigation('/register')}
              >
                Sign up
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => handleNavigation('/admin/access')}
              >
                Administrator Access
              </Button>
            </Box>
          </Box>
        </Container>
      </Paper>

      {/* Hero Section */}
      <Box sx={{ flexGrow: 1, py: 8, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" color="primary" gutterBottom>
                Welcome to Edgile
              </Typography>
              <Typography variant="h2" component="h1" gutterBottom>
                <Box component="span" sx={{ color: 'text.primary', display: 'block' }}>
                  Modern Learning
                </Box>
                <Box component="span" sx={{ color: 'primary.main', display: 'block' }}>
                  Made Simple
                </Box>
              </Typography>
              <Typography variant="h6" color="text.secondary" paragraph>
                An innovative educational platform designed to streamline the learning process for students and faculty. Seamlessly manage courses, assignments, and resources in one place.
              </Typography>
              <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={() => handleNavigation('/register')}
                >
                  Get started
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  onClick={() => handleNavigation('/login')}
                >
                  Log in
                </Button>
              </Box>
              <Typography variant="body2" sx={{ mt: 2 }}>
                Are you an administrator?{' '}
                <Button
                  color="primary"
                  onClick={() => handleNavigation('/admin/access')}
                  sx={{ textTransform: 'none' }}
                >
                  Administrator Access
                </Button>
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Paper
                elevation={3}
                sx={{
                  p: 4,
                  height: 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'primary.light',
                }}
              >
                <Typography variant="h2" color="primary.contrastText">
                  EDGILE
                </Typography>
              </Paper>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage; 