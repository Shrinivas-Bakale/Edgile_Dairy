import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  IconButton, 
  Paper,
  useTheme,
  Breadcrumbs,
  Link,
  Chip
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconDownload } from '@tabler/icons-react';
import DashboardWrapper from '../../components/DashboardWrapper';
import COECalendarTable from '../../components/COECalendarTable';
import config from '../../config';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Event {
  _id?: string;
  title: string;
  date: string;
  type: string;
  description?: string;
}

interface COE {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  events: Event[][];
  published: boolean;
}

const StudentCOEViewPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [coe, setCOE] = useState<COE | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCOE = async () => {
      try {
        const res = await fetch(`${config.API_URL}/api/admin/coes/${id}`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) setCOE(data.data);
      } catch (e) { /* ignore */ }
      finally {
        setLoading(false);
      }
    };
    fetchCOE();
  }, [id]);

  const handleDownloadPDF = async () => {
    if (!coe) return;
    const calendarBox = document.querySelector('#coe-view-page table');
    if (!calendarBox) return;
    
    const canvas = await html2canvas(calendarBox as HTMLElement, {
      backgroundColor: '#fff',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: true
    });
    
    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
      compress: true
    });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(33, 33, 33);
    pdf.text(`${coe.name} - Calendar of Events`, 40, 40);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.setTextColor(97, 97, 97);
    pdf.text(`Period: ${format(new Date(coe.startDate), 'd MMM yyyy')} to ${format(new Date(coe.endDate), 'd MMM yyyy')}`, 40, 60);
    pdf.text(`Status: ${coe.published ? 'Published' : 'Draft'}`, 40, 80);

    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth - 60;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 30, 100, imgWidth, imgHeight);

    const cleanName = coe.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    pdf.save(`${cleanName}-calendar.pdf`);
  };

  if (loading || !coe) {
    return (
      <DashboardWrapper>
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography>Loading calendar...</Typography>
        </Box>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper>
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link
            component="button"
            variant="body1"
            onClick={() => navigate('/student/calendar-of-events')}
            sx={{ 
              textDecoration: 'none',
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' }
            }}
          >
            Calendar of Events
          </Link>
          <Typography color="text.primary">{coe.name}</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 2,
            background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 90%)`,
            color: 'white'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                {coe.name}
              </Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                {format(new Date(coe.startDate), 'd MMM yyyy')} to {format(new Date(coe.endDate), 'd MMM yyyy')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<IconArrowLeft size={20} />}
                onClick={() => navigate('/student/calendar-of-events')}
                sx={{ 
                  color: 'white', 
                  borderColor: 'rgba(255,255,255,0.5)',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                startIcon={<IconDownload size={20} />}
                onClick={handleDownloadPDF}
                sx={{ 
                  backgroundColor: 'white',
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.9)'
                  }
                }}
              >
                Download PDF
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Calendar Content */}
        <Box id="coe-view-page" sx={{ bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden' }}>
          <COECalendarTable
            events={coe.events}
            startDate={coe.startDate}
            endDate={coe.endDate}
          />
        </Box>
      </Box>
    </DashboardWrapper>
  );
};

export default StudentCOEViewPage; 