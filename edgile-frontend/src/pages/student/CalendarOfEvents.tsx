import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent,
  IconButton,
  useTheme,
  Chip,
  Stack,
  Paper
} from '@mui/material';
import COEViewPage from '../admin/COEViewPage';
import { format } from 'date-fns';
import config from '../../config';
import { IconArrowLeft, IconDownload, IconArrowRight } from '@tabler/icons-react';
import DashboardWrapper from '../../components/DashboardWrapper';
import { useNavigate } from 'react-router-dom';

const StudentCalendarOfEvents: React.FC = () => {
  const [coes, setCOEs] = useState<any[]>([]);
  const [coeModalOpen, setCOEModalOpen] = useState(false);
  const [selectedCOE, setSelectedCOE] = useState<any | null>(null);
  const theme = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCOEs = async () => {
      try {
        const res = await fetch(`${config.API_URL}/api/admin/coes/published`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) setCOEs(data.data);
      } catch (e) { /* ignore */ }
    };
    fetchCOEs();
  }, []);

  const handleCardClick = (coe: any) => {
    navigate(`/student/coe/${coe._id}`);
  };

  return (
    <DashboardWrapper>
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h4" fontWeight={700} mb={3} color="primary.dark">Calendar of Events</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {coes.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', width: '100%' }}>
              <Typography color="text.secondary">No published calendars available</Typography>
            </Paper>
          ) : coes.map(coe => (
            <Card 
              key={coe._id} 
              onClick={() => handleCardClick(coe)}
              sx={{ 
                flex: '1 1 320px', 
                minWidth: { xs: '100%', sm: '48%', md: '32%' }, 
                maxWidth: { xs: '100%', sm: '48%', md: '32%' },
                borderRadius: 2,
                boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
                background: '#fff',
                border: '1.5px solid #e0e0e0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                minHeight: 200,
                transition: 'box-shadow 0.2s, transform 0.2s',
                position: 'relative',
                p: 0,
                '&:hover': {
                  boxShadow: theme.shadows[6],
                  transform: 'translateY(-4px)'
                }
              }}
            >
              <CardContent sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', p: 3, position: 'relative' }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  {coe.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {format(new Date(coe.startDate), 'd MMM yyyy')} - {format(new Date(coe.endDate), 'd MMM yyyy')}
                </Typography>
                <Box sx={{ position: 'absolute', right: 20, bottom: 20 }}>
                  <IconArrowRight size={24} color={theme.palette.grey[700]} />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Dialog 
          open={coeModalOpen} 
          onClose={() => setCOEModalOpen(false)} 
          maxWidth="xl" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              minHeight: '80vh'
            }
          }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            borderBottom: `1px solid ${theme.palette.divider}`,
            pb: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={() => setCOEModalOpen(false)} size="small">
                <IconArrowLeft size={20} />
              </IconButton>
              <Typography variant="h6" fontWeight={600}>Calendar of Events</Typography>
            </Box>
            {selectedCOE && (
              <Button
                variant="contained"
                startIcon={<IconDownload size={20} />}
                onClick={() => {
                  const viewPage = document.querySelector('#coe-view-page');
                  if (viewPage) {
                    const downloadBtn = viewPage.querySelector('button[aria-label="Download PDF"]');
                    if (downloadBtn) (downloadBtn as HTMLButtonElement).click();
                  }
                }}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600
                }}
              >
                Download PDF
              </Button>
            )}
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            {selectedCOE && <COEViewPage publicMode={true} id={selectedCOE._id} />}
          </DialogContent>
        </Dialog>
      </Box>
    </DashboardWrapper>
  );
};

export default StudentCalendarOfEvents; 