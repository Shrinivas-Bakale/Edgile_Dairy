import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, Chip, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import config from '../../config';
import { useAuth } from '../../contexts/AuthContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import DashboardWrapper from '../../components/DashboardWrapper';
import { format, getMonth, getYear, getDate, startOfMonth, endOfMonth, addDays, isSameMonth, getDay } from 'date-fns';
import autoTable from 'jspdf-autotable';
import { ContentCopy as ContentCopyIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { IconDownload } from '@tabler/icons-react';
import html2canvas from 'html2canvas';

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
  events: Event[][];  // Updated to match database schema
  published: boolean;
}

interface COEViewPageProps {
  publicMode?: boolean;
  id?: string;
}

const eventTypeColors: { [type: string]: string } = {
  'Holiday': '#d32f2f',
  'IA': '#1976d2',
  'Practical IA': '#1976d2',
  'Fest': '#7b1fa2',
  'Certification Course': '#f9a825',
  'Seminar': '#f9a825',
  'Special': '#388e3c',
  'Exam': '#0288d1',
  'Event': '#7b1fa2',
};

const COEViewPage: React.FC<COEViewPageProps> = ({ publicMode = false, id: propId }) => {
  const params = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [coe, setCOE] = useState<COE | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishLoading, setPublishLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [compactMode, setCompactMode] = useState(false);

  const id = propId || params.id;

  useEffect(() => {
    const fetchCOE = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${config.API_URL}/api/admin/coes/${id}`, {
          headers: publicMode ? {} : { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) setCOE(data.data);
      } finally {
        setLoading(false);
      }
    };
    fetchCOE();
  }, [id, token, publicMode]);

  const getMonthName = (date: Date) => date.toLocaleString('default', { month: 'short' });
  const getWeeksInMonth = (month: number, year: number) => {
    const firstDay = startOfMonth(new Date(year, month));
    const lastDay = endOfMonth(new Date(year, month));
    let weeks = [];
    let current = firstDay;
    let week = [];
    while (current <= lastDay) {
      week.push(new Date(current));
      if (getDay(current) === 6 || current.getTime() === lastDay.getTime()) {
        weeks.push(week);
        week = [];
      }
      current = addDays(current, 1);
    }
    return weeks;
  };

  const renderCOETable = () => {
    if (!coe) return null;
    // Validate dates
    const start = new Date(coe.startDate);
    const end = new Date(coe.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return (
        <Box sx={{ p: 3, textAlign: 'center', color: 'error.main' }}>
          <Typography>Invalid date format in COE data. Please check the start and end dates.</Typography>
        </Box>
      );
    }
    const flattenedEvents = coe.events.flat();
    // Helper to get event color
    const getEventColor = (type: string): string => {
      const colorMap: { [key: string]: string } = {
        'Holiday': '#ffb3b3',
        'IA': '#90caf9',
        'Practical IA': '#90caf9',
        'Fest': '#e1bee7',
        'Certification Course': '#fff59d',
        'Seminar': '#fff59d',
        'Special': '#a5d6a7',
        'Exam': '#90caf9',
        'Event': '#e1bee7',
      };
      return colorMap[type] || '#e3e3e3';
    };
    // Helper to check if a date is a holiday
    const isHoliday = (dateStr: string): boolean => {
      return flattenedEvents.some((ev: Event) => ev.type === 'Holiday' && ev.date === dateStr);
    };
    // Helper to get events for a date
    const getEventsForDate = (dateStr: string): Event[] => {
      return flattenedEvents.filter((ev: Event) => ev.date === dateStr);
    };
    // Build all days in the period
    let allDays: Date[] = [];
    let d = new Date(start);
    while (d <= end) {
      allDays.push(new Date(d));
      d = addDays(d, 1);
    }
    // Group days into weeks, each week is an array of 7 days (Sun-Sat)
    let weeks: (Date | null)[][] = [];
    let week: (Date | null)[] = [];
    allDays.forEach(date => {
      if (week.length === 0 && getDay(date) !== 0) {
        // Fill leading empty days
        for (let i = 0; i < getDay(date); i++) week.push(null);
      }
      week.push(date);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    });
    if (week.length > 0) {
      // Fill trailing empty days
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }
    // Remove weeks that are fully empty (all null)
    weeks = weeks.filter(w => w.some(day => day !== null));
    // For each week, get month name for the first non-null day
    let totalWorkingDays = 0;
    // Build color-to-eventType(s) mapping for legend
    const colorToTypes: { [color: string]: string[] } = {};
    Object.entries(eventTypeColors).forEach(([type, color]) => {
      if (!colorToTypes[color]) colorToTypes[color] = [];
      colorToTypes[color].push(type);
    });
    return (
      <Box id="calendar-table-capture" sx={{ overflowX: 'auto', bgcolor: '#f9f9fb', borderRadius: 3, p: compactMode ? 0.1 : 2, boxShadow: 2, width: 900, mx: 'auto' }}>
        {/* Event type legend */}
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', gap: compactMode ? 2 : 3, mb: compactMode ? 1 : 2, pl: 1 }}>
          {Object.entries(colorToTypes).map(([color, types], idx) => (
            <Box key={color} sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
              <span style={{
                display: 'inline-block',
                width: compactMode ? 10 : 14,
                height: compactMode ? 10 : 14,
                borderRadius: '50%',
                background: color,
                marginRight: 6,
                border: '1.5px solid #888',
                verticalAlign: 'middle',
              }}></span>
              <span style={{ fontSize: compactMode ? 11 : 15, color: '#222', fontWeight: 600, verticalAlign: 'middle', lineHeight: 1 }}>{types.join('/')}</span>
            </Box>
          ))}
        </Box>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: 900, minWidth: 900, background: '#fff', borderRadius: 8, overflow: 'hidden', fontSize: compactMode ? 8 : 14 }}>
          <thead>
            <tr style={{ background: '#e3eafc' }}>
              <th style={{ padding: compactMode ? 3 : 8, fontWeight: 700, border: '1px solid #b3b3b3', minWidth: 60, background: '#bcd2f7' }}>{'Month'}</th>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <th key={day} style={{ padding: compactMode ? 2 : 6, fontWeight: 600, border: '1px solid #b3b3b3', color: day === 'Sun' ? '#d32f2f' : '#222', minWidth: 32 }}>{day}</th>
              ))}
              <th style={{ padding: compactMode ? 3 : 8, fontWeight: 700, border: '1px solid #b3b3b3', minWidth: 30 }}>WD</th>
              <th style={{ padding: compactMode ? 3 : 8, fontWeight: 700, border: '1px solid #b3b3b3', minWidth: 220 }}>Events</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, idx) => {
              // Month name for first non-null day
              const firstDay = week.find(day => day !== null) as Date | null;
              const monthName = firstDay ? getMonthName(firstDay) : '';
              // Working days in this week
              let workingDays = 0;
              // Events for this week
              let weekEvents: Event[] = [];
              return (
                <tr key={idx} style={{ background: '#fff' }}>
                  {/* Month cell only for first week of a month */}
                  {(idx === 0 || (firstDay && weeks[idx - 1] && getMonth(firstDay) !== getMonth(weeks[idx - 1].find(day => day !== null) as Date))) ? (
                    <td rowSpan={weeks.filter((w, i) => {
                      const d = w.find(day => day !== null) as Date | null;
                      return d && firstDay && getMonth(d) === getMonth(firstDay) && (i >= idx);
                    }).length} style={{ padding: compactMode ? 3 : 8, fontWeight: 700, border: '1px solid #b3b3b3', background: '#bcd2f7', verticalAlign: 'middle', minWidth: 60 }}>{monthName}</td>
                  ) : null}
                  {/* Days */}
                  {week.map((date, i) => {
                    if (!date) return <td key={i} style={{ background: '#f5f7fa', border: '1px solid #b3b3b3', padding: compactMode ? 2 : undefined }}></td>;
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const events = getEventsForDate(dateStr);
                    weekEvents.push(...events);
                    // Working day: not Sunday, not holiday
                    if (getDay(date) !== 0 && !isHoliday(dateStr)) workingDays++;
                    // Use event color for background if event exists
                    const eventBg = events.length > 0 ? (eventTypeColors[events[0].type] || '#e3e3e3') : (i === 0 ? '#ffeaea' : '#fff');
                    return (
                      <td key={i} style={{
                        padding: compactMode ? 2 : 8,
                        border: '1px solid #b3b3b3',
                        color: i === 0 ? '#d32f2f' : '#222',
                        background: eventBg,
                        fontWeight: date ? 700 : 400,
                        textAlign: 'center',
                        minWidth: 32,
                        height: compactMode ? 16 : undefined,
                        transition: 'background 0.2s',
                      }}>{getDate(date)}</td>
                    );
                  })}
                  {/* Working days */}
                  <td style={{ padding: compactMode ? 3 : 8, border: '1px solid #b3b3b3', fontWeight: 600, background: '#f5f7fa', textAlign: 'center', minWidth: 30, color: workingDays > 0 ? '#388e3c' : undefined }}>
                    {workingDays > 0 ? workingDays : ''}
                  </td>
                  {/* Events */}
                  <td style={{ padding: compactMode ? 2 : 8, border: '1px solid #b3b3b3', minWidth: 220 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: compactMode ? 0.1 : 0.5 }}>
                      {weekEvents.map((ev: Event, i: number) => {
                        const isCollegeReopens = ev.date === format(start, 'yyyy-MM-dd');
                        const isLastWorkingDay = ev.date === format(end, 'yyyy-MM-dd');
                        const color = eventTypeColors[ev.type] || '#1976d2';
                        return (
                          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: compactMode ? 0.1 : 0.5 }}>
                            {/* Colored dot */}
                            <span style={{
                              display: 'inline-block',
                              width: compactMode ? 7 : 10,
                              height: compactMode ? 7 : 10,
                              borderRadius: '50%',
                              background: isCollegeReopens ? '#43a047' : isLastWorkingDay ? '#ff9800' : color,
                              marginRight: 6,
                              flexShrink: 0,
                            }}></span>
                            {/* Event name */}
                            <span style={{ fontWeight: isCollegeReopens || isLastWorkingDay ? 800 : 600, color: '#222', fontSize: compactMode ? 9 : 14, whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: compactMode ? 120 : 180, display: 'inline-block' }}>
                              {isCollegeReopens ? 'College Reopens' : isLastWorkingDay ? 'Last Working Day' : ev.title}
                            </span>
                          </Box>
                        );
                      })}
                    </Box>
                  </td>
                </tr>
              );
            })}
            {/* Total working days row */}
            <tr>
              <td colSpan={9} style={{ textAlign: 'right', fontWeight: 700, fontSize: compactMode ? 12 : 16, background: '#e3eafc', border: '1px solid #b3b3b3', padding: compactMode ? 6 : 12 }}>Total Working Days of the Semester</td>
              <td style={{ fontWeight: 800, fontSize: compactMode ? 13 : 18, background: '#e3eafc', border: '1px solid #b3b3b3', padding: compactMode ? 6 : 12 }}>{weeks.reduce((sum, week) => sum + week.filter(date => date && getDay(date) !== 0 && !isHoliday(format(date, 'yyyy-MM-dd'))).length, 0)}</td>
              <td style={{ background: '#e3eafc', border: '1px solid #b3b3b3' }}></td>
            </tr>
          </tbody>
        </table>
      </Box>
    );
  };

  const handleDownloadPDF = async () => {
    const captureElement = document.getElementById('calendar-table-capture');
    if (!captureElement) return;

    const canvas = await html2canvas(captureElement, {
      scale: 2, // higher scale for better quality
      useCORS: true, // allows cross-origin images to be rendered
      logging: true,
    });

    const imgData = canvas.toDataURL('image/png');

    // Portrait orientation, px units, A4 width
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4',
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    // Header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(coe?.name || '', pageWidth / 2, 32, { align: 'center' });
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Period: ${coe ? `${format(new Date(coe.startDate), 'dd MMM yyyy')} to ${format(new Date(coe.endDate), 'dd MMM yyyy')}` : ''}`, pageWidth / 2, 52, { align: 'center' });
    // Image placement
    const yStart = 65;
    let imgWidth = canvas.width;
    let imgHeight = canvas.height;
    let scale = 1;
    if (imgWidth > pageWidth - 20) {
      scale = (pageWidth - 20) / imgWidth;
      imgWidth = pageWidth - 20;
      imgHeight = imgHeight * scale;
    }
    if (imgHeight > pageHeight - yStart - 10) {
      scale = (pageHeight - yStart - 10) / imgHeight;
      imgHeight = pageHeight - yStart - 10;
      imgWidth = imgWidth * scale;
    }
    const x = (pageWidth - imgWidth) / 2;
    pdf.addImage(imgData, 'PNG', x, yStart, imgWidth, imgHeight);
    pdf.save(`COE-${coe?.name || 'document'}.pdf`);
  };

  const handlePublishToggle = async () => {
    if (!coe) return;
    setPublishLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/api/admin/coes/${coe._id}/${coe.published ? 'unpublish' : 'publish'}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) setCOE(data.data);
    } finally {
      setPublishLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!coe) return;
    navigator.clipboard.writeText(`${window.location.origin}/coe/${coe._id}/public`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !coe) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><CircularProgress /></Box>;

  return (
    <DashboardWrapper>
      <Box id="coe-view-page" sx={{ maxWidth: 1200, width: '100%', mx: 'auto', mt: 4, p: 2, bgcolor: '#f9f9fb' }}>
        {publicMode && !coe?.published && (
          <Box sx={{ mb: 2, p: 2, bgcolor: '#fff3e0', border: '1.5px solid #d32f2f', borderRadius: 2, textAlign: 'center' }}>
            <Typography color="error" fontWeight={700}>This COE is not published yet.</Typography>
          </Box>
        )}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight={800}>
              {coe?.name} - Calendar of Events
              <Chip
                label={coe?.published ? 'Published' : 'Draft'}
                color={coe?.published ? 'success' : 'default'}
                size="small"
                sx={{ ml: 2, fontWeight: 700 }}
              />
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
              Period: {coe ? `${format(new Date(coe.startDate), 'd MMM yyyy')} to ${format(new Date(coe.endDate), 'd MMM yyyy')}` : ''}
            </Typography>
          </Box>
          {!publicMode && (
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                color={coe?.published ? 'warning' : 'success'}
                onClick={handlePublishToggle}
                disabled={publishLoading}
                sx={{ fontWeight: 700, minWidth: 120 }}
              >
                {publishLoading ? (coe?.published ? 'Unpublishing...' : 'Publishing...') : (coe?.published ? 'Unpublish' : 'Publish')}
              </Button>
              <Button variant="outlined" onClick={() => navigate('/admin/calendar-of-events')}>Back</Button>
              <Button variant="contained" color="primary" onClick={() => navigate(`/admin/coe/${coe?._id}/edit`)}>Edit</Button>
              <Button
                variant="contained"
                startIcon={<IconDownload size={20} />}
                onClick={handleDownloadPDF}
                aria-label="Download PDF"
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600
                }}
              >
                Download PDF
              </Button>
            </Box>
          )}
        </Box>
        <Box id="calendar-table-capture">{renderCOETable()}</Box>
      </Box>
    </DashboardWrapper>
  );
};

export default COEViewPage; 