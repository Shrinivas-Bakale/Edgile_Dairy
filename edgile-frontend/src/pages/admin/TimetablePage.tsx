import React, { useState, useEffect, ReactElement } from 'react';
import axios from 'axios';
import config from '@/config';
import { Button } from '@/components/ui/button';
import { FormSelect } from '@/components/ui/form-select';
import LoadingOverlay from '@/components/LoadingOverlay';
import Loading from '@/components/Loading';
import EmptyState from '@/components/EmptyState';
import { SearchAndFilter } from '@/components/SearchAndFilter';
import { useAuth } from '@/hooks/useAuth';
import { useSnackbar } from '@/hooks/useSnackbar';
import withDashboard from '@/components/withDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import TimetableTemplates from "@/components/admin/TimetableTemplates";
import { Template as TimetableTemplate, TimeSlot as TimetableTimeSlot, Day as TimetableDay, Subject as TimetableSubject } from '@/components/admin/TimetableTemplates';
import { AlertCircle, PlusCircle, RefreshCw, User, BookOpen, Save, Trash, Eye, EyeOff, X, MapPin, BarChart2, Download, PencilIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import TimetableEditor from '@/components/admin/TimetableEditor';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Grid, TextField, DialogActions, Box } from '@mui/material';
import { Dialog as MuiDialog, DialogContent as MuiDialogContent, DialogTitle as MuiDialogTitle } from '@mui/material';
import { Grid as MuiGrid } from '@mui/material';
import html2pdf from 'html2pdf.js';
import DashboardWrapper from '../../components/DashboardWrapper';

// Constants
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const YEARS = ['First', 'Second', 'Third'] as const;
const SEMESTERS = {
  'First': [1, 2],
  'Second': [3, 4],
  'Third': [5, 6]
} as const;

// Style constants
const CARD_CLASS = "mb-6";
const BUTTON_CLASS = "flex items-center justify-center gap-2 w-full";

// Time helper functions
const parseTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const formatMinutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const calculateNextClassEnd = (intervalTo: string): string => {
  const intervalToMins = parseTimeToMinutes(intervalTo);
  const nextClassEndMins = intervalToMins + 60;
  return formatMinutesToTime(nextClassEndMins);
};

const calculateLunchTime = (intervalFrom: string, intervalTo: string): { lunchFrom: string, lunchTo: string } => {
  const intervalToMins = parseTimeToMinutes(intervalTo);
  
  // Calculate class ending time after interval
  const classAfterIntervalEndMins = intervalToMins + 60; // One hour after interval ends
  
  // Set lunch to start at the end of class after interval
  const lunchFromMins = classAfterIntervalEndMins;
  const lunchToMins = lunchFromMins + 60; // Default lunch is 60 minutes
  
  return {
    lunchFrom: formatMinutesToTime(lunchFromMins),
    lunchTo: formatMinutesToTime(lunchToMins)
  };
};

// New interfaces
interface Faculty {
  _id: string;
  name: string;
  email: string;
  department: string;
  status: 'available' | 'busy';
  currentSlot?: {
    day: string;
    startTime: string;
    endTime: string;
  };
}

interface Subject {
  _id: string;
  name: string;
  subjectCode: string;
  type: string;
  code?: string;
  faculty?: Faculty[];
  weeklyHours?: number;
}

// 1. Fix TimeSlot type
type TimeSlotType = 'Core' | 'Lab' | 'Elective' | 'interval' | 'lunch' | '';
interface TimeSlot {
  time: string;
  type: TimeSlotType;
  startTime?: string;
  endTime?: string;
  subjectCode?: string;
  facultyId?: string | null;
}

interface Day {
  day: string;
  slots: TimeSlot[];
}

interface Template {
  _id: string;
  name: string;
  description: string;
  year: string;
  semester: number;
  division: string;
  classroomId: string;
  days: Day[];
  status: string;
  classTeacherId?: string;
  university?: string;
}

interface Classroom {
  _id: string;
  name: string;
  capacity: number;
  building?: string;
  floor?: number;
}

interface FormState {
  year: string;
  semester: string;
  division: string;
  classroom: string;
  errors: {
    year?: string;
    semester?: string;
    division?: string;
    classroom?: string;
  };
}

// New interfaces for the redesigned layout
interface TimetableSlot {
  id: string;
  day: string;
  time: string;
  subjectCode?: string;
  facultyId?: string;
  status: 'empty' | 'valid' | 'conflict';
  conflicts?: string[];
}

interface TimetableGrid {
  slots: TimetableSlot[];
}

// Function to generate dynamic time slots based on interval and lunch settings
const generateTimeSlots = (
  intervalFrom: string,
  intervalTo: string,
  lunchFrom: string,
  lunchTo: string
): {time: string, type: string, startTime?: string, endTime?: string}[] => {
  // Define the school day start and end
  const dayStart = '09:00';
  const dayEnd = '16:15';
  const slotDuration = 60; // 1 hour slots

  // Helper to add minutes to a time string
  const addMinutes = (time: string, mins: number) => {
    const [h, m] = time.split(':').map(Number);
    const date = new Date(0, 0, 0, h, m + mins);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // Build all possible slots for the day
  let slots: {time: string, type: string, startTime?: string, endTime?: string}[] = [];
  let current = dayStart;
  while (current < dayEnd) {
    const next = addMinutes(current, slotDuration);
    // Insert interval
    if (current === intervalFrom) {
      slots.push({ time: `${intervalFrom} - ${intervalTo}`, type: 'interval', startTime: intervalFrom, endTime: intervalTo });
      current = intervalTo;
      continue;
    }
    // Insert lunch
    if (current === lunchFrom) {
      slots.push({ time: `${lunchFrom} - ${lunchTo}`, type: 'lunch', startTime: lunchFrom, endTime: lunchTo });
      current = lunchTo;
      continue;
    }
    // Add regular class slot
    if (addMinutes(current, slotDuration) <= dayEnd) {
      slots.push({ time: `${current} - ${next}`, type: 'class', startTime: current, endTime: next });
    }
    current = next;
  }
  return slots;
};

// Main component
const TimetablePage = (): ReactElement => {
  const { user, token } = useAuth();
  const { showSnackbar } = useSnackbar();
  
  // State variables with proper types
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [formState, setFormState] = useState<FormState>({
    year: '',
    semester: '',
    division: '',
    classroom: '',
    errors: {}
  });
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPageLoading, setIsPageLoading] = useState<boolean>(false);
  const [availableSemesters, setAvailableSemesters] = useState<number[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isLoadingFaculty, setIsLoadingFaculty] = useState(false);
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [facultyError, setFacultyError] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<{
    day: string;
    slotIndex: number;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [classTeacher, setClassTeacher] = useState<Faculty | null>(null);
  
  // Add state for interval and lunch duration
  const [intervalDuration, setIntervalDuration] = useState(15); // minutes
  const [lunchDuration, setLunchDuration] = useState(60); // minutes
  
  // Update interval and lunch state with validation
  const [intervalFrom, setIntervalFrom] = useState('11:00');
  const [intervalTo, setIntervalTo] = useState('11:15');
  const [lunchFrom, setLunchFrom] = useState('13:15');
  const [lunchTo, setLunchTo] = useState('14:15');
  
  // Track if lunch time has been manually set by user
  const [lunchManuallySet, setLunchManuallySet] = useState(false);
  
  // Helper to add minutes to a time string
  const addMinutesToTime = (time: string, mins: number) => {
    const [h, m] = time.split(':').map(Number);
    const date = new Date(0, 0, 0, h, m + mins);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };
  
  // Handlers for interval
  const handleIntervalTimeChange = (value: string) => {
    setIntervalFrom(value);
    const newTo = addMinutesToTime(value, intervalDuration);
    setIntervalTo(newTo);
  };
  const handleIntervalDurationChange = (value: number) => {
    setIntervalDuration(value);
    const newTo = addMinutesToTime(intervalFrom, value);
    setIntervalTo(newTo);
  };
  // Handlers for lunch
  const handleLunchTimeChange = (value: string) => {
      setLunchFrom(value);
    const newTo = addMinutesToTime(value, lunchDuration);
    setLunchTo(newTo);
  };
  const handleLunchDurationChange = (value: number) => {
    setLunchDuration(value);
    const newTo = addMinutesToTime(lunchFrom, value);
    setLunchTo(newTo);
  };
  
  // Generate dynamic time slots based on interval and lunch settings
  const [timeSlots, setTimeSlots] = useState(generateTimeSlots(intervalFrom, intervalTo, lunchFrom, lunchTo));
  
  // Add state for timetable slots
  const [timetable, setTimetable] = useState<Record<string, { subject?: Subject; faculty?: Faculty }[]>>(() => {
    // Initialize timetable: day -> slot[]
    const initial: Record<string, { subject?: Subject; faculty?: Faculty }[]> = {};
    DAYS.forEach(day => {
      initial[day] = timeSlots.map(() => ({}));
    });
    return initial;
  });
  
  // Add state to control template generation
  const [templateGenerated, setTemplateGenerated] = useState(false);
  const isConfigComplete = formState.year && formState.semester && formState.division && formState.classroom;

  // Add hardcoded admin ID that we know exists
  const ADMIN_ID = "67ebf8fd6d67fe911abf8c42";
  
  // Fetch all timetables for the current user
  const fetchTimetables = async () => {
    try {
      setLoading(true);
      // Use hardcoded admin ID if user is not available
      const userId = user?._id || ADMIN_ID;
      
      // Use token from context or localStorage
      let currentToken = token;
      if (!currentToken) {
        currentToken = localStorage.getItem('token');
      }
      
      if (!currentToken) {
        console.error('No token available for fetching timetables');
        showSnackbar('Authentication required to view timetables', 'error');
        setLoading(false);
        return;
      }
      
      console.log(`Fetching timetables for university: ${userId}`);
      
      // Include university parameter in the request
      const response = await fetch(`${config.API_URL}/api/admin/timetable/list?university=${userId}`, {
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch timetables: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Timetables fetch response:', data);
      
      if (data.success && Array.isArray(data.data)) {
        // Update templates array with fresh data
        setTemplates(data.data);
        
        // If we have a selected template, update it with the fresh data
        if (selectedTemplate) {
          const updatedSelectedTemplate = data.data.find((t: Template) => t._id === selectedTemplate._id);
          if (updatedSelectedTemplate) {
            console.log(`Updating selected template status from ${selectedTemplate.status} to ${updatedSelectedTemplate.status}`);
            setSelectedTemplate(updatedSelectedTemplate);
          }
        }
        
        // Also update allTimetables for conflict detection
        setAllTimetables(data.data);
        
        console.log(`Loaded ${data.data.length} timetables with statuses:`, 
          data.data.map((t: Template) => ({ id: t._id, status: t.status })));
      } else {
        console.log('No timetables found or invalid data format');
      }
    } catch (error) {
      console.error('Error fetching timetables:', error);
      showSnackbar('Failed to fetch timetables', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add refresh handlers for faculty and subjects
  const handleRefreshFaculty = () => {
    setIsLoadingFaculty(true);
    fetchFaculty().finally(() => setIsLoadingFaculty(false));
  };
  const handleRefreshSubjects = () => {
    setIsLoadingSubjects(true);
    fetchSubjects().finally(() => setIsLoadingSubjects(false));
  };

  // Helper functions with typed parameters and return values
  const getCurrentAcademicYear = (): string => {
    const today = new Date();
    const currentMonth = today.getMonth();
    let startYear: number;
    if (currentMonth >= 6) {
      startYear = today.getFullYear();
    } else {
      startYear = today.getFullYear() - 1;
    }
    const endYear = (startYear + 1) % 100;
    return `${startYear}-${String(endYear).padStart(2, '0')}`;
  };

  const fetchAvailableClassrooms = async () => {
    try {
      // Get active token or backup from localStorage
      let activeToken = token;
      if (!activeToken) {
        console.log('[TimetablePage] No active token, checking localStorage');
        activeToken = localStorage.getItem('token');
      }

      if (!activeToken) {
        console.error('[TimetablePage] No token available for classroom fetch');
        showSnackbar('Please log in to view classrooms', 'error');
        return;
      }

      // Basic JWT format validation
      if (activeToken.split('.').length !== 3) {
        console.error('[TimetablePage] Invalid token format');
        showSnackbar('Session expired. Please log in again.', 'error');
        return;
      }

      console.log('[TimetablePage] Fetching classrooms with token:', activeToken.substring(0, 10) + '...');
      const response = await axios.get(`${config.API_URL}/api/admin/classrooms`, {
        headers: {
          Authorization: `Bearer ${activeToken}`
        },
        timeout: 5000 // 5 second timeout
      });

      console.log('[TimetablePage] Received classroom data:', response.data);
      
      // Handle different response formats
      if (response.data?.success && Array.isArray(response.data?.classrooms)) {
        console.log('[TimetablePage] Using classrooms array from response.classrooms');
        setClassrooms(response.data.classrooms);
      } else if (response.data && Array.isArray(response.data.data)) {
        console.log('[TimetablePage] Using classrooms array from response.data');
        setClassrooms(response.data.data);
      } else if (Array.isArray(response.data)) {
        console.log('[TimetablePage] Using direct array response');
        setClassrooms(response.data);
      } else {
        console.error('[TimetablePage] Invalid classroom data format:', response.data);
        showSnackbar('Error loading classrooms: Invalid data format', 'error');
      }
    } catch (error) {
      console.error('[TimetablePage] Error fetching classrooms:', error);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          showSnackbar('Request timed out. Please try again.', 'error');
        } else if (error.response?.status === 401) {
          showSnackbar('Session expired. Please log in again.', 'error');
        } else {
          showSnackbar(error.response?.data?.message || 'Error loading classrooms', 'error');
        }
      }
    }
  };

  // Implement the create classrooms function
  const createClassrooms = async (): Promise<void> => {
    if (!user?._id || !token) {
      showSnackbar("You must be logged in to create classrooms", "error");
      return;
    }
    
    try {
      setIsPageLoading(true);
      console.log("Creating classrooms in database");
      
      const response = await axios.post(
        `${config.API_URL}/api/admin/classrooms/create-test-data`,
        { university: user._id },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log("Create classrooms response:", response.data);
      
      if (response.data?.success) {
        showSnackbar("Classrooms created successfully", "success");
        fetchAvailableClassrooms(); // Refresh the classroom list
      } else {
        showSnackbar("Failed to create classrooms: " + (response.data?.message || "Unknown error"), "error");
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Unknown error";
      console.error("Error creating classrooms:", errorMessage);
      showSnackbar(`Failed to create classrooms: ${errorMessage}`, 'error');
    } finally {
      setIsPageLoading(false);
    }
  };

  // Update the ForceRefreshButton to create real classrooms
  const ClassroomActionButton = () => (
    <div className="flex items-center space-x-2">
      <Button 
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          fetchAvailableClassrooms();
        }}
        className="text-sm"
        variant="outline"
      >
        Refresh Classrooms
      </Button>
      
      <Button 
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          createClassrooms();
        }}
        className="text-sm"
        variant="default"
      >
        Create Classrooms
      </Button>
    </div>
  );

  // Improve handleFormChange with better state updates
  const handleFormChange = <K extends keyof Omit<FormState, 'errors'>>(
    field: K,
    value: FormState[K]
  ) => {
    console.log(`Form change: ${field} = ${value}`);
    
    // Check classroom availability if the field is 'classroom'
    if (field === 'classroom' && value) {
      const isOccupied = isClassroomOccupied(value as string);
      if (isOccupied) {
        const classInfo = getClassUsingClassroom(value as string);
        showSnackbar(`This classroom is already assigned to ${classInfo}. Please select a different classroom.`, 'warning');
        return; // Don't update state if classroom is occupied
      }
    }
    
    setFormState(prev => ({
      ...prev,
      [field]: value,
      errors: {
        ...prev.errors,
        [field]: undefined
      }
    }));

    // Set configuration changed flag if we have a generated template
    if (templateGenerated) {
      setHasConfigChanged(true);
    }

    // Reset dependent fields
    if (field === 'year') {
      setFormState(prev => ({
        ...prev,
        semester: '',
        division: '',
        classroom: '',
      }));
      setSubjects([]);
    } else if (field === 'semester') {
      setFormState(prev => ({
        ...prev,
        division: '',
        classroom: '',
      }));
    } else if (field === 'division') {
      setFormState(prev => ({
        ...prev,
        classroom: '',
      }));
    }
  };

  const updateAvailableSemesters = (year: string): void => {
    const semesterMap = {
      'First': [1, 2],
      'Second': [3, 4],
      'Third': [5, 6]
    };
    setAvailableSemesters(semesterMap[year as keyof typeof semesterMap] || []);
  };

  const isFormComplete = () => {
    return Boolean(
      formState.year &&
      formState.semester &&
      formState.division &&
      formState.classroom
    );
  };

  // Fix the generate templates function
  const generateTemplates = async () => {
    if (!user?._id || !token) {
      console.log('Generate templates: No user or token');
      showSnackbar('Please log in to generate templates', 'error');
      return;
    }

    if (!isFormComplete()) {
      console.log('Generate templates: Form incomplete', formState);
      showSnackbar('Please complete all required fields', 'error');
      return;
    }

    setIsPageLoading(true);
    console.log('Generating templates with data:', {
      year: formState.year,
      semester: formState.semester,
      division: formState.division,
      classroom: formState.classroom
    });

    try {
      const response = await fetch(`${config.API_URL}/api/admin/timetable/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          year: formState.year,
          semester: parseInt(formState.semester),
          division: formState.division,
          classroom: formState.classroom
        })
      });

      if (!response.ok) {
        console.error('Generate templates: API error', response.status, response.statusText);
        throw new Error(`Failed to generate templates: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Generate templates: Received data', data);

      const convertedTemplates: Template[] = data.templates.map((t: any) => ({
        _id: t._id || '',
        name: t.name || '',
        description: t.description,
        year: formState.year,
        semester: parseInt(formState.semester),
        division: formState.division,
        classroomId: formState.classroom,
        status: 'draft',
        days: t.days.map((day: any) => ({
          day: day.name,
          slots: day.slots.map((slot: any) => ({
            time: slot.time || '09:00',
            type: slot.type || '',
            startTime: slot.startTime || '09:00',
            endTime: slot.endTime || '10:00',
            subjectCode: slot.subjectCode || '',
            facultyId: slot.facultyId || null,
          }))
        }))
      }));

      console.log('Generate templates: Converted templates', convertedTemplates);
      setTemplates(convertedTemplates);
      showSnackbar('Templates generated successfully', 'success');
    } catch (error) {
      console.error('Error generating templates:', error);
      showSnackbar('Failed to generate templates', 'error');
    } finally {
      setIsPageLoading(false);
    }
  };

  // Helper function to increment time by 1 hour
  const incrementTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const nextHour = hours + 1 > 23 ? 23 : hours + 1;
    return `${nextHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleTemplateSelect = (template: Template | null) => {
    if (!template) {
      setSelectedTemplate(null);
      return;
    }

    // Find the template in the current templates list to ensure we have the latest status
    const currentTemplate = templates.find(t => t._id === template._id);
    
    // If found in current list, use that one; otherwise use the provided template
    const templateToUse = currentTemplate || template;

    const fullTemplate: Template = {
      _id: templateToUse._id || '',
      name: templateToUse.name || '',
      description: templateToUse.description,
      year: templateToUse.year || formState.year,
      semester: templateToUse.semester || parseInt(formState.semester),
      division: templateToUse.division || formState.division,
      classroomId: templateToUse.classroomId || formState.classroom,
      status: templateToUse.status || 'draft',
      days: templateToUse.days?.map(day => ({
        day: day.day || '',
        slots: day.slots?.map(slot => ({
          time: slot.time || '09:00',
          type: slot.type || '',
          startTime: slot.startTime || '09:00',
          endTime: slot.endTime || '10:00',
          subjectCode: slot.subjectCode || '',
          facultyId: slot.facultyId || null,
        })) || []
      })) || [],
      university: templateToUse.university || ADMIN_ID
    };

    console.log(`Selected template with status: ${fullTemplate.status}`);
    setSelectedTemplate(fullTemplate);
    setIsEditing(true);
  };

  // Updated template for createComponentTemplate
  const createComponentTemplate = (template: Template | null): Template | null => {
    if (!template) return null;

    try {
      return {
        _id: template._id,
        name: template.name,
        description: template.description,
        year: template.year,
        semester: template.semester,
        division: template.division,
        classroomId: template.classroomId,
        status: 'draft',
        university: template.university || ADMIN_ID,
        days: template.days.map(day => ({
          day: day.day,
          slots: day.slots.map(slot => ({
            time: slot.time || '09:00',
            type: slot.type || '',
            startTime: slot.startTime || '09:00',
            endTime: slot.endTime || '10:00',
            subjectCode: slot.subjectCode || '',
            facultyId: slot.facultyId || null,
          }))
        }))
      };
    } catch (error) {
      console.error('Error creating component template:', error);
      return null;
    }
  };

  // Updated createCustomTemplate
  const createCustomTemplate = () => {
    if (!isFormComplete()) {
      showSnackbar('Please complete all required fields', 'error');
      return;
    }

    const newTemplate: Template = {
      _id: `custom-${Date.now()}`,
      name: `Custom Template - ${formState.year} Year ${formState.division}`,
      description: 'Custom timetable template',
      year: formState.year,
      semester: parseInt(formState.semester),
      division: formState.division,
      classroomId: formState.classroom,
      status: 'draft',
      university: ADMIN_ID,
      days: DAYS.map(dayName => ({
        day: dayName,
        slots: []
      }))
    };

    console.log('Creating custom template:', newTemplate);
    setTemplates(prev => [...prev, newTemplate]);
    setSelectedTemplate(newTemplate);
    setIsEditing(true);
    showSnackbar('Custom template created', 'success');
  };

  const fetchSubjects = async () => {
    if (!formState.year || !formState.semester) {
      setSubjects([]);
      return;
    }

    setIsLoadingSubjects(true);
    setSubjectError(null);

    try {
      const response = await axios.get(`${config.API_URL}/api/admin/subjects`, {
        params: {
          year: formState.year,
          semester: parseInt(formState.semester)
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data?.subjects) {
        const normalizedSubjects = response.data.subjects.map((subject: any) => ({
          _id: subject._id,
          name: subject.name,
          subjectCode: subject.code || subject.subjectCode,
          type: subject.type || 'Regular',
          code: subject.code,
          faculty: subject.faculty || [],
          weeklyHours: subject.weeklyHours
        }));
        setSubjects(normalizedSubjects);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setSubjectError('Failed to load subjects');
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const fetchFaculty = async () => {
    setIsLoadingFaculty(true);
    setFacultyError(null);

    try {
      const response = await axios.get(`${config.API_URL}/api/admin/faculty`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data?.faculty) {
        const facultyWithStatus = response.data.faculty.map((faculty: any) => ({
          ...faculty,
          status: 'available' as const
        }));
        setFaculty(facultyWithStatus);
      }
    } catch (error) {
      console.error('Error fetching faculty:', error);
      setFacultyError('Failed to load faculty');
    } finally {
      setIsLoadingFaculty(false);
    }
  };

  // Handle template save
  const handleTemplateSave = async (template: Template) => {
    setLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/api/admin/timetable/${template._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(template)
      });

      if (!response.ok) throw new Error('Failed to save template');

      setTemplates(prev => 
        prev.map(t => t._id === template._id ? template : t)
      );
      showSnackbar('Template saved successfully', 'success');
    } catch (err) {
      console.error('Error saving template:', err);
      showSnackbar('Failed to save template', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add state for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [timetableToDelete, setTimetableToDelete] = useState<string | null>(null);

  // Update the handleTemplateDelete function
  const handleTemplateDelete = async (templateId: string) => {
    if (!templateId) return;
    
    // Open confirmation dialog
    setTimetableToDelete(templateId);
    setIsDeleteDialogOpen(true);
  };

  // Update the confirmDeleteTemplate function to include university ID in query parameters
  const confirmDeleteTemplate = async () => {
    if (!timetableToDelete) return;
    
    setLoading(true);
    try {
      const currentToken = token || localStorage.getItem('token');
      const adminId = user?._id || ADMIN_ID;
      
      if (!currentToken) {
        showSnackbar('Authentication required to delete timetable', 'error');
        setLoading(false);
        return;
      }
      
      console.log(`Deleting timetable with ID: ${timetableToDelete}`);
      
      // Include university ID in URL to help with authorization
      const response = await fetch(`${config.API_URL}/api/admin/timetable/${timetableToDelete}?university=${adminId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });
      
      if (!response.ok) {
        // Log response status for debugging
        console.error(`Delete failed with status: ${response.status}`);
        const errorText = await response.text();
        console.error(`Error response: ${errorText}`);
        
        let errorMessage = 'Failed to delete timetable';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If not valid JSON, use the raw text
          if (errorText) errorMessage = errorText;
        }
        
        throw new Error(errorMessage);
      }
      
      // Try to parse response as JSON
      let responseData;
      try {
        const text = await response.text();
        responseData = text ? JSON.parse(text) : { message: 'Timetable deleted successfully' };
      } catch (e) {
        // If parsing fails, create a default response
        responseData = { message: 'Timetable deleted successfully' };
      }
      
      console.log('Delete response:', responseData);
      
      // Remove the deleted timetable from state
      setTemplates(prev => prev.filter(t => t._id !== timetableToDelete));
      
      // Clear selected template if it was the one deleted
      if (selectedTemplate && selectedTemplate._id === timetableToDelete) {
        setSelectedTemplate(null);
        setIsEditing(false);
      }
      
      showSnackbar(responseData.message || 'Timetable deleted successfully', 'success');
    } catch (err: any) {
      console.error('Error deleting template:', err);
      showSnackbar(`Failed to delete timetable: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      setIsDeleteDialogOpen(false);
      setTimetableToDelete(null);
    }
  };

  // Update the handleTemplatePublish function to include university ID
  const handleTemplatePublish = async (templateId: string) => {
    if (!templateId) return;
    
    setLoading(true);
    try {
      const currentToken = token || localStorage.getItem('token');
      const adminId = user?._id || ADMIN_ID;
      
      if (!currentToken) {
        showSnackbar('Authentication required to publish timetable', 'error');
        setLoading(false);
        return;
      }
      
      console.log(`Publishing timetable with ID: ${templateId}`);
      
      // Include university ID in URL to help with authorization
      const response = await fetch(`${config.API_URL}/api/admin/timetable/${templateId}/publish?university=${adminId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
        // No need to send body as the backend doesn't require it
      });
      
      if (!response.ok) {
        // Log response status for debugging
        console.error(`Publish failed with status: ${response.status}`);
        const errorText = await response.text();
        console.error(`Error response: ${errorText}`);
        
        let errorMessage = 'Failed to publish timetable';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If not valid JSON, use the raw text
          if (errorText) errorMessage = errorText;
        }
        
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      console.log('Publish response:', responseData);
      
      // Update templates list with published status
      setTemplates(prev => 
        prev.map(t => t._id === templateId ? { ...t, status: 'published' } : t)
      );
      
      // If the selected template is the one being published, update it too
      if (selectedTemplate && selectedTemplate._id === templateId) {
        setSelectedTemplate({
          ...selectedTemplate,
          status: 'published'
        });
      }
      
      showSnackbar(responseData.message || 'Timetable published successfully', 'success');
    } catch (err: any) {
      console.error('Error publishing template:', err);
      showSnackbar(`Failed to publish timetable: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Reset timetable grid after successful save
  const resetTimetableGrid = () => {
    // Reset the timetable data
    setTimetable(() => {
      // Initialize timetable: day -> slot[]
      const initial: Record<string, { subject?: Subject; faculty?: Faculty }[]> = {};
      DAYS.forEach(day => {
        initial[day] = timeSlots.map(() => ({}));
      });
      return initial;
    });
    
    // Reset active slot
    setActiveSlot(null);
    
    // Reset template generated state to show form again
    setTemplateGenerated(false);
    
    console.log('Timetable grid reset');
  };

  // Add function to validate required fields before saving timetable
  const validateTimetableData = (): boolean => {
    // Check for basic configuration
    if (!formState.year) {
      showSnackbar('Please select a year', 'warning');
      return false;
    }
    if (!formState.semester) {
      showSnackbar('Please select a semester', 'warning');
      return false;
    }
    if (!formState.division) {
      showSnackbar('Please select a division', 'warning');
      return false;
    }
    if (!formState.classroom) {
      showSnackbar('Please select a classroom', 'warning');
      return false;
    }
    
    // Check if classroom is already in use by another timetable
    if (isClassroomOccupied(formState.classroom)) {
      showSnackbar('This classroom is already assigned to another class. Please select a different classroom.', 'error');
      return false;
    }
    
    // Strongly encourage class teacher assignment
    if (!classTeacher) {
      // Show a warning but don't block saving
      showSnackbar('No class teacher assigned. It is recommended to assign a class teacher.', 'warning');
    } else if (isFacultyClassTeacherElsewhere(classTeacher._id)) {
      // Block saving if the class teacher is already assigned elsewhere
      showSnackbar('The selected class teacher is already assigned to another class. Please select a different faculty.', 'error');
      return false;
    }
    
    // Check if at least one day has some data
    let hasContent = false;
    Object.keys(timetable).forEach(day => {
      const daySlots = timetable[day];
      if (daySlots.some(slot => slot.subject || slot.faculty)) {
        hasContent = true;
      }
    });
    
    if (!hasContent) {
      showSnackbar('Please add at least one subject or faculty to the timetable', 'warning');
      return false;
    }
    
    return true;
  };

  // Add state to track configuration changes
  const [hasConfigChanged, setHasConfigChanged] = useState(false);

  // Add state for duplicate timetable dialog
  const [duplicateTimetableDialogOpen, setDuplicateTimetableDialogOpen] = useState(false);
  const [existingTimetableId, setExistingTimetableId] = useState<string | null>(null);

  // Function to check if timetable configuration already exists
  const checkTimetableExists = (): boolean => {
    const config = {
      year: formState.year,
      semester: formState.semester,
      division: formState.division
    };
    
    // Make sure we're checking against all timetables, not just templates
    // Use allTimetables instead of templates as it contains the complete list
    for (const tt of allTimetables) {
      if (tt.year === config.year && 
          tt.semester.toString() === config.semester && 
          tt.division === config.division) {
        setExistingTimetableId(tt._id);
        console.log(`Found existing timetable with same configuration: ${tt._id}`);
        return true;
      }
    }
    return false;
  };

  // Update handleSaveTimetable to check for duplicate configuration
  const handleSaveTimetable = () => {
    if (!validateTimetableData()) {
      return;
    }

    setLoading(true);

    // Prepare days array with the correct structure
    const days: Day[] = DAYS.map(day => {
      const timeSlotData = timeSlots.map((slot, idx) => {
        const slotData = timetable[day][idx];
        
        // Extract times from the slot if they exist, otherwise from the time string
        const [startTimeStr, endTimeStr] = slot.time.split(' - ');
        
        // Map frontend types to backend enum values
        // Backend expects: 'Core', 'Lab', 'Elective', or ''
        let slotType = '';
        if (slot.type === 'interval' || slot.type === 'lunch') {
          // For non-class slots, we'll keep them empty but recognize them by time
          slotType = '';
        } else if (slotData?.subject?.type === 'Core') {
          slotType = 'Core';
        } else if (slotData?.subject?.type === 'Lab') {
          slotType = 'Lab';
        } else if (slotData?.subject?.type === 'Elective') {
          slotType = 'Elective';
        }
        
        const slotObj: TimeSlot = {
          time: slot.time,
          type: slotType as TimeSlotType,
          startTime: slot.startTime || startTimeStr,
          endTime: slot.endTime || endTimeStr,
          subjectCode: slotData?.subject?.subjectCode || '',
          facultyId: slotData?.faculty?._id || null
        };
        
        return slotObj;
      });
      
      return {
        day,
        slots: timeSlotData
      };
    });

    // Create the template object
    const template: Omit<Template, '_id'> = {
      name: `${formState.year} Year, Semester ${formState.semester}, Division ${formState.division}`,
      description: `Timetable for ${formState.year} Year, Semester ${formState.semester}, Division ${formState.division}`,
      year: formState.year,
      semester: Number(formState.semester),
      division: formState.division,
      classroomId: formState.classroom,
      days,
      status: 'draft',
      classTeacherId: classTeacher?._id || undefined,
      university: ADMIN_ID
    };

    console.log('Saving timetable with class teacher:', classTeacher?._id);

    // Send to backend
    fetch(`${config.API_URL}/api/admin/timetable/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          university: ADMIN_ID,
          template: template
        })
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.message || 'Failed to create timetable');
        });
      }
      return response.json();
    })
    .then(data => {
        if (data.success) {
        showSnackbar('Timetable created successfully', 'success');
        
        // Immediately update all timetables to ensure accurate conflict detection
        fetchAllTimetables().then(() => {
          console.log("Refreshed all timetables after creation");
          
          // Set the created template as selected
          handleTemplateSelect(data.data);
          
          // Add to templates list
          setTemplates(prev => [...prev, data.data]);
          
            // Switch to manage tab
            setActiveTab('manage');
          });
        } else {
        throw new Error(data.message || 'Failed to create timetable');
      }
    })
    .catch(error => {
      console.error('Error creating timetable:', error);
      showSnackbar(`Error: ${error.message}`, 'error');
    })
    .finally(() => {
      setLoading(false);
    });
  };

  // Load initial data
  useEffect(() => {
    console.log("Component mounted, fetching initial data");
    
    // Always fetch classrooms and timetables on mount
    fetchAvailableClassrooms();
    
    // Force fetch timetables directly to ensure they load
    const fetchTimetablesDirectly = async () => {
      try {
        console.log("Direct timetable fetch on mount");
        const currentToken = token || localStorage.getItem('token');
        
        if (!currentToken) {
          console.error('No token available for initial timetables fetch');
          return;
        }
        
        const response = await fetch(`${config.API_URL}/api/admin/timetable/list?university=${ADMIN_ID}`, {
          headers: {
            Authorization: `Bearer ${currentToken}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch initial timetables: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Initial timetables fetch response:', data);
        
        if (data.success && Array.isArray(data.data)) {
          setTemplates(data.data);
          
          // Also update allTimetables for conflict detection
          setAllTimetables(data.data);
          
          console.log(`Initially loaded ${data.data.length} timetables with statuses:`, 
            data.data.map((t: Template) => ({ id: t._id, status: t.status })));
          
          // If we have a selected template, update it with the fresh data
          if (selectedTemplate) {
            const updatedSelectedTemplate = data.data.find((t: Template) => t._id === selectedTemplate._id);
            if (updatedSelectedTemplate) {
              console.log(`Initial update of selected template status from ${selectedTemplate.status} to ${updatedSelectedTemplate.status}`);
              setSelectedTemplate(updatedSelectedTemplate);
            }
          }
        }
      } catch (error) {
        console.error('Error in initial timetables fetch:', error);
      }
    };
    
    fetchTimetablesDirectly();
  }, []);

  // Additional useEffect to log form state changes for debugging
  useEffect(() => {
    console.log("Form state updated:", formState);
  }, [formState]);

  // Update useEffect to fetch subjects and faculty when form changes
  useEffect(() => {
    if (isFormComplete()) {
      fetchSubjects();
      fetchFaculty();
    }
  }, [formState.year, formState.semester]);

  // Sort faculty and subjects alphabetically
  const sortedFaculty = React.useMemo(() => 
    [...faculty].sort((a, b) => a.name.localeCompare(b.name)),
    [faculty]
  );

  const sortedSubjects = React.useMemo(() => 
    [...subjects].sort((a, b) => {
      const aName = a.name || a.subjectCode || '';
      const bName = b.name || b.subjectCode || '';
      return aName.localeCompare(bName);
    }),
    [subjects]
  );

  // Update the onDragEnd function to handle the class-teacher droppable
  const onDragEnd = (result: DropResult): void => {
    const { source, destination, draggableId } = result;

    // If dropped outside a droppable area
    if (!destination) return;

    // Handle the case when a faculty is dropped onto class teacher
    if (destination.droppableId === 'class-teacher' && draggableId.startsWith('faculty-')) {
      const facultyId = draggableId.split('-')[1];
        const facultyMember = faculty.find(f => f._id === facultyId);
      
      if (facultyMember) {
        // First check if this faculty is already assigned as class teacher elsewhere
        const isAlreadyClassTeacher = isFacultyClassTeacherElsewhere(facultyId);
        if (isAlreadyClassTeacher) {
          // Show warning but still allow assignment
          showSnackbar('This faculty is already a class teacher for another class. This may cause conflicts.', 'warning');
        }
        
        setClassTeacher(facultyMember);
        showSnackbar(`${facultyMember.name} assigned as class teacher`, 'success');
      }
      return;
    }

    // Check if a day is selected before allowing drop into timetable slots
    if (destination.droppableId.startsWith('slot-')) {
      if (!activeSlot) {
        showSnackbar('Please select a day first', 'warning');
        return;
      }

      const [_, day, slotIdx] = destination.droppableId.split('-');
      const slotIndex = parseInt(slotIdx);
      
      // If dragging a faculty, check for conflict
      if (draggableId.startsWith('faculty-')) {
        const facultyId = draggableId.replace('faculty-', '');
        const facultyMember = faculty.find(f => f._id === facultyId);
        
        // Verify slot is valid
        if (!timeSlots[slotIndex]) {
          showSnackbar('Invalid time slot', 'error');
          return;
        }
        
        // Get the exact time slot information
        const slotTime = timeSlots[slotIndex].time;
        if (!slotTime) {
          showSnackbar('Invalid time slot information', 'error');
          return;
        }
        
        // Do a thorough check for conflicts at this EXACT time slot
        const hasConflict = isFacultyOccupied(facultyId, day, slotTime);
        if (hasConflict) {
          console.error(`Faculty conflict detected for ${facultyId} on ${day} at ${slotTime}`);
          
          // Show a more detailed error message about the specific time conflict
          showSnackbar(`${facultyMember?.name || 'Faculty'} is already assigned to another class on ${day} at ${slotTime}. They are still available at other times.`, 'error');
          return;
        }
      }
      
      setTimetable(prev => {
        const updated = { ...prev };
        const slot = { ...updated[day][slotIndex] };
        
        if (draggableId.startsWith('subject-')) {
          const subjectId = draggableId.replace('subject-', '');
          const subject = subjects.find(s => s._id === subjectId);
          if (subject) slot.subject = subject;
        } else if (draggableId.startsWith('faculty-')) {
          const facultyId = draggableId.replace('faculty-', '');
          const facultyMember = faculty.find(f => f._id === facultyId);
          if (facultyMember) slot.faculty = facultyMember;
        }
        
        updated[day][slotIndex] = slot;
        return { ...updated };
      });
    }
  };

  // Function to download timetable as PDF instead of CSV
  const downloadTimetable = (timetable: Template) => {
    try {
      // Create a dynamic script tag to load jsPDF
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.async = true;
      
      const autoTableScript = document.createElement('script');
      autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
      autoTableScript.async = true;
      
      script.onload = () => {
        document.body.appendChild(autoTableScript);
      };
      
      autoTableScript.onload = () => {
        // Now that both scripts are loaded, generate PDF
        // @ts-ignore
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Set title
        doc.setFontSize(16);
        doc.text(`${timetable.year} Year, Sem ${timetable.semester}, Div ${timetable.division} Timetable`, 14, 20);
        
        // Add class information
        doc.setFontSize(12);
        doc.text(`Class Teacher: ${timetable.classTeacherId ? faculty.find(f => f._id === timetable.classTeacherId)?.name || 'Not Assigned' : 'Not Assigned'}`, 14, 30);
        doc.text(`Classroom: ${classrooms.find(c => c._id === timetable.classroomId)?.name || 'Not Assigned'}`, 14, 40);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 50);
        
        // Format days and time slots for table
        const headers = ['Day', ...timeSlots.map(slot => slot.time)];
        
        // Prepare data for autotable
        const tableData = timetable.days.map(day => {
          const rowData = [day.day]; // First cell is the day name
          
          // For each time slot, find if there's a matching slot in the timetable data
          timeSlots.forEach(timeSlot => {
            const [startTime, endTime] = timeSlot.time.split(' - ');
            const matchingSlot = day.slots.find(
              s => s.startTime === startTime && s.endTime === endTime
            );
            
            if (timeSlot.type === 'interval') {
              rowData.push('Interval');
            } else if (timeSlot.type === 'lunch') {
              rowData.push('Lunch Break');
            } else if (matchingSlot && matchingSlot.subjectCode) {
              const subjectCode = matchingSlot.subjectCode;
              const facultyName = matchingSlot.facultyId ? 
                faculty.find(f => f._id === matchingSlot.facultyId)?.name || '-' : '-';
              
              rowData.push(`${subjectCode}\n(${facultyName})`);
            } else {
              rowData.push('-');
            }
          });
          
          return rowData;
        });
        
        // Generate the table
        // @ts-ignore
        doc.autoTable({
          head: [headers],
          body: tableData,
          startY: 60,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
          columnStyles: { 0: { fontStyle: 'bold' } }
        });
        
        // Add page number
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setFontSize(10);
          doc.text(`Page ${i} of ${totalPages}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 10);
        }
        
        // Save the PDF with a formatted filename
        doc.save(`timetable-${timetable.year}-sem${timetable.semester}-div${timetable.division}.pdf`);

        // Clean up
        document.body.removeChild(script);
        document.body.removeChild(autoTableScript);
      };
      
      document.body.appendChild(script);
      
      showSnackbar('Generating PDF...', 'info');
    } catch (error) {
      console.error('Error downloading timetable:', error);
      showSnackbar('Failed to download timetable', 'error');
    }
  };

  // Add function to handle edit button click
  const handleEditTemplate = (template: Template): void => {
    // Set form state based on template
    setFormState({
      year: template.year,
      semester: template.semester.toString(),
      division: template.division,
      classroom: template.classroomId,
      errors: {}
    });
    
    // Need to update available semesters based on year
    updateAvailableSemesters(template.year);
    
    // Fetch subjects and faculty for the template's year/semester
    fetchSubjects();
    fetchFaculty();
    
    // Set selected template
    setSelectedTemplate(template);
    
    // Set class teacher if exists
    if (template.classTeacherId) {
      // Need to fetch faculty list first if not already loaded
      if (faculty.length === 0) {
        fetchFaculty().then(() => {
          const teacher = faculty.find(f => f._id === template.classTeacherId);
          if (teacher) {
            setClassTeacher(teacher);
          }
        });
      } else {
        const teacher = faculty.find(f => f._id === template.classTeacherId);
        if (teacher) {
          setClassTeacher(teacher);
        }
      }
    } else {
      // Explicitly reset the class teacher when template has none
      setClassTeacher(null);
    }
    
    // Enable editing mode
    setIsEditing(true);
    
    // Set template as generated to show the timetable editor
    setTemplateGenerated(true);
    
    // Convert template slots to timetable structure
    const newTimetable: Record<string, { subject?: Subject; faculty?: Faculty }[]> = {};
    
    // For each day, map the template's slots to the current timeSlots structure
    DAYS.forEach(day => {
      // For each slot in the current timeSlots, try to find a matching slot in the template by start/end time
      newTimetable[day] = timeSlots.map(ts => {
        const [tsStart, tsEnd] = ts.time.split(' - ');
        const templateDay = template.days.find(d => d.day === day);
        if (!templateDay) return {};
        const slot = templateDay.slots.find(s => s.startTime === tsStart && s.endTime === tsEnd);
        if (!slot) return {};
        // Map subject and faculty
        const subject = subjects.find(s => s.subjectCode === slot.subjectCode || s.code === slot.subjectCode);
        const facultyMember = faculty.find(f => f._id === slot.facultyId);
        return {
          ...(subject ? { subject } : {}),
          ...(facultyMember ? { faculty: facultyMember } : {})
        };
      });
    });
    
    // Set timetable data
    setTimetable(newTimetable);
    
    // Switch to create tab
    setActiveTab('create');
  };

  // Fix the refreshTimetableWithNewConfig function to ensure it returns void
  const refreshTimetableWithNewConfig = (): void => {
    if (!isFormComplete()) {
      showSnackbar('Please complete all required fields before refreshing', 'warning');
      return;
    }
    
    // Fetch updated subjects and faculty for the new configuration
    fetchSubjects();
    fetchFaculty();
    
    // Reset the hasConfigChanged flag
    setHasConfigChanged(false);
    
    showSnackbar('Timetable configuration updated', 'success');
  };

  // Add handleTemplateUnpublish function for unpublishing a timetable
  const handleTemplateUnpublish = async (templateId: string) => {
    if (!templateId) return;
    
    setLoading(true);
    try {
      const currentToken = token || localStorage.getItem('token');
      const adminId = user?._id || ADMIN_ID;
      
      if (!currentToken) {
        showSnackbar('Authentication required to unpublish timetable', 'error');
        setLoading(false);
        return;
      }
      
      console.log(`Unpublishing timetable with ID: ${templateId}`);
      
      // Include university ID in URL to help with authorization
      const response = await fetch(`${config.API_URL}/api/admin/timetable/${templateId}/unpublish?university=${adminId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        // Log response status for debugging
        console.error(`Unpublish failed with status: ${response.status}`);
        const errorText = await response.text();
        console.error(`Error response: ${errorText}`);
        
        let errorMessage = 'Failed to unpublish timetable';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If not valid JSON, use the raw text
          if (errorText) errorMessage = errorText;
        }
        
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      console.log('Unpublish response:', responseData);
      
      // Update templates list with draft status
      setTemplates(prev => 
        prev.map(t => t._id === templateId ? { ...t, status: 'draft' } : t)
      );
      
      // If the selected template is the one being unpublished, update it too
      if (selectedTemplate && selectedTemplate._id === templateId) {
        setSelectedTemplate({
          ...selectedTemplate,
          status: 'draft'
        });
      }
      
      showSnackbar(responseData.message || 'Timetable unpublished successfully', 'success');
    } catch (err: any) {
      console.error('Error unpublishing template:', err);
      showSnackbar(`Failed to unpublish timetable: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Step 3: Faculty Occupancy Conflict Highlighting ---
  // Fetch all timetables for conflict checking
  const [allTimetables, setAllTimetables] = useState<Template[]>([]);

  const fetchAllTimetables = async (): Promise<void> => {
    try {
      const currentToken = token || localStorage.getItem('token');
      const adminId = user?._id || ADMIN_ID;
      if (!currentToken) {
        console.error('No token available for fetching all timetables');
        return;
      }
      
      console.log(`Fetching all timetables for conflict checking from university: ${adminId}`);
      
      const response = await fetch(`${config.API_URL}/api/admin/timetable/list?university=${adminId}`, {
        headers: { 
          Authorization: `Bearer ${currentToken}`
        }
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch all timetables: ${response.status} ${response.statusText}`);
        return;
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        // Make sure we refresh this data completely with a new array
        setAllTimetables([...data.data]);
        console.log(`Loaded ${data.data.length} timetables for conflict checking`);
      } else {
        console.error('Invalid data format when fetching all timetables');
      }
    } catch (e) { 
      console.error("Error fetching all timetables:", e);
    }
  };

  // Add effect to update allTimetables when templates change
  useEffect(() => { 
    fetchAllTimetables(); 
  }, [templates]);

  // Helper: Check if a faculty is occupied in any other timetable at a given day/time
  const isFacultyOccupied = (facultyId: string, day: string, slotTime: string): boolean => {
    // Guard clauses for empty inputs
    if (!facultyId || !day || !slotTime) return false;
    
    // Split the time into start and end parts
    const [startTime, endTime] = slotTime.split(' - ');
    if (!startTime || !endTime) return false;
    
    console.log(`Checking if faculty ${facultyId} is occupied on ${day} at ${slotTime}`);
    
    try {
      // Check across all existing timetables
      if (allTimetables && allTimetables.length > 0) {
        for (const tt of allTimetables) {
          // Skip checking against self if we're editing an existing timetable
          if (selectedTemplate && tt._id === selectedTemplate._id) {
            continue;
          }
          
          // Find the matching day in this timetable
          const matchingDay = tt.days.find(d => d.day === day);
          if (!matchingDay) continue;
          
          // For faculty conflict detection, we only care about EXACT time slot conflicts
          // Faculty can teach in other slots on the same day, but not at the exact same time
          const exactTimeConflict = matchingDay.slots.some(s => 
            s.startTime === startTime && 
            s.endTime === endTime &&
            s.facultyId === facultyId
          );
          
          if (exactTimeConflict) {
            console.log(`CONFLICT: Faculty ${facultyId} is already assigned in timetable ${tt._id} (${tt.year} Year, Div ${tt.division}) on ${day} at ${startTime}-${endTime}`);
            return true;
          }
        }
      }
      
      // Also check current unsaved timetable data
      if (activeSlot?.day === day) {
        const currentDaySlots = timetable[day] || [];
        
        for (let i = 0; i < timeSlots.length; i++) {
          // Skip the active slot we're currently trying to fill
          if (i === activeSlot.slotIndex) continue;
          
          const currentSlot = timeSlots[i];
          const [currentStart, currentEnd] = currentSlot.time.split(' - ');
          
          // Check only for exact time conflict
          if (currentStart === startTime && currentEnd === endTime) {
            const slotData = currentDaySlots[i];
            if (slotData?.faculty && slotData.faculty._id === facultyId) {
              console.log(`CONFLICT: Faculty ${facultyId} already assigned in current unsaved timetable on ${day} at ${slotTime}`);
              return true;
            }
          }
        }
      }
      
      // No conflicts found
      return false;
    } catch (error) {
      console.error("Error checking faculty occupation:", error);
      // If there's an error in checking, default to saying there's a conflict to be safe
      return true;
    }
  };

  // --- Step 4: Class Teacher Uniqueness ---
  // Helper: Check if a faculty is already a class teacher elsewhere
  const isFacultyClassTeacherElsewhere = (facultyId: string): boolean => {
    // Make sure facultyId exists
    if (!facultyId) return false;
    
    for (const tt of allTimetables) {
      // Skip current template if editing
      if (selectedTemplate && tt._id === selectedTemplate._id) continue;
      
      if (tt.classTeacherId === facultyId) {
        return true;
      }
    }
    return false;
  };

  // --- Step 5: Show Weekly Hours for Subjects ---
  // (Assume subject.weeklyHours is available from backend)

  // Add state for configuration dialog
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  // Update the ConfigurationDialog component
  const ConfigurationDialog = () => {
    const [config, setConfig] = useState({
      startTime: '09:00',
      endTime: '17:00',
      intervalStart: '10:30',
      intervalEnd: '10:45',
      lunchStart: '13:00',
      lunchEnd: '13:30',
      slotDuration: 60
    });

    const handleSave = (): void => {
      // Validate times
      const start = new Date(`2000-01-01T${config.startTime}`);
      const end = new Date(`2000-01-01T${config.endTime}`);
      const intervalStart = new Date(`2000-01-01T${config.intervalStart}`);
      const intervalEnd = new Date(`2000-01-01T${config.intervalEnd}`);
      const lunchStart = new Date(`2000-01-01T${config.lunchStart}`);
      const lunchEnd = new Date(`2000-01-01T${config.lunchEnd}`);

      if (start >= end) {
        showSnackbar('End time must be after start time', 'error');
        return;
      }

      if (intervalStart >= intervalEnd) {
        showSnackbar('Interval end time must be after start time', 'error');
        return;
      }

      if (lunchStart >= lunchEnd) {
        showSnackbar('Lunch end time must be after start time', 'error');
        return;
      }

      if (intervalStart <= start || intervalEnd >= end) {
        showSnackbar('Interval must be within working hours', 'error');
        return;
      }

      if (lunchStart <= start || lunchEnd >= end) {
        showSnackbar('Lunch break must be within working hours', 'error');
        return;
      }

      if (intervalEnd >= lunchStart || lunchEnd >= intervalStart) {
        showSnackbar('Interval and lunch break cannot overlap', 'error');
        return;
      }

      // Generate time slots
      const slots: TimeSlot[] = [];
      let currentTime = new Date(`2000-01-01T${config.startTime}`);

      while (currentTime < new Date(`2000-01-01T${config.endTime}`)) {
        const slotStart = new Date(currentTime);
        currentTime.setMinutes(currentTime.getMinutes() + config.slotDuration);
        const slotEnd = new Date(currentTime);

        // Check if current slot overlaps with interval
        if (slotStart < new Date(`2000-01-01T${config.intervalEnd}`) && 
            slotEnd > new Date(`2000-01-01T${config.intervalStart}`)) {
          continue;
        }

        // Check if current slot overlaps with lunch
        if (slotStart < new Date(`2000-01-01T${config.lunchEnd}`) && 
            slotEnd > new Date(`2000-01-01T${config.lunchStart}`)) {
          continue;
        }

        slots.push({
          time: `${slotStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${slotEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`,
          type: '',
          startTime: slotStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          endTime: slotEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
        });
      }

      // Add interval and lunch break slots
      slots.push({
        time: `${config.intervalStart} - ${config.intervalEnd}`,
        type: 'interval',
        startTime: config.intervalStart,
        endTime: config.intervalEnd
      });

      slots.push({
        time: `${config.lunchStart} - ${config.lunchEnd}`,
        type: 'lunch',
        startTime: config.lunchStart,
        endTime: config.lunchEnd
      });

      // Sort slots by start time
      slots.sort((a, b) => {
        const aStart = a.time.split(' - ')[0];
        const bStart = b.time.split(' - ')[0];
        return aStart.localeCompare(bStart);
      });

      setTimeSlots(slots);
      setShowConfigDialog(false);
      showSnackbar('Time slots configured successfully', 'success');
    };

    return (
      <MuiDialog open={showConfigDialog} onClose={() => setShowConfigDialog(false)}>
        <MuiDialogTitle>Configure Time Slots</MuiDialogTitle>
        <MuiDialogContent>
          <Box sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                <TextField
                  label="Start Time"
                  type="time"
                  value={config.startTime}
                  onChange={(e) => setConfig({ ...config, startTime: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                <TextField
                  label="End Time"
                  type="time"
                  value={config.endTime}
                  onChange={(e) => setConfig({ ...config, endTime: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                <TextField
                  label="Interval Start"
                  type="time"
                  value={config.intervalStart}
                  onChange={(e) => setConfig({ ...config, intervalStart: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                <TextField
                  label="Interval End"
                  type="time"
                  value={config.intervalEnd}
                  onChange={(e) => setConfig({ ...config, intervalEnd: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                <TextField
                  label="Lunch Start"
                  type="time"
                  value={config.lunchStart}
                  onChange={(e) => setConfig({ ...config, lunchStart: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                <TextField
                  label="Lunch End"
                  type="time"
                  value={config.lunchEnd}
                  onChange={(e) => setConfig({ ...config, lunchEnd: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
                <TextField
                  label="Slot Duration (minutes)"
                  type="number"
                  value={config.slotDuration}
                  onChange={(e) => setConfig({ ...config, slotDuration: parseInt(e.target.value) })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
            </Box>
          </Box>
        </MuiDialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfigDialog(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="default" color="primary">
            Save Configuration
          </Button>
        </DialogActions>
      </MuiDialog>
    );
  };

  // Add state for analysis dialog
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState<boolean>(false);
  const [currentAnalysisTemplate, setCurrentAnalysisTemplate] = useState<Template | null>(null);

  // Add the resetAll function
  const resetAll = () => {
    // Reset form state
    setFormState({
      year: '',
      semester: '',
      division: '',
      classroom: '',
      errors: {}
    });
    
    // Reset time settings to defaults
    setIntervalFrom('11:00');
    setIntervalTo('11:15');
    setIntervalDuration(15);
    setLunchFrom('13:15');
    setLunchTo('14:15');
    setLunchDuration(60);
    
    // Reset class teacher
    setClassTeacher(null);
    
    // Reset template generated state
    setTemplateGenerated(false);
    
    // Reset timetable grid
    resetTimetableGrid();
    
    // Reset other states
    setActiveSlot(null);
    setIsEditing(false);
    setSelectedTemplate(null);
    
    // Generate default time slots
    setTimeSlots(generateTimeSlots('11:00', '11:15', '13:15', '14:15'));
    
    // Show confirmation message
    showSnackbar('All settings and data have been reset', 'success');
  };

  // Add custom scrollbar styles
  useEffect(() => {
    // Add custom scrollbar styles
    const style = document.createElement('style');
    style.innerHTML = `
      .faculty-scrollbar::-webkit-scrollbar, .subject-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      
      .faculty-scrollbar::-webkit-scrollbar-track, .subject-scrollbar::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 100px;
      }
      
      .faculty-scrollbar::-webkit-scrollbar-thumb, .subject-scrollbar::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 100px;
      }
      
      .faculty-scrollbar::-webkit-scrollbar-thumb:hover, .subject-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }

      .timetable-container {
        overflow: auto;
        max-height: calc(100vh - 200px);
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Main render
  if (isPageLoading) {
    return <LoadingOverlay message="Loading page..." />;
  }

  // Render the manage tab content
  const renderManageTab = () => {
    console.log("Rendering manage tab, templates:", templates);
    
    // Add refresh button at top when no timetables are found
    if (templates.length === 0) {
      return (
        <div className="w-full max-w-6xl mx-auto mt-8 text-center">
          <div className="text-center text-gray-500 py-12 text-lg font-medium">No timetables found.</div>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl shadow-lg text-lg font-bold border-2 border-blue-700 flex items-center gap-2 mx-auto" 
            onClick={() => {
              console.log("Force refreshing timetables...");
              // Use admin ID directly in URL
              fetch(`${config.API_URL}/api/admin/timetable/list?university=${ADMIN_ID}`, {
                headers: {
                  Authorization: `Bearer ${token || localStorage.getItem('token')}`
                }
              })
              .then(res => res.json())
              .then(data => {
                console.log("Refresh response:", data);
                if (data.success && Array.isArray(data.data)) {
                  setTemplates(data.data);
                  console.log(`Loaded ${data.data.length} timetables`);
                  showSnackbar(`Loaded ${data.data.length} timetables`, 'success');
                }
              })
              .catch(err => {
                console.error("Error refreshing timetables:", err);
                showSnackbar("Error refreshing timetables", "error");
              });
            }}
          >
            <RefreshCw className="h-5 w-5" />
            <span>Refresh Timetables</span>
          </Button>
        </div>
      );
    }

    return (
      <div className="w-full max-w-6xl mx-auto mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-blue-700">Your Timetables</h2>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2" 
            onClick={fetchTimetables}
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((t) => (
            <Card 
              key={t._id} 
              className="border-2 border-blue-300 hover:shadow-xl cursor-pointer transition-all rounded-xl overflow-hidden" 
              onClick={() => handleTemplateSelect(t)}
            >
              <CardHeader>
                <CardTitle className="text-lg text-blue-700">{t.year} Year, Div {t.division}</CardTitle>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Semester:</span> {t.semester} | 
                  <span className="font-medium ml-2">Status:</span> <Badge className={t.status === 'published' ? 'bg-green-200 text-green-800' : 'bg-amber-200 text-amber-800'}>{t.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-600">
                    Class Teacher: {
                      t.classTeacherId && faculty.find(f => f._id === t.classTeacherId)?.name || 'Not Assigned'
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-600">
                    Classroom: {
                      classrooms.find(c => c._id === t.classroomId)?.name || 'Not Assigned'
                    }
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedTemplate && (
          <div className="mt-8 bg-white rounded-xl shadow-xl border-2 border-blue-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="text-xl font-bold text-blue-700">
                Timetable for {selectedTemplate.year} Year, Sem {selectedTemplate.semester}, Div {selectedTemplate.division}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm" 
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => fetchTimetables()}
                >
                  <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
                
                <Button
                  size="sm" 
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => handleTemplateDelete(selectedTemplate._id || '')}
                >
                  <Trash className="h-4 w-4" /> Delete
                </Button>
                
                <Button
                  size="sm" 
                  variant="outline"
                  className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                  onClick={() => handleEditTemplate(selectedTemplate)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  <span>Edit</span>
                </Button>
                
                <Button
                  size="sm" 
                  variant="outline"
                  className="flex items-center gap-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
                  onClick={() => analyzeTimetable(selectedTemplate)}
                >
                  <BarChart2 className="h-4 w-4" /> Analyze
                </Button>
                
                <Button
                  size="sm" 
                  variant="outline"
                  className="flex items-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                  onClick={() => downloadTimetable(selectedTemplate)}
                >
                  <Download className="h-4 w-4" /> Download
                </Button>
                
                {selectedTemplate.status === 'draft' ? (
                <Button
                    size="sm" 
                    variant="default"
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    onClick={() => handleTemplatePublish(selectedTemplate._id || '')}
                  >
                    <Eye className="h-4 w-4" /> Publish
                </Button>
                ) : (
                  <Button
                    size="sm" 
                    variant="default"
                    className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700"
                    onClick={() => handleTemplateUnpublish(selectedTemplate._id || '')}
                  >
                    <EyeOff className="h-4 w-4" /> Unpublish
                </Button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border-b-2 border-blue-200 p-3 text-left">Day</th>
                    {timeSlots.map(slot => (
                      <th key={slot.time} className="border-b-2 border-blue-200 p-3 text-center">{slot.time}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedTemplate.days.map(day => (
                    <tr key={day.day}>
                      <td className="border-b border-blue-100 p-3 font-semibold text-blue-700">{day.day}</td>
                      {timeSlots.map((timeSlot, idx) => {
                        // For each time slot in our UI, find if there's a matching slot in the timetable data
                        const [startTime, endTime] = timeSlot.time.split(' - ');
                        const matchingSlot = day.slots.find(
                          s => s.startTime === startTime && s.endTime === endTime
                        );
                        
                        if (timeSlot.type === 'interval') {
                          return (
                            <td key={idx} className="border-b border-blue-100 p-3 text-center bg-pink-50 text-pink-700 font-medium">
                              Interval
                            </td>
                          );
                        }
                        
                        if (timeSlot.type === 'lunch') {
                          return (
                            <td key={idx} className="border-b border-blue-100 p-3 text-center bg-gray-50 text-gray-700 font-medium">
                              Lunch Break
                            </td>
                          );
                        }
                        
                        return (
                          <td key={idx} className="border-b border-blue-100 p-3 text-center">
                            {matchingSlot && matchingSlot.subjectCode ? (
                          <div>
                                <div className="font-medium text-blue-600">{matchingSlot.subjectCode}</div>
                                {matchingSlot.facultyId && (
                                  <div className="text-xs text-gray-500">
                                    {faculty.find(f => f._id === matchingSlot.facultyId)?.name || '-'}
                          </div>
                                )}
                        </div>
                            ) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
                </div>
        </div>
        )}
      </div>
    );
  };

  // Also add a function to check if classroom is already in use
  const isClassroomOccupied = (classroomId: string): boolean => {
    // Don't check if no classroom is selected or if we're editing
    if (!classroomId) return false;
    
    // If we're editing, only check templates that aren't the current one
    for (const tt of allTimetables) {
      // Skip current template if editing
      if (selectedTemplate && tt._id === selectedTemplate._id) continue;
      
      if (tt.classroomId === classroomId) {
        return true;
      }
    }
    return false;
  };

  // Helper to get the class that's using a specific classroom
  const getClassUsingClassroom = (classroomId: string): string => {
    for (const tt of allTimetables) {
      // Skip current template if editing
      if (selectedTemplate && tt._id === selectedTemplate._id) continue;
      
      if (tt.classroomId === classroomId) {
        return `${tt.year} Year, Sem ${tt.semester}, Div ${tt.division}`;
      }
    }
    return '';
  };

  // Add the Analyze Timetable function
  const analyzeTimetable = (timetable: Template) => {
    setCurrentAnalysisTemplate(timetable);
    setAnalysisDialogOpen(true);
  };

  // Timetable Analysis Dialog
  const TimetableAnalysisDialog = () => {
    if (!currentAnalysisTemplate) return null;
    
    // Calculate subject durations
    const subjectDurations: Record<string, number> = {};
    const facultyWorkload: Record<string, { hours: number, subjects: Set<string> }> = {};
    
    // Process each day
    currentAnalysisTemplate.days.forEach(day => {
      day.slots.forEach(slot => {
        if (!slot.subjectCode || slot.type === 'interval' || slot.type === 'lunch') return;
        
        // Calculate time difference in minutes
        const calculateMinutes = (start: string, end: string) => {
          const [startHour, startMinute] = start.split(':').map(Number);
          const [endHour, endMinute] = end.split(':').map(Number);
          return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
        };
        
        const minutes = calculateMinutes(slot.startTime || '00:00', slot.endTime || '00:00');
        const hours = minutes / 60;
        
        // Add to subject durations
        subjectDurations[slot.subjectCode] = (subjectDurations[slot.subjectCode] || 0) + hours;
        
        // Add to faculty workload
        if (slot.facultyId) {
          if (!facultyWorkload[slot.facultyId]) {
            facultyWorkload[slot.facultyId] = {
              hours: 0,
              subjects: new Set()
            };
          }
          facultyWorkload[slot.facultyId].hours += hours;
          facultyWorkload[slot.facultyId].subjects.add(slot.subjectCode);
        }
      });
    });
    
    const handleDownloadPdf = () => {
      const element = document.querySelector('.timetable-analysis-content');
      if (element instanceof HTMLElement) {
        html2pdf()
          .from(element)
          .save(`timetable_analysis_${currentAnalysisTemplate.year}_${currentAnalysisTemplate.semester}_${currentAnalysisTemplate.division}.pdf`);
      }
    };
    
    return (
      <MuiDialog 
        open={analysisDialogOpen} 
        onClose={() => setAnalysisDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <MuiDialogTitle>
          Timetable Analysis
          <div className="text-sm text-gray-600">
            {currentAnalysisTemplate.year} Year, Semester {currentAnalysisTemplate.semester}, Division {currentAnalysisTemplate.division}
          </div>
        </MuiDialogTitle>
        <MuiDialogContent className="timetable-analysis-content">
          <div className="mt-4 space-y-6">
            {/* Class Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Class Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Class Teacher:</span>
                    <span className="font-medium">
                      {currentAnalysisTemplate.classTeacherId ? 
                        faculty.find(f => f._id === currentAnalysisTemplate.classTeacherId)?.name || 'Not Assigned' 
                        : 'Not Assigned'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Classroom:</span>
                    <span className="font-medium">
                      {classrooms.find(c => c._id === currentAnalysisTemplate.classroomId)?.name || 'Not Assigned'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`px-2 py-1 rounded text-xs ${currentAnalysisTemplate.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {currentAnalysisTemplate.status}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="border bg-purple-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Time Distribution</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Class Hours:</span>
                    <span className="font-medium">
                      {Object.values(subjectDurations).reduce((a, b) => a + b, 0)} hours
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>School Days:</span>
                    <span className="font-medium">{currentAnalysisTemplate.days.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Daily Time Slots:</span>
                    <span className="font-medium">
                      {Math.max(...currentAnalysisTemplate.days.map(d => 
                        d.slots.filter(s => s.type !== 'interval' && s.type !== 'lunch').length
                      ))} per day
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Subject Analysis */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Subject Analysis</h3>
              <div className="overflow-hidden rounded-md border">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocated Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(subjectDurations).map(([code, hours]) => {
                      const subject = subjects.find(s => s.subjectCode === code);
                      const weeklyHours = subject?.weeklyHours || 0;
                      const isOverallocated = weeklyHours > 0 && hours > weeklyHours;
                      
                      return (
                        <tr key={code}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{code}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{weeklyHours}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{hours}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {weeklyHours > 0 && (
                              <span className={`px-2 py-1 rounded-sm text-xs ${isOverallocated ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                {isOverallocated ? 'overallocated' : 'ok'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Faculty Workload Analysis */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Faculty Workload Analysis</h3>
              <div className="overflow-hidden rounded-md border">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Hours</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subjects</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Teacher</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(facultyWorkload).map(([facultyId, data]) => {
                      const facultyMember = faculty.find(f => f._id === facultyId);
                      const isClassTeacher = currentAnalysisTemplate.classTeacherId === facultyId;
                      
                      return (
                        <tr key={facultyId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {facultyMember?.name || 'Unknown Faculty'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.hours}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {Array.from(data.subjects).join(', ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {isClassTeacher ? 'Yes' : 'No'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between mt-4">
            <Button 
              variant="outline" 
              onClick={() => setAnalysisDialogOpen(false)}
            >
              Close
            </Button>
            <Button 
              variant="default"
              onClick={handleDownloadPdf}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </MuiDialogContent>
        <DialogActions>
          <Button 
            variant="outline" 
            onClick={() => setAnalysisDialogOpen(false)}
          >
            Close
          </Button>
          <Button 
            variant="default"
            onClick={handleDownloadPdf}
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </DialogActions>
      </MuiDialog>
    );
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <div className="flex flex-1 px-8 py-8 gap-8 bg-gradient-to-br from-blue-50 to-white justify-center items-start">
        <div className="w-full max-w-7xl bg-white rounded-2xl shadow-2xl p-8 border flex flex-col gap-8">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'create' | 'manage')}>
            <TabsList className="mb-6 border-2 border-blue-200 p-1 rounded-xl">
              <TabsTrigger 
                value="create" 
                className={cn(
                  "px-8 py-3 font-semibold text-base",
                  activeTab === 'create' ? "bg-blue-600 text-white" : ""
                )}
              >
                Create
              </TabsTrigger>
              <TabsTrigger 
                value="manage" 
                className={cn(
                  "px-8 py-3 font-semibold text-base",
                  activeTab === 'manage' ? "bg-blue-600 text-white" : ""
                )}
              >
                Manage
              </TabsTrigger>
            </TabsList>
            <TabsContent value="create">
              {/* Top Controls */}
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex gap-4">
                    <FormSelect label="Year" value={formState.year} onChange={value => { handleFormChange('year', value); updateAvailableSemesters(value); }} options={YEARS.map(year => ({ value: year, label: year }))} className="min-w-[120px]" />
                    <FormSelect label="Semester" value={formState.semester} onChange={value => handleFormChange('semester', value)} options={availableSemesters.map(sem => ({ value: sem.toString(), label: `Sem ${sem}` }))} className="min-w-[120px]" disabled={!formState.year} />
                    <FormSelect label="Division" value={formState.division} onChange={value => handleFormChange('division', value)} options={['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].map(div => ({ value: div, label: div }))} className="min-w-[120px]" disabled={!formState.semester} />
                    <div className="flex gap-4 items-center">
                      <FormSelect 
                        label="Classroom" 
                        value={formState.classroom} 
                        onChange={value => handleFormChange('classroom', value)} 
                        options={classrooms.map(classroom => {
                          const isOccupied = isClassroomOccupied(classroom._id);
                          const classInfo = isOccupied ? getClassUsingClassroom(classroom._id) : '';
                          return { 
                            value: classroom._id, 
                            label: isOccupied 
                              ? `${classroom.name} (Used by ${classInfo})`
                              : classroom.name,
                            disabled: isOccupied 
                          };
                        })} 
                        className="min-w-[200px]" 
                        disabled={!formState.division} 
                      />
                      <Button size="icon" variant="outline" className="ml-1 border-blue-300 text-blue-700 hover:bg-blue-50" onClick={fetchAvailableClassrooms} title="Refresh Classrooms">
                        <RefreshCw size={18} />
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50"
                    onClick={resetAll}
                  >
                    <RefreshCw size={16} />
                    Reset All
                  </Button>
                </div>
                
                {/* Time Controls */}
                <div className="flex flex-col gap-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <div className="grid grid-cols-2 gap-8">
                    {/* Interval Time Controls */}
                    <div className="flex flex-col gap-2">
                      <h3 className="font-semibold text-blue-800">Interval Time</h3>
                      <div className="flex flex-row gap-4 items-center">
                        <TextField
                          label="Duration (min)"
                          type="number"
                          value={intervalDuration}
                          onChange={e => handleIntervalDurationChange(Number(e.target.value))}
                          inputProps={{ min: 1, max: 120, step: 1 }}
                          className="w-32"
                        />
                        <TextField
                          label="Time"
                          type="time" 
                          value={intervalFrom} 
                          onChange={e => handleIntervalTimeChange(e.target.value)}
                          className="w-32"
                        />
                      </div>
                      <p className="text-sm text-blue-600">
                        Interval: {intervalFrom} - {intervalTo}
                      </p>
                    </div>
                    {/* Lunch Break Controls */}
                    <div className="flex flex-col gap-2">
                      <h3 className="font-semibold text-blue-800">Lunch Break Time</h3>
                      <div className="flex flex-row gap-4 items-center">
                        <TextField
                          label="Duration (min)"
                          type="number"
                          value={lunchDuration}
                          onChange={e => handleLunchDurationChange(Number(e.target.value))}
                          inputProps={{ min: 1, max: 180, step: 1 }}
                          className="w-32"
                        />
                        <TextField
                          label="Time"
                          type="time" 
                          value={lunchFrom} 
                          onChange={e => handleLunchTimeChange(e.target.value)}
                          className="w-32"
                        />
                      </div>
                      <p className="text-sm text-blue-600">
                        Lunch: {lunchFrom} - {lunchTo}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Selected Data Summary */}
                {formState.year && formState.semester && formState.division && formState.classroom && intervalFrom && intervalTo && (
                  <div className="text-blue-800 font-medium bg-blue-50 border-2 border-blue-200 rounded-lg px-6 py-3 mt-2 flex justify-between items-center">
                    <div>
                    {`${formState.year} Year, Sem ${formState.semester}, Div ${formState.division}, Room ${classrooms.find(c => c._id === formState.classroom)?.name || ''}, Interval: ${intervalFrom} - ${intervalTo}`}
                    </div>
                    {hasConfigChanged && templateGenerated && (
                      <Button
                        size="icon"
                        variant="outline"
                        className="ml-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                        title="Reload timetable slots with new configuration"
                        onClick={() => {
                          setTimetable(prev => {
                            const updated: Record<string, { subject?: Subject; faculty?: Faculty }[]> = {};
                            DAYS.forEach(day => {
                              updated[day] = timeSlots.map(ts => {
                                // Try to find a matching old slot by time
                                const oldSlotIdx = prev[day]?.findIndex((_, idx) => {
                                  const oldTime = prev[day][idx]?.subject || prev[day][idx]?.faculty ? timeSlots[idx]?.time : undefined;
                                  return oldTime === ts.time;
                                });
                                if (oldSlotIdx !== undefined && oldSlotIdx >= 0 && prev[day][oldSlotIdx]) {
                                  return prev[day][oldSlotIdx];
                                }
                                return {};
                              });
                            });
                            return updated;
                          });
                          setHasConfigChanged(false);
                          showSnackbar('Timetable slots reloaded. Data preserved where possible.', 'info');
                        }}
                      >
                        <RefreshCw size={18} />
                      </Button>
                    )}
                  </div>
                )}
                {/* Only show Create Template button when all fields are filled */}
                {formState.year && formState.semester && formState.division && formState.classroom && intervalFrom && intervalTo && !templateGenerated && (
                  <div className="flex justify-end">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-base font-semibold rounded-xl border-2 border-blue-700" 
                      onClick={() => {
                        // Check for duplicate timetable FIRST before creating the template
                        const exists = checkTimetableExists();
                        if (exists) {
                          // Show duplicate dialog and prevent proceeding
                          setDuplicateTimetableDialogOpen(true);
                          return;
                        }
                        
                        // If no duplicate, proceed with template creation
                        setTemplateGenerated(true);
                      }}
                    >
                      Create Template
                    </Button>
                  </div>
                )}
              </div>
              {/* Timetable Area */}
              {templateGenerated && (
                <DragDropContext onDragEnd={onDragEnd}>
                  <div className="flex flex-row gap-5 min-h-[60vh]">
                    {/* Days Sidebar with Class Teacher on top */}
                    <div className="flex flex-col gap-4 items-center w-52">
                      {/* Class Teacher Droppable */}
                      <div className="mb-2 w-full">
                        <div className="text-center font-medium text-blue-700 mb-2">Class Teacher</div>
                        <Droppable droppableId="class-teacher">
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={cn(
                                'w-full h-16 border rounded-lg transition-all flex items-center justify-center',
                                snapshot.isDraggingOver ? 'border-blue-400 bg-blue-50 shadow-md' : 
                                  classTeacher ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50',
                                classTeacher ? 'p-2' : 'p-1'
                              )}
                            >
                              {classTeacher ? (
                                <div className="text-sm font-medium text-blue-700 text-center">
                                  {classTeacher.name}
                                  {isFacultyClassTeacherElsewhere(classTeacher._id) && (
                                    <div className="text-xs text-red-500 mt-1">Already class teacher elsewhere!</div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
                                  <User size={14} className="text-gray-400" />
                                  <span>Drop faculty here</span>
                                </div>
                              )}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                      {/* Days Buttons */}
                      <div className="w-full">
                        <div className="text-center font-medium text-blue-700 mb-2">Days</div>
                        <div className="space-y-2">
                      {DAYS.map(day => (
                        <Button
                          key={day}
                          variant={activeSlot?.day === day ? 'default' : 'outline'}
                          className={cn(
                                'w-full py-2 rounded-lg font-medium text-sm border',
                                activeSlot?.day === day 
                                  ? 'bg-pink-100 text-pink-800 border-pink-200 shadow-sm' 
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-pink-50 hover:text-pink-700 hover:border-pink-200'
                          )}
                          onClick={() => setActiveSlot({ day, slotIndex: 0 })}
                        >
                          {day}
                        </Button>
                      ))}
                        </div>
                      </div>
                    </div>
                    {/* Timetable Grid */}
                    <div className="flex-1 flex flex-col gap-3 min-w-[350px]">
                      <div className="w-full bg-white rounded-lg shadow-sm p-4 border border-gray-200 flex items-center justify-between">
                        <div className="text-lg font-medium text-blue-700 flex items-center gap-2">
                          {activeSlot?.day ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-green-500"></span>
                              {activeSlot.day}
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                              <span className="text-gray-400">Select a day</span>
                            </>
                          )}
                      </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200"
                            title="Reload timetable slots with new configuration"
                            onClick={() => {
                              // Remap timetable data to new timeSlots structure
                              setTimetable(prev => {
                                const updated: Record<string, { subject?: Subject; faculty?: Faculty }[]> = {};
                                DAYS.forEach(day => {
                                  updated[day] = timeSlots.map(ts => {
                                    // Try to find a matching old slot by time
                                    const oldSlotIdx = prev[day]?.findIndex((_, idx) => {
                                      const oldTime = prev[day][idx]?.subject || prev[day][idx]?.faculty ? timeSlots[idx]?.time : undefined;
                                      return oldTime === ts.time;
                                    });
                                    if (oldSlotIdx !== undefined && oldSlotIdx >= 0 && prev[day][oldSlotIdx]) {
                                      return prev[day][oldSlotIdx];
                                    }
                                    return {};
                                  });
                                });
                                return updated;
                              });
                              showSnackbar('Timetable slots reloaded. Data preserved where possible.', 'info');
                            }}
                          >
                            <RefreshCw size={14} />
                            <span className="ml-1">Refresh</span>
                          </Button>
                        </div>
                      </div>
                      <div className="w-full bg-white rounded-lg shadow-sm p-4 border border-gray-200 flex-1">
                        <Droppable droppableId={`day-${activeSlot?.day || 'none'}`} isDropDisabled>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col gap-2.5">
                              {timeSlots.map((slot, idx) => {
                                // Apply different styling based on slot type
                                if (slot.type === 'interval') {
                                  return (
                                    <div key={`${slot.time}-${idx}`} className="flex flex-row w-full bg-amber-50 border border-amber-200 rounded-lg py-3 px-4">
                                      <div className="flex items-center gap-2 text-amber-700 font-medium text-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                        <div>Interval time ({intervalFrom} to {intervalTo})</div>
                                      </div>
                                    </div>
                                  );
                                }
                                
                                if (slot.type === 'lunch') {
                                  return (
                                    <div key={`${slot.time}-${idx}`} className="flex flex-row w-full bg-teal-50 border border-teal-200 rounded-lg py-3 px-4">
                                      <div className="flex items-center gap-2 text-teal-700 font-medium text-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
                                        <div>Lunch break ({lunchFrom} to {lunchTo})</div>
                                      </div>
                                    </div>
                                  );
                                }
                                
                                // Regular class slot
                                const slotData = activeSlot?.day ? timetable[activeSlot.day][idx] : {};
                                return (
                                  <Droppable droppableId={`slot-${activeSlot?.day}-${idx}`} key={`${slot.time}-${idx}`} direction="horizontal">
                                    {(slotProvided, slotSnapshot) => {
                                      // Check if there's a potential conflict when dragging faculty over this slot
                                      let potentialConflict = false;
                                      if (slotSnapshot.isDraggingOver && slotSnapshot.draggingOverWith?.startsWith('faculty-')) {
                                        const facultyId = slotSnapshot.draggingOverWith.replace('faculty-', '');
                                        if (activeSlot?.day && slot.time) {
                                          potentialConflict = isFacultyOccupied(facultyId, activeSlot.day, slot.time);
                                        }
                                      }
                                      
                                      return (
                                      <div
                                        ref={slotProvided.innerRef}
                                        {...slotProvided.droppableProps}
                                        className={cn(
                                            'flex flex-row items-center py-3 px-4 rounded-xl transition-all duration-200 border-2 relative',
                                            potentialConflict ? 'border-red-300 bg-red-50/50' : 
                                              slotSnapshot.isDraggingOver ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white border-gray-100 hover:border-blue-200',
                                          'min-h-[65px]'
                                        )}
                                      >
                                          <span className="text-gray-700 font-medium w-32 text-base">{slot.time}</span>
                                        <div className="flex gap-2 flex-1 justify-end items-center">
                                            {potentialConflict && slotSnapshot.isDraggingOver && (
                                              <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-200 shadow-sm flex items-center gap-1.5">
                                                  <AlertCircle size={14} />
                                                  <span>Faculty already occupied</span>
                                                </div>
                                              </div>
                                            )}
                                          {slotData.subject && (
                                              <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg shadow-sm text-sm font-medium border border-blue-200 flex items-center gap-1 transition-all hover:shadow-md">
                                              {slotData.subject.name || slotData.subject.subjectCode || 'Unnamed Subject'}
                                                <button 
                                                  className="ml-1 text-red-500 hover:bg-red-50 p-1 rounded-full transition-colors"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (activeSlot?.day) {
                                                      setTimetable(prev => {
                                                        const updated = { ...prev };
                                                        const updatedSlot = { ...updated[activeSlot.day][idx] };
                                                        delete updatedSlot.subject;
                                                        updated[activeSlot.day][idx] = updatedSlot;
                                                        return updated;
                                                      });
                                                    }
                                                  }}
                                                >
                                                  <X size={12} />
                                                </button>
                                            </div>
                                          )}
                                          {slotData.faculty && (
                                              <div className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg shadow-sm text-sm font-medium border border-indigo-200 flex items-center gap-1 transition-all hover:shadow-md">
                                              {slotData.faculty.name}
                                                <button 
                                                  className="ml-1 text-red-500 hover:bg-red-50 p-1 rounded-full transition-colors"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (activeSlot?.day) {
                                                      setTimetable(prev => {
                                                        const updated = { ...prev };
                                                        const updatedSlot = { ...updated[activeSlot.day][idx] };
                                                        delete updatedSlot.faculty;
                                                        updated[activeSlot.day][idx] = updatedSlot;
                                                        return updated;
                                                      });
                                                    }
                                                  }}
                                                >
                                                  <X size={12} />
                                                </button>
                                            </div>
                                          )}
                                            {!slotData.subject && !slotData.faculty && !potentialConflict && (
                                              <span className="text-gray-300 text-xs italic">Empty slot</span>
                                          )}
                                        </div>
                                        {slotProvided.placeholder}
                                      </div>
                                      )
                                    }}
                                  </Droppable>
                                );
                              })}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    </div>
                    {/* Faculty and Subjects side-by-side */}
                    <div className="flex flex-col gap-4 w-1/4">
                      {/* Faculty Panel */}
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-1 flex flex-col min-w-[200px]">
                        <div className="font-medium text-blue-700 text-base mb-3 flex items-center justify-between">
                          <span>Faculty</span>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={handleRefreshFaculty} disabled={isLoadingFaculty} title="Refresh Faculty">
                            <RefreshCw size={16} className={isLoadingFaculty ? "animate-spin" : ""} />
                          </Button>
                        </div>
                        <Droppable droppableId="faculty-list" isDropDisabled>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 overflow-y-auto max-h-[400px] space-y-2 pr-1 faculty-scrollbar">
                              {sortedFaculty.length > 0 ? sortedFaculty.map((f, idx) => {
                                // Remove the conflict check here - we'll only check on drop
                                // Faculty should never be grayed out in the list
                                return (
                                <Draggable draggableId={`faculty-${f._id}`} index={idx} key={f._id}>
                                  {(dragProvided, dragSnapshot) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      {...dragProvided.dragHandleProps}
                                      className={cn(
                                          'p-2.5 border rounded-lg font-medium shadow-sm transition-all text-sm',
                                          'bg-white text-indigo-900 cursor-grab border-gray-200 hover:bg-indigo-50 hover:border-indigo-200',
                                          dragSnapshot.isDragging ? 'bg-indigo-100 shadow-md border-indigo-300 scale-[1.02]' : ''
                                      )}
                                        title={f.name}
                                    >
                                        <div className="flex items-center gap-2">
                                          <User size={14} className="text-indigo-400" />
                                          <span>{f.name}</span>
                                        </div>
                                    </div>
                                  )}
                                </Draggable>
                                );
                              }) : (
                                <div className="text-gray-400 text-center py-4 text-sm flex flex-col items-center">
                                  <User size={24} className="text-gray-300 mb-2" />
                                  <span>No faculty available</span>
                                </div>
                              )}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                      {/* Subjects Panel */}
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-1 flex flex-col min-w-[200px]">
                        <div className="font-medium text-blue-700 text-base mb-3 flex items-center justify-between">
                          <span>Subjects</span>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={handleRefreshSubjects} disabled={isLoadingSubjects} title="Refresh Subjects">
                            <RefreshCw size={16} className={isLoadingSubjects ? "animate-spin" : ""} />
                          </Button>
                        </div>
                        <Droppable droppableId="subjects-list" isDropDisabled>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 overflow-y-auto max-h-[400px] space-y-2 pr-1 subject-scrollbar">
                              {sortedSubjects.length > 0 ? sortedSubjects.map((s, idx) => (
                                <Draggable draggableId={`subject-${s._id}`} index={idx} key={s._id}>
                                  {(dragProvided, dragSnapshot) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      {...dragProvided.dragHandleProps}
                                      className={cn(
                                        'p-2.5 border rounded-lg font-medium shadow-sm transition-all text-sm',
                                        'bg-white text-blue-900 cursor-grab border-gray-200 hover:bg-blue-50 hover:border-blue-200',
                                        dragSnapshot.isDragging ? 'bg-blue-100 shadow-md border-blue-300 scale-[1.02]' : ''
                                      )}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <BookOpen size={14} className="text-blue-400" />
                                          <span>{s.name || s.subjectCode || 'Unnamed Subject'}</span>
                                        </div>
                                        {s.weeklyHours !== undefined && (
                                          <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">{s.weeklyHours} hrs</span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              )) : (
                                <div className="text-gray-400 text-center py-4 text-sm flex flex-col items-center">
                                  <BookOpen size={24} className="text-gray-300 mb-2" />
                                  <span>No subjects available</span>
                                </div>
                              )}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    </div>
                  </div>
                  {/* Save Timetable Button */}
                  <div className="flex justify-end mt-6">
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow text-base font-medium border border-blue-700 flex items-center gap-2 transition-all hover:shadow-md" 
                      onClick={handleSaveTimetable}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Save Timetable</span>
                        </>
                      )}
                    </Button>
                  </div>
                </DragDropContext>
              )}
            </TabsContent>
            <TabsContent value="manage">
              {renderManageTab()}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsDeleteDialogOpen(false)}></div>
          <div className="relative z-50 bg-white p-6 rounded-lg shadow-xl border-2 border-gray-200 max-w-md w-full mx-4">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-red-600">Confirm Delete</h2>
            </div>
            <div className="mb-6">
              <p className="text-gray-700">Are you sure you want to delete this timetable? This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteTemplate} 
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Timetable Dialog */}
      <MuiDialog open={duplicateTimetableDialogOpen} onClose={() => setDuplicateTimetableDialogOpen(false)}>
        <MuiDialogTitle>Timetable Already Exists</MuiDialogTitle>
        <MuiDialogContent>
          <p className="mb-4">
            A timetable with the same year, semester, and division already exists. What would you like to do?
          </p>
          <div className="flex justify-end gap-4 mt-4">
            <Button variant="outline" onClick={() => {
              setDuplicateTimetableDialogOpen(false);
              resetTimetableGrid();
              handleFormChange('year', '');
              handleFormChange('semester', '');
              handleFormChange('division', '');
              handleFormChange('classroom', '');
            }}>
              Reset Form
            </Button>
            <Button onClick={() => {
              setDuplicateTimetableDialogOpen(false);
              setActiveTab('manage');
              if (existingTimetableId) {
                const existingTemplate = allTimetables.find(t => t._id === existingTimetableId);
                if (existingTemplate) {
                  handleTemplateSelect(existingTemplate);
                }
              }
            }}>
              View Existing Timetable
            </Button>
          </div>
        </MuiDialogContent>
      </MuiDialog>

      {/* Add the analysis dialog */}
      {TimetableAnalysisDialog()}
    </div>
  );
};

export default function TimetablePageWithSidebar() {
  return <DashboardWrapper><TimetablePage /></DashboardWrapper>;
}
