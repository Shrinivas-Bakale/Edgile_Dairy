import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, Tooltip, IconButton, Checkbox, FormControlLabel } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import config from '../../config';
import { useAuth } from '../../contexts/AuthContext';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, getDay, addMonths, subMonths, getMonth, getYear, differenceInCalendarDays, format as formatDateFns } from 'date-fns';
import { Tooltip as MuiTooltip } from '@mui/material';
import DashboardWrapper from '../../components/DashboardWrapper';
import { alpha } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import ClearIcon from '@mui/icons-material/Clear';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Dialog as MuiDialog, DialogTitle as MuiDialogTitle, DialogContent as MuiDialogContent, DialogActions as MuiDialogActions } from '@mui/material';

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
}

const eventTypeOptions = [
  'Holiday',
  'IA',
  'Practical IA',
  'Fest',
  'Certification Course',
  'Seminar',
//   'Special',
//   'Exam',
  'Event',
];

const eventTypeColors: { [type: string]: string } = {
  'Holiday': '#ffb3b3',
  'IA': '#90caf9',
  'Practical IA': '#90caf9',
  'Fest': '#e1bee7',
  'Certification Course': '#fff59d',
  'Seminar': '#fff59d',
//   'Special': '#a5d6a7',
//   'Exam': '#90caf9',
  'Event': '#e1bee7',
};

const COEEditPage: React.FC = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [coe, setCOE] = useState<COE | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [publicHolidays, setPublicHolidays] = useState<{ date: string, name: string, isFestival: boolean }[]>([]);
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
  const INDIAN_HOLIDAYS_CALENDAR_ID = 'en.indian#holiday@group.v.calendar.google.com';
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [originalCOE, setOriginalCOE] = useState<COE | null>(null);
  const [editingPeriod, setEditingPeriod] = useState(false);
  const [periodDraft, setPeriodDraft] = useState<{ start: string, end: string } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [multiDayMode, setMultiDayMode] = useState(false);
  const [multiDayCount, setMultiDayCount] = useState(1);
  const [multiDayDates, setMultiDayDates] = useState<string[]>([]);
  const [multiDayStart, setMultiDayStart] = useState<string>('');

  useEffect(() => {
    const fetchCOE = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${config.API_URL}/api/admin/coes/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
          setCOE(data.data);
          setOriginalCOE(data.data);
          setCurrentDate(startOfMonth(new Date(data.data.startDate)));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchCOE();
  }, [id, token]);

  useEffect(() => {
    const fetchHolidays = async () => {
      if (!GOOGLE_API_KEY) return;
      const timeMin = coe?.startDate ? new Date(coe.startDate).toISOString() : new Date().toISOString();
      const timeMax = coe?.endDate ? new Date(coe.endDate).toISOString() : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(INDIAN_HOLIDAYS_CALENDAR_ID)}/events?key=${GOOGLE_API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.items) {
          setPublicHolidays(data.items.map((item: any) => ({
            date: item.start.date,
            name: item.summary,
            isFestival: /festival|fest|diwali|eid|holi|pongal|navratri|christmas|dussehra|raksha|lohri|baisakhi|onam|makar/i.test(item.summary)
          })));
        }
      } catch (e) {
        // fallback: do nothing
      }
    };
    fetchHolidays();
    // eslint-disable-next-line
  }, [GOOGLE_API_KEY, coe?.startDate, coe?.endDate]);

  // Update handleEventModalOk
  const handleEventModalOk = async () => {
    if (!editingEvent?.title || !editingEvent.type) return;
    let newEvents: Event[][] = Array.isArray(coe?.events) && Array.isArray(coe?.events[0]) ? [...(coe?.events as Event[][])] : [];
    if (multiDayMode && multiDayDates.length > 0) {
      // Remove any existing group with the same title/type/description and overlapping dates
      newEvents = newEvents.filter(group =>
        !group.some(ev => multiDayDates.includes(ev.date) && ev.title === editingEvent.title && ev.type === editingEvent.type && ev.description === editingEvent.description)
      );
      // Add as a new group
      newEvents.push(multiDayDates.map(date => ({ ...editingEvent, date })));
    } else if (editingEvent.date) {
      // Remove any existing event for this date with the same title/type/description
      newEvents = newEvents.filter(group =>
        !group.some(ev => ev.date === editingEvent.date && ev.title === editingEvent.title && ev.type === editingEvent.type && ev.description === editingEvent.description)
      );
      // Add as a new group
      newEvents.push([{ ...editingEvent }]);
    }
    // Always ensure special events
    const updatedEvents = ensureSpecialEvents(newEvents, coe!.startDate, coe!.endDate);
    setCOE(coe => coe ? { ...coe, events: updatedEvents } : coe);
    setEventModalOpen(false);
    setEditingEvent(null);
    setMultiDayDates([]);
    setMultiDayMode(false);
    setMultiDayStart('');
    // Auto-save to backend
    await fetch(`${config.API_URL}/api/admin/coes/${coe!._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...coe, events: updatedEvents })
    });
  };

  // Update handleDeleteEvent
  const handleDeleteEvent = async (event: Event) => {
    if (!coe) return;
    let newEvents: Event[][] = Array.isArray(coe.events) && Array.isArray(coe.events[0]) ? [...coe.events as Event[][]] : [];
    // Remove any group containing this event (for multi-day) or single event
    newEvents = newEvents.filter(group =>
      !group.some(ev => ev.date === event.date && ev.title === event.title && ev.type === event.type && ev.description === event.description)
    );
    // Always ensure special events
    const updatedEvents = ensureSpecialEvents(newEvents, coe.startDate, coe.endDate);
    setCOE(coe => coe ? { ...coe, events: updatedEvents } : coe);
    // Auto-save to backend
    await fetch(`${config.API_URL}/api/admin/coes/${coe._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...coe, events: updatedEvents })
    });
  };

  // Helper to check if a date is within the COE period
  const isWithinPeriod = (date: Date) => {
    if (!coe) return false;
    const start = new Date(coe.startDate);
    const end = new Date(coe.endDate);
    return date >= start && date <= end;
  };

  const handleSave = async () => {
    if (!coe) return;
    setLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/api/admin/coes/${coe._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(coe)
      });
      const data = await response.json();
      if (data.success) {
        setOriginalCOE(data.data);
        setCOE(data.data);
        navigate(`/admin/coes/${coe._id}/view`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (originalCOE) {
      setCOE(originalCOE);
      setCurrentDate(startOfMonth(new Date(originalCOE.startDate)));
    }
  };

  // Helper to format period nicely
  const formatPeriod = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${formatDateFns(s, 'd MMM yyyy')} to ${formatDateFns(e, 'd MMM yyyy')}`;
  };

  // Helper to ensure special events
  const ensureSpecialEvents = (events: Event[][], startDate: string, endDate: string): Event[][] => {
    // Remove any existing special events
    let filtered = events.filter(group =>
      !group.some(ev => (ev.date === startDate && ev.title === 'College Reopens') || (ev.date === endDate && ev.title === 'Last Working Day'))
    );
    // Add College Reopens
    filtered = [[{ title: 'College Reopens', date: startDate, type: 'Special', description: '' }], ...filtered];
    // Add Last Working Day
    filtered = [...filtered, [{ title: 'Last Working Day', date: endDate, type: 'Special', description: '' }]];
    return filtered;
  };

  const handleDeleteClick = (event: Event) => {
    setEventToDelete(event);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (eventToDelete) {
      await handleDeleteEvent(eventToDelete);
      setDeleteConfirmOpen(false);
      setEventToDelete(null);
    }
  };

  // Update handlePeriodChange
  const handlePeriodChange = async (start: string, end: string) => {
    if (!coe) return;
    let newEvents: Event[][] = Array.isArray(coe.events) && Array.isArray(coe.events[0]) ? [...coe.events as Event[][]] : [];
    const updatedEvents = ensureSpecialEvents(newEvents, start, end);
    setCOE({ ...coe, startDate: start, endDate: end, events: updatedEvents });
    setCurrentDate(startOfMonth(new Date(start)));
    // Auto-save to backend
    await fetch(`${config.API_URL}/api/admin/coes/${coe._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...coe, startDate: start, endDate: end, events: updatedEvents })
    });
    // Re-fetch holidays for new period
    if (GOOGLE_API_KEY) {
      const timeMin = new Date(start).toISOString();
      const timeMax = new Date(end).toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(INDIAN_HOLIDAYS_CALENDAR_ID)}/events?key=${GOOGLE_API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.items) {
          setPublicHolidays(data.items.map((item: any) => ({
            date: item.start.date,
            name: item.summary,
            isFestival: /festival|fest|diwali|eid|holi|pongal|navratri|christmas|dussehra|raksha|lohri|baisakhi|onam|makar/i.test(item.summary)
          })));
        }
      } catch (e) { /* fallback: do nothing */ }
    }
  };

  // --- MULTI-DAY EVENT LOGIC ---
  // When number of days and start date are set, auto-select a continuous range skipping holidays
  useEffect(() => {
    if (!multiDayMode || !multiDayStart || !multiDayCount || !coe) return;
    let selected: string[] = [];
    let date = new Date(multiDayStart);
    let added = 0;
    while (added < multiDayCount) {
      const formatted = format(date, 'yyyy-MM-dd');
      // Skip if holiday or Sunday
      const isHoliday = publicHolidays.some(h => h.date === formatted);
      const isSunday = getDay(date) === 0;
      if (!isHoliday && !isSunday && isWithinPeriod(date)) {
        selected.push(formatted);
        added++;
      }
      date = addDays(date, 1);
      // Prevent infinite loop
      if (differenceInCalendarDays(date, new Date(coe.endDate)) > 0) break;
    }
    setMultiDayDates(selected);
  }, [multiDayMode, multiDayStart, multiDayCount, coe, publicHolidays]);

  // Calendar grid logic
  const renderCalendar = () => {
    if (!coe || !currentDate) return null;
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days: React.ReactNode[] = [];
    let day = startDate;
    // Flatten events array for correct event lookup
    const flattenedEvents = Array.isArray(coe.events) && Array.isArray(coe.events[0]) ? coe.events.flat() : coe.events;
    while (day <= endDate) {
      const thisDay = day;
      const formattedDate = format(thisDay, 'yyyy-MM-dd');
      const isSun = getDay(thisDay) === 0;
      const isCurrentMonth = isSameMonth(thisDay, monthStart);
      // Only filter Event objects, not arrays
      const dayEvents = flattenedEvents.filter(ev => {
        if (Array.isArray(ev)) return false;
        if (!ev.date || isNaN(Date.parse(ev.date))) return false;
        return format(new Date(ev.date), 'yyyy-MM-dd') === formattedDate;
      });
      const holiday = publicHolidays.find(h => h.date === formattedDate);
      const isHovered = hoveredDate === formattedDate;
      const disabled = !isWithinPeriod(thisDay) || !isCurrentMonth;
      const isSelectedMulti = multiDayMode && multiDayDates.includes(formattedDate);
      // Special highlight for College Reopens and Last Working Day
      const isCollegeReopens = dayEvents.some(ev => !Array.isArray(ev) && ev.title === 'College Reopens');
      const isLastWorkingDay = dayEvents.some(ev => !Array.isArray(ev) && ev.title === 'Last Working Day');
      days.push(
        <MuiTooltip title={isCollegeReopens ? 'College Reopens' : isLastWorkingDay ? 'Last Working Day' : (holiday ? holiday.name : '')} key={thisDay.toString()} arrow>
          <Box
            onMouseEnter={() => setHoveredDate(formattedDate)}
            onMouseLeave={() => setHoveredDate(null)}
            sx={{
              width: { xs: 90, sm: 120 },
              height: { xs: 90, sm: 120 },
              m: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 3,
              background: isSelectedMulti ? '#b3e5fc' : isCollegeReopens ? '#e3fcec' : isLastWorkingDay ? '#fffde7' : dayEvents.length > 0
                ? (!Array.isArray(dayEvents[0]) && dayEvents[0].type ? eventTypeColors[dayEvents[0].type] || '#e3e3e3' : '#e3e3e3')
                : isSun ? '#ffb3b3' : '#fff',
              border: isSelectedMulti ? '2.5px solid #0288d1' : isCollegeReopens ? '2.5px solid #43a047' : isLastWorkingDay ? '2.5px solid #fbc02d' : holiday ? '2.5px solid #d32f2f' : '2px solid #e0e0e0',
              fontWeight: 700,
              fontSize: 36,
              color: isCollegeReopens ? '#388e3c' : isLastWorkingDay ? '#fbc02d' : isSun ? '#cf1322' : '#222',
              opacity: disabled ? 0.18 : 1,
              position: 'relative',
              cursor: disabled ? 'not-allowed' : multiDayMode ? 'pointer' : 'pointer',
              overflow: 'hidden',
              boxShadow: isHovered && !disabled ? 6 : 1,
              zIndex: isHovered && !disabled ? 10 : 1,
              transition: 'all 0.18s cubic-bezier(.4,2,.6,1)',
              filter: hoveredDate && !isHovered ? 'blur(2px) grayscale(0.5)' : 'none',
              transform: isHovered && !disabled ? 'scale(1.08)' : 'scale(1)',
            }}
            onClick={() => {
              if (multiDayMode && !disabled && !multiDayStart) {
                setMultiDayStart(formattedDate);
                return;
              }
              // Prevent editing College Reopens and Last Working Day
              if (!disabled && !dayEvents.length && !multiDayMode) {
                setEditingEvent({ title: '', date: format(thisDay, 'yyyy-MM-dd'), type: '', description: '' });
                setEventModalOpen(true);
              }
            }}
          >
            <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: 1 }}>{format(thisDay, 'd')}</span>
            {holiday || (dayEvents.length > 0 && publicHolidays.some(h => h.date === formattedDate)) ? (
              <span style={{ position: 'absolute', top: 8, right: 12, width: 12, height: 12, borderRadius: '50%', background: '#d32f2f', display: 'inline-block', boxShadow: '0 0 0 2px #fff' }} />
            ) : null}
            {/* Event overlay on hover */}
            {isHovered && dayEvents.length > 0 && !disabled && !multiDayMode && !Array.isArray(dayEvents[0]) && dayEvents[0].type !== 'Special' && (
              <Box sx={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                bgcolor: 'rgba(255,255,255,0.92)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 3,
                zIndex: 20,
                p: 1,
                textAlign: 'center',
              }}>
                <Typography 
                  fontWeight={800} 
                  fontSize={16} 
                  color="#222" 
                  sx={{ 
                    mb: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: 1.2,
                    maxHeight: '2.4em'
                  }}
                >
                  {dayEvents[0].title}
                </Typography>
                <Typography fontWeight={600} fontSize={14} color="#666">{dayEvents[0].type}</Typography>
                <IconButton
                  size="small"
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteClick(dayEvents[0] as Event);
                  }}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    bgcolor: 'rgba(255,255,255,0.9)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                    width: 24,
                    height: 24,
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Box>
        </MuiTooltip>
      );
      day = addDays(day, 1);
    }
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, justifyItems: 'center', alignItems: 'center', mb: 1 }}>
        {days}
      </Box>
    );
  };

  // --- LEFT ARROW LOGIC ---
  const canGoPrevMonth = () => {
    if (!currentDate || !coe) return false;
    const prevMonth = subMonths(currentDate, 1);
    // Allow if any day in prev month is within period
    const start = new Date(coe.startDate);
    const end = new Date(coe.endDate);
    const prevMonthStart = startOfMonth(prevMonth);
    const prevMonthEnd = endOfMonth(prevMonth);
    return (
      prevMonthEnd >= start
    );
  };
  const canGoNextMonth = () => {
    if (!currentDate || !coe) return false;
    const nextMonth = addMonths(currentDate, 1);
    const start = new Date(coe.startDate);
    const end = new Date(coe.endDate);
    const nextMonthStart = startOfMonth(nextMonth);
    return (
      nextMonthStart <= end
    );
  };

  // In the Add Event modal logic:
  // When Multi-day Event is checked, if editingEvent.date is set, use it as the initial multiDayStart and calculate multiDayDates
  const handleMultiDayToggle = (checked: boolean) => {
    setMultiDayMode(checked);
    if (checked && editingEvent?.date) {
      setMultiDayStart(editingEvent.date);
      setMultiDayDates([editingEvent.date]);
    } else {
      setMultiDayDates([]);
      setMultiDayStart('');
    }
  };

  if (loading || !coe) return <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh"><CircularProgress /></Box>;

  return (
    <DashboardWrapper>
      <Box sx={{ maxWidth: 1100, mx: 'auto', mt: 4, p: 2, bgcolor: '#fafbfc', borderRadius: 3, boxShadow: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={() => navigate('/admin/calendar-of-events')} sx={{ bgcolor: 'white', width: 48, height: 48 }}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography fontFamily="monospace" fontWeight={700} fontSize={24}>{coe.name}</Typography>
              <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                {editingPeriod ? (
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <>
                      <DatePicker
                        label="Start Date"
                        value={periodDraft?.start ? new Date(periodDraft.start) : new Date(coe.startDate)}
                        onChange={(date: Date | null) => setPeriodDraft(d => d ? { ...d, start: date ? date.toISOString().slice(0, 10) : '' } : null)}
                        slotProps={{ textField: { size: 'small', sx: { width: 130 } } }}
                      />
                      <span style={{ margin: '0 8px' }}>to</span>
                      <DatePicker
                        label="End Date"
                        value={periodDraft?.end ? new Date(periodDraft.end) : new Date(coe.endDate)}
                        onChange={(date: Date | null) => setPeriodDraft(d => d ? { ...d, end: date ? date.toISOString().slice(0, 10) : '' } : null)}
                        minDate={periodDraft?.start ? new Date(periodDraft.start) : new Date(coe.startDate)}
                        slotProps={{ textField: { size: 'small', sx: { width: 130 } } }}
                      />
                      <Button size="small" onClick={() => {
                        if (periodDraft?.start && periodDraft?.end) {
                          handlePeriodChange(periodDraft.start, periodDraft.end);
                        }
                        setEditingPeriod(false);
                      }}>SAVE</Button>
                      <Button size="small" color="inherit" onClick={() => setEditingPeriod(false)}>CANCEL</Button>
                    </>
                  </LocalizationProvider>
                ) : (
                  <>
                    <Typography fontFamily="monospace" fontSize={16} color="text.secondary" sx={{ display: 'inline', mr: 1 }}>
                      Period: {formatPeriod(coe.startDate, coe.endDate)}
                    </Typography>
                    <IconButton size="small" onClick={() => setEditingPeriod(true)}><EditIcon fontSize="small" /></IconButton>
                  </>
                )}
              </Box>
            </Box>
          </Box>
          <Box display="flex" gap={2}>
            <IconButton onClick={() => {
              setCurrentDate(startOfMonth(new Date(coe.startDate)));
            }} sx={{ bgcolor: 'white', width: 48, height: 48 }}>
              <RefreshIcon />
            </IconButton>
            <Button variant="contained" color="primary" onClick={handleSave} sx={{ height: 48, minWidth: 90 }}>SAVE</Button>
          </Box>
        </Box>
        <Box display="flex" alignItems="center" justifyContent="center" mb={1} gap={2}>
          <IconButton 
            onClick={() => setCurrentDate(d => d && subMonths(d, 1))} 
            disabled={!canGoPrevMonth()}
            sx={{ 
              bgcolor: 'white',
              width: 48,
              height: 48,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
            }}
          >
            <ChevronLeftIcon sx={{ fontSize: 32 }} />
          </IconButton>
          <Typography variant="h5" fontWeight={700} align="center" sx={{ mx: 2 }}>
            {currentDate ? format(currentDate, 'MMMM yyyy') : ''}
          </Typography>
          <IconButton 
            onClick={() => setCurrentDate(d => d && addMonths(d, 1))} 
            disabled={!canGoNextMonth()}
            sx={{ 
              bgcolor: 'white',
              width: 48,
              height: 48,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
            }}
          >
            <ChevronRightIcon sx={{ fontSize: 32 }} />
          </IconButton>
        </Box>
        <Box sx={{ border: '2px solid #bbb', borderRadius: 2, p: 2, bgcolor: '#fff' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 1 }}>
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
              <Box key={day} sx={{
                p: 1,
                textAlign: 'center',
                fontWeight: 700,
                bgcolor: day === 'Sunday' ? '#ffb3b3' : '#f5f5f5',
                borderRadius: 1,
                border: '1.5px solid #bbb',
                fontFamily: 'monospace',
                fontSize: 16
              }}>{day}</Box>
            ))}
          </Box>
          {renderCalendar()}
        </Box>
        {/* Event Modal */}
        <Dialog open={eventModalOpen} onClose={() => { setEventModalOpen(false); setEditingEvent(null); setMultiDayMode(false); setMultiDayDates([]); setMultiDayStart(''); }} maxWidth="xs" fullWidth>
          <DialogTitle fontWeight={700}>{editingEvent?._id ? 'Edit Event' : 'Add Event'}</DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Holiday suggestion if selected date is a public holiday */}
              {editingEvent?.date && publicHolidays.filter(h => h.date === editingEvent.date).map(h => (
                <Box key={h.name} sx={{p: 1, borderRadius: 2, border: '1.5px solid #d32f2f', display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
                  onClick={() => setEditingEvent(ev => ev ? { ...ev, title: h.name, type: 'Holiday' } : null)}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#d32f2f', display: 'inline-block', marginRight: 8 }} />
                  <Button size="small" sx={{ color: '#d32f2f', fontWeight: 700, textTransform: 'none', p: 0, minWidth: 0 }} onClick={e => { e.stopPropagation(); setEditingEvent(ev => ev ? { ...ev, title: h.name, type: 'Holiday' } : null); }}>{h.name}</Button>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}></Typography>
                </Box>
              ))}
              <TextField
                label={<span>Event Name <span style={{ color: 'red' }}>*</span></span>}
                value={editingEvent?.title || ''}
                onChange={e => setEditingEvent(ev => ev ? { ...ev, title: e.target.value } : null)}
                fullWidth
                required
                margin="normal"
                inputProps={{ maxLength: 50 }}
              />
              <FormControlLabel
                control={<Checkbox checked={multiDayMode} onChange={e => handleMultiDayToggle(e.target.checked)} />}
                label="Multi-day Event"
                sx={{ mb: 1 }}
              />
              {multiDayMode ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, bgcolor: '#f8fafc', p: 2, borderRadius: 2, border: '1.5px solid #e0e0e0' }}>
                  <TextField
                    label={<span>Number of Days <span style={{ color: 'red' }}>*</span></span>}
                    type="number"
                    value={multiDayCount}
                    onChange={e => setMultiDayCount(Math.max(1, Number(e.target.value)))}
                    fullWidth
                    required
                    inputProps={{ min: 1, max: 31 }}
                  />
                  <TextField
                    label={<span>Start Date <span style={{ color: 'red' }}>*</span></span>}
                    type="date"
                    value={multiDayStart}
                    onChange={e => setMultiDayStart(e.target.value)}
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                  <Box sx={{ mt: 1, color: multiDayDates.length === multiDayCount ? 'green' : 'text.secondary', fontWeight: 600 }}>
                    {multiDayDates.length} / {multiDayCount} days selected. Holidays will be skipped.
                  </Box>
                </Box>
              ) : (
                <TextField
                  label={<span>Date <span style={{ color: 'red' }}>*</span></span>}
                  type="date"
                  value={editingEvent?.date || ''}
                  onChange={e => setEditingEvent(ev => ev ? { ...ev, date: e.target.value } : null)}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                />
              )}
              <Select
                value={editingEvent?.type || ''}
                onChange={e => setEditingEvent(ev => ev ? { ...ev, type: e.target.value as string } : null)}
                fullWidth
                required
                displayEmpty
                sx={{ mb: 2 }}
              >
                <MenuItem value="" disabled>Select Event Type <span style={{ color: 'red' }}>*</span></MenuItem>
                {eventTypeOptions.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
              </Select>
              <TextField
                label="Description"
                value={editingEvent?.description || ''}
                onChange={e => setEditingEvent(ev => ev ? { ...ev, description: e.target.value } : null)}
                fullWidth
                margin="normal"
                multiline
                minRows={2}
              />
            </Box>
            {editingEvent && (editingEvent.title || editingEvent.type || editingEvent.description) && (
              <IconButton size="small" onClick={() => setEditingEvent({ title: '', date: editingEvent.date, type: '', description: '' })} sx={{ position: 'absolute', top: 8, right: 8 }}>
                <ClearIcon />
              </IconButton>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setEventModalOpen(false); setEditingEvent(null); setMultiDayMode(false); setMultiDayDates([]); setMultiDayStart(''); }} color="inherit">Cancel</Button>
            <Button variant="contained" onClick={handleEventModalOk} disabled={loading || (multiDayMode && multiDayDates.length !== multiDayCount)}>Save</Button>
          </DialogActions>
        </Dialog>
        {/* Delete Confirmation Dialog */}
        <MuiDialog open={deleteConfirmOpen} onClose={() => { setDeleteConfirmOpen(false); }}>
          <MuiDialogTitle>Delete Event</MuiDialogTitle>
          <MuiDialogContent>
            Are you sure you want to delete this event?
          </MuiDialogContent>
          <MuiDialogActions>
            <Button onClick={() => { setDeleteConfirmOpen(false); }}>Cancel</Button>
            <Button onClick={handleDeleteConfirm} color="error">Delete</Button>
          </MuiDialogActions>
        </MuiDialog>
      </Box>
    </DashboardWrapper>
  );
};

export default COEEditPage; 