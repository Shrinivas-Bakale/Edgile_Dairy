import React from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Chip } from '@mui/material';
import { format, parseISO } from 'date-fns';

interface Event {
  _id?: string;
  title: string;
  date: string;
  type: string;
  description?: string;
}

interface COECalendarTableProps {
  events: Event[][];
  startDate: string;
  endDate: string;
}

const COECalendarTable: React.FC<COECalendarTableProps> = ({ events, startDate, endDate }) => {
  const getEventColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'exam':
        return '#f44336';
      case 'holiday':
        return '#4caf50';
      case 'event':
        return '#2196f3';
      case 'deadline':
        return '#ff9800';
      default:
        return '#757575';
    }
  };

  const getWeekDates = () => {
    const dates: Date[] = [];
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    let current = start;

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const weekDates = getWeekDates();
  const weeks = [];
  for (let i = 0; i < weekDates.length; i += 7) {
    weeks.push(weekDates.slice(i, i + 7));
  }

  return (
    <TableContainer component={Paper} elevation={0}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '120px', bgcolor: 'background.default' }} />
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
              <TableCell 
                key={day}
                align="center"
                sx={{ 
                  bgcolor: 'background.default',
                  fontWeight: 600,
                  color: 'text.secondary',
                  py: 2
                }}
              >
                {day}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {weeks.map((week, weekIndex) => (
            <TableRow key={weekIndex}>
              <TableCell 
                sx={{ 
                  bgcolor: 'background.default',
                  fontWeight: 600,
                  color: 'text.secondary',
                  borderRight: '1px solid',
                  borderColor: 'divider'
                }}
              >
                Week {weekIndex + 1}
              </TableCell>
              {week.map((date, dayIndex) => {
                const dayEvents = events[weekIndex]?.[dayIndex] || [];
                return (
                  <TableCell 
                    key={dayIndex}
                    sx={{ 
                      height: '120px',
                      verticalAlign: 'top',
                      p: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper'
                    }}
                  >
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block',
                        mb: 1,
                        color: 'text.secondary'
                      }}
                    >
                      {format(date, 'd MMM')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {Array.isArray(dayEvents) && dayEvents.map((event: Event, eventIndex: number) => (
                        <Chip
                          key={eventIndex}
                          label={event.title}
                          size="small"
                          sx={{
                            bgcolor: getEventColor(event.type),
                            color: 'white',
                            '& .MuiChip-label': {
                              px: 1,
                              fontSize: '0.75rem',
                              fontWeight: 500
                            }
                          }}
                        />
                      ))}
                    </Box>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default COECalendarTable; 