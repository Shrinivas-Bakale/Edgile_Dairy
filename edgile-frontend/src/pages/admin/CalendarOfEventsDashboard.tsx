import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Card, CardContent, CardActions, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useNavigate } from 'react-router-dom';
import config from '../../config';
import { useAuth } from '../../contexts/AuthContext';
import DashboardWrapper from '../../components/DashboardWrapper';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';

interface COE {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
}

const CalendarOfEventsDashboard: React.FC = () => {
  const { token } = useAuth();
  const [coes, setCOEs] = useState<COE[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchCOEs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/api/admin/coes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setCOEs(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCOEs(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.startDate || !form.endDate) return;
    setLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/api/admin/coes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (data.success) {
        setModalOpen(false);
        setForm({ name: '', startDate: '', endDate: '' });
        navigate(`/admin/coe/${data.data._id}/edit`);
        fetchCOEs();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      await fetch(`${config.API_URL}/api/admin/coes/${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeleteId(null);
      fetchCOEs();
    } finally {
      setLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <DashboardWrapper>
        <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: { xs: 1, sm: 3 } }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Box>
              <Typography variant="h3" fontWeight={800} color="primary.dark">Calendar of Events</Typography>
              <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1, fontWeight: 500 }}>
                {coes.length > 0 && `Showing ${coes.length} calendar${coes.length > 1 ? 's' : ''}`}
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              size="large"
              sx={{ borderRadius: 3, boxShadow: 2, fontWeight: 700 }}
              onClick={() => setModalOpen(true)}
            >
              CREATE COE
            </Button>
          </Box>
          <Grid container spacing={3}>
            {coes.map(coe => (
              <Grid item xs={12} sm={6} md={4} key={coe._id}>
                <Box
                  onClick={() => navigate(`/admin/coe/${coe._id}/view`)}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 4,
                    boxShadow: 3,
                    bgcolor: '#fff',
                    p: 3,
                    transition: 'box-shadow 0.2s, transform 0.2s',
                    '&:hover': {
                      boxShadow: 8,
                      transform: 'translateY(-4px) scale(1.03)',
                      borderColor: 'primary.main',
                    },
                    border: '2px solid #e3e3e3',
                    position: 'relative',
                    minHeight: 170,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="h5" fontWeight={800} color="primary.main" sx={{ mb: 1, fontFamily: 'monospace' }}>{coe.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: 'monospace' }}>
                      {new Date(coe.startDate).toLocaleDateString()} - {new Date(coe.endDate).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={2} mt={2}>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={e => { e.stopPropagation(); navigate(`/admin/coe/${coe._id}/edit`); }}
                      sx={{ fontWeight: 700, borderRadius: 2, minWidth: 0 }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={e => { e.stopPropagation(); setDeleteId(coe._id); }}
                      sx={{ fontWeight: 700, borderRadius: 2, minWidth: 0 }}
                    >
                      Delete
                    </Button>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
          {/* Create COE Modal */}
          <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle fontWeight={700}>Create Calendar of Events</DialogTitle>
            <DialogContent>
              <TextField
                label="COE Name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                fullWidth
                margin="normal"
                inputProps={{ maxLength: 50 }}
                helperText="Enter a descriptive name (max 50 chars)"
              />
              <DesktopDatePicker
                label="Start Date"
                inputFormat="dd/MM/yyyy"
                value={form.startDate ? new Date(form.startDate) : null}
                onChange={date => setForm(f => ({ ...f, startDate: date ? date.toISOString().slice(0, 10) : '' }))}
                renderInput={params => <TextField {...params} fullWidth margin="normal" />}
              />
              <DesktopDatePicker
                label="End Date"
                inputFormat="dd/MM/yyyy"
                value={form.endDate ? new Date(form.endDate) : null}
                onChange={date => setForm(f => ({ ...f, endDate: date ? date.toISOString().slice(0, 10) : '' }))}
                minDate={form.startDate ? new Date(form.startDate) : undefined}
                renderInput={params => <TextField {...params} fullWidth margin="normal" />}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setModalOpen(false)} color="inherit">Cancel</Button>
              <Button variant="contained" onClick={handleCreate} disabled={loading || !form.name || !form.startDate || !form.endDate}>Create</Button>
            </DialogActions>
          </Dialog>
          {/* Delete Confirmation */}
          <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
            <DialogTitle>Delete COE?</DialogTitle>
            <DialogContent>Are you sure you want to delete this COE?</DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button color="error" variant="contained" onClick={handleDelete} disabled={loading}>Delete</Button>
            </DialogActions>
          </Dialog>
        </Box>
      </DashboardWrapper>
    </LocalizationProvider>
  );
};

export default CalendarOfEventsDashboard; 