import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Stack, 
  Alert,
  CircularProgress
} from '@mui/material';
import { facultyAPI } from '../../utils/api';

interface PasswordChangeFormProps {
  onSuccess: () => void;
}

const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({ onSuccess }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async () => {
    // Reset error state
    setError(null);
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }
    
    // Validate new password meets requirements
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError("Password must be at least 8 characters and include uppercase, lowercase, number, and special character");
      return;
    }
    
    setLoading(true);
    
    try {
      await facultyAPI.changePassword(currentPassword, newPassword);
      onSuccess();
    } catch (err: any) {
      console.error('Error changing password:', err);
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Change Your Password
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        For security reasons, you need to change your temporary password before continuing.
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Stack spacing={3} sx={{ mt: 2 }}>
        <TextField
          label="Current Password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          fullWidth
          required
        />
        <TextField
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          fullWidth
          required
          helperText="Password must be at least 8 characters with uppercase, lowercase, number, and special character"
        />
        <TextField
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          fullWidth
          required
        />
        
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          disabled={loading || !currentPassword || !newPassword || !confirmPassword}
        >
          {loading ? <CircularProgress size={24} /> : "Change Password"}
        </Button>
      </Stack>
    </Box>
  );
};

export default PasswordChangeForm; 