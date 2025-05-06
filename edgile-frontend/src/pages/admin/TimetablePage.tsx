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
import { Tabs, TabsContent, TabsList, TabsTrigger, Alert, AlertTitle, AlertDescription } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import TimetableTemplates from "@/components/admin/TimetableTemplates";
import { Template as TimetableTemplate, TimeSlot as TimetableTimeSlot, Day as TimetableDay, Subject as TimetableSubject } from '@/components/admin/TimetableTemplates';
import { AlertCircle, PlusCircle, RefreshCw, User, BookOpen, Save, Trash, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import TimetableEditor from '@/components/admin/TimetableEditor';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  subjectCode: string;
  facultyId: string | null;
  time?: string;
}

interface Day {
  day: string;
  slots: TimeSlot[];
}

interface Template {
  _id?: string;
  name?: string;
  description?: string;
  days: Day[];
  year: string;
  semester: number;
  division: string;
  classroomId: string;
  academicYear?: string;
  createdAt?: string;
  status?: 'draft' | 'published';
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
): {time: string, type: string}[] => {
  // Start with base morning slots
  const slots = [
    {time: '09:00 - 10:00', type: 'regular'},
    {time: '10:00 - 11:00', type: 'regular'},
  ];
  
  // Calculate next class time after interval
  const nextClassStart = intervalTo;
  const nextClassStartMins = parseTimeToMinutes(intervalTo);
  const nextClassEndMins = nextClassStartMins + 60;
  const nextClassEnd = formatMinutesToTime(nextClassEndMins);
  
  // Add interval slot
  slots.push({
    time: `${intervalFrom} - ${intervalTo}`,
    type: 'interval'
  });
  
  // Add slot after interval
  slots.push({
    time: `${intervalTo} - ${nextClassEnd}`,
    type: 'regular'
  });
  
  // Add lunch slot
  slots.push({
    time: `${lunchFrom} - ${lunchTo}`,
    type: 'lunch'
  });
  
  // Calculate afternoon slots
  const lunchEndMins = parseTimeToMinutes(lunchTo);
  let currentTime = lunchEndMins;
  
  // Add afternoon slots
  for (let i = 0; i < 3; i++) {
    const startTime = formatMinutesToTime(currentTime);
    const endTime = formatMinutesToTime(currentTime + 60);
    
    if (parseTimeToMinutes(endTime) <= 17 * 60) { // Only add slots before 5 PM
      slots.push({
        time: `${startTime} - ${endTime}`,
        type: 'regular'
      });
    }
    currentTime += 60;
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
  
  // Update interval and lunch state with validation
  const [intervalFrom, setIntervalFrom] = useState('11:00');
  const [intervalTo, setIntervalTo] = useState('11:15');
  const [lunchFrom, setLunchFrom] = useState('12:15');
  const [lunchTo, setLunchTo] = useState('13:15');
  
  // Track if lunch time has been manually set by user
  const [lunchManuallySet, setLunchManuallySet] = useState(false);
  
  // Add handlers for interval and lunch time changes
  const handleIntervalTimeChange = (type: 'from' | 'to', value: string) => {
    if (type === 'from') {
      setIntervalFrom(value);
      
      // Only auto-adjust lunch if user hasn't manually changed it
      if (!lunchManuallySet) {
        const newLunchTimes = calculateLunchTime(value, intervalTo);
        setLunchFrom(newLunchTimes.lunchFrom);
        setLunchTo(newLunchTimes.lunchTo);
      }
    } else {
      setIntervalTo(value);
      
      // Only auto-adjust lunch if user hasn't manually changed it
      if (!lunchManuallySet) {
        const newLunchTimes = calculateLunchTime(intervalFrom, value);
        setLunchFrom(newLunchTimes.lunchFrom);
        setLunchTo(newLunchTimes.lunchTo);
      }
    }
    
    // Recalculate time slots
    const newTimeSlots = generateTimeSlots(
      type === 'from' ? value : intervalFrom,
      type === 'to' ? value : intervalTo,
      lunchFrom,
      lunchTo
    );
    setTimeSlots(newTimeSlots);
    
    // Update timetable structure
    setTimetable(prev => {
      const updated: Record<string, { subject?: Subject; faculty?: Faculty }[]> = {};
      DAYS.forEach(day => {
        // Preserve existing assignments as much as possible
        updated[day] = newTimeSlots.map((_, idx) => prev[day][idx] || {});
      });
      return updated;
    });
  };
  
  // Handle lunch time change
  const handleLunchTimeChange = (type: 'from' | 'to', value: string) => {
    setLunchManuallySet(true);
    if (type === 'from') {
      setLunchFrom(value);
    } else {
      setLunchTo(value);
    }
    
    // Recalculate time slots
    const newTimeSlots = generateTimeSlots(
      intervalFrom,
      intervalTo,
      type === 'from' ? value : lunchFrom,
      type === 'to' ? value : lunchTo
    );
    setTimeSlots(newTimeSlots);
    
    // Update timetable structure
    setTimetable(prev => {
      const updated: Record<string, { subject?: Subject; faculty?: Faculty }[]> = {};
      DAYS.forEach(day => {
        // Preserve existing assignments as much as possible
        updated[day] = newTimeSlots.map((_, idx) => prev[day][idx] || {});
      });
      return updated;
    });
  };
  
  // Update lunch times when interval changes (only on initial render)
  useEffect(() => {
    if (!lunchManuallySet) {
      const newLunchTimes = calculateLunchTime(intervalFrom, intervalTo);
      setLunchFrom(newLunchTimes.lunchFrom);
      setLunchTo(newLunchTimes.lunchTo);
    }
  }, []);
  
  // Generate dynamic time slots based on interval and lunch settings
  const [timeSlots, setTimeSlots] = useState(generateTimeSlots(intervalFrom, intervalTo, lunchFrom, lunchTo));
  
  // Add state for timetable slots
  const [timetable, setTimetable] = useState(() => {
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
        setTemplates(data.data);
        console.log(`Loaded ${data.data.length} timetables`);
      } else {
        console.log('No timetables found or invalid data format');
      }
    } catch (error) {
      console.error('Error fetching timetables:', error);
      showSnackbar('Failed to fetch timetables', 'error');
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

      if (response.data && Array.isArray(response.data.data)) {
        setClassrooms(response.data.data);
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
    
    setFormState(prev => ({
      ...prev,
      [field]: value,
      errors: {
        ...prev.errors,
        [field]: undefined
      }
    }));

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
        academicYear: t.academicYear || '',
        year: formState.year,
        semester: parseInt(formState.semester),
        division: formState.division,
        classroomId: formState.classroom,
        status: 'draft',
        days: t.days.map((day: any) => ({
          day: day.name,
          slots: day.slots.map((slot: any) => ({
            startTime: slot.time || '09:00',
            endTime: slot.time ? incrementTime(slot.time) : '10:00',
            subjectCode: slot.subject?.code || '',
            facultyId: null,
            time: slot.time
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

    const fullTemplate: Template = {
      _id: template._id || '',
      name: template.name || '',
      description: template.description,
      academicYear: template.academicYear || '',
      year: template.year || formState.year,
      semester: template.semester || parseInt(formState.semester),
      division: template.division || formState.division,
      classroomId: template.classroomId || formState.classroom,
      status: 'draft',
      days: template.days?.map(day => ({
        day: day.day || '',
        slots: day.slots?.map(slot => ({
          startTime: slot.startTime || '09:00',
          endTime: slot.endTime || '10:00',
          subjectCode: slot.subjectCode || '',
          facultyId: slot.facultyId || null,
          time: slot.time
        })) || []
      })) || []
    };

    setSelectedTemplate(fullTemplate);
    setIsEditing(true);
  };

  const createComponentTemplate = (template: Template | null): Template | null => {
    if (!template) return null;

    try {
      return {
        _id: template._id,
        name: template.name,
        description: template.description,
        academicYear: template.academicYear,
        year: template.year,
        semester: template.semester,
        division: template.division,
        classroomId: template.classroomId,
        status: 'draft',
        days: template.days.map(day => ({
          day: day.day,
          slots: day.slots.map(slot => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            subjectCode: slot.subjectCode,
            facultyId: slot.facultyId,
            time: slot.time
          }))
        }))
      };
    } catch (error) {
      console.error('Error creating component template:', error);
      return null;
    }
  };

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
          faculty: subject.faculty || []
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

  // Handle template delete
  const handleTemplateDelete = async (templateId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/api/admin/timetable/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete template');

      setTemplates(prev => prev.filter(t => t._id !== templateId));
      if (selectedTemplate?._id === templateId) {
        setSelectedTemplate(null);
        setIsEditing(false);
      }
      showSnackbar('Template deleted successfully', 'success');
    } catch (err) {
      console.error('Error deleting template:', err);
      showSnackbar('Failed to delete template', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle template publish
  const handleTemplatePublish = async (templateId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/api/admin/timetable/${templateId}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to publish template');

      setTemplates(prev => 
        prev.map(t => t._id === templateId ? { ...t, status: 'published' } : t)
      );
      showSnackbar('Template published successfully', 'success');
    } catch (err) {
      console.error('Error publishing template:', err);
      showSnackbar('Failed to publish template', 'error');
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

  // Move handleSaveTimetable above render
  const handleSaveTimetable = () => {
    console.log('handleSaveTimetable function called');
    setLoading(true);
    
    try {
      // Get user info from hook or localStorage
      let currentUser = user;
      let currentToken = token;
      // Use adminId as the default value to prevent undefined
      const adminId = "67ebf8fd6d67fe911abf8c42";
      // Set userId with string type and default value
      let userId: string = adminId;
      
      console.log('Initial user from context:', user);
      
      // If user exists in context, use its ID
      if (user?._id) {
        userId = user._id;
      } else {
        // If not available from hook, try localStorage
        console.log('User ID not found in context, checking localStorage');
        try {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            currentUser = JSON.parse(userStr);
            if (currentUser?._id) {
              userId = currentUser._id;
            }
            console.log('Retrieved user from localStorage:', currentUser);
          }
        } catch (e) {
          console.error('Error parsing user from localStorage:', e);
        }
      }
      
      if (!currentToken) {
        console.log('Token not found in context, checking localStorage');
        currentToken = localStorage.getItem('token');
      }
      
      if (!userId) {
        console.log('No user ID available after checking localStorage');
        showSnackbar('User information is required to save timetable', 'error');
        setLoading(false);
        return;
      }
      
      if (!currentToken) {
        console.log('No token available after checking localStorage');
        showSnackbar('Authentication token is required to save timetable', 'error');
        setLoading(false);
        return;
      }
      
      // Validate classroom is selected
      if (!formState.classroom) {
        console.error('Classroom is required');
        showSnackbar('Please select a classroom', 'error');
        setLoading(false);
        return;
      }
      
      // Create formatted days with actual slots from the timetable
      const formattedDays = Object.keys(timetable).map(day => {
        // Filter out slots that don't have subject or faculty assigned
        const validSlots = timetable[day]
          .map((slot, index) => {
            const timeSlot = timeSlots[index];
            
            // Skip interval and lunch slots
            if (timeSlot.type === 'interval' || timeSlot.type === 'lunch') {
              return null;
            }
            
            // Get time range for the slot
            const [startTime, endTime] = timeSlot.time.split(' - ');
            
            return {
              startTime,
              endTime,
              subjectCode: slot.subject?.subjectCode || slot.subject?.code || 'SUBJ101',
              facultyId: slot.faculty?._id || null
            };
          })
          .filter(slot => slot !== null);
        
        // Always ensure at least one slot per day
        return {
          day,
          slots: validSlots.length > 0 ? validSlots : [
            {
              startTime: "09:00",
              endTime: "10:00",
              subjectCode: "SUBJ101",
              facultyId: null
            }
          ]
        };
      });
      
      // Get current academic year
      const academicYear = getCurrentAcademicYear();
      
      // Create payload without createdBy and classroomId fields
      const payload = {
        university: adminId, // Use adminId for university as well
        academicYear: academicYear,
        template: {
          name: `${formState.year} Year Sem ${formState.semester} Div ${formState.division} Timetable`,
          description: `Timetable for ${formState.year} Year, Semester ${formState.semester}, Division ${formState.division}`,
          year: formState.year,
          semester: parseInt(formState.semester),
          division: formState.division,
          // Removed classroomId and createdBy fields
          days: formattedDays,
          status: 'draft'
        }
      };

      // Add detailed logging of key fields
      console.log("---------- TIMETABLE SAVE DEBUGGING ----------");
      console.log("userId:", userId);
      console.log("adminId:", adminId);
      console.log("formState.classroom:", formState.classroom);
      console.log("Sending timetable save with payload:");
      console.log(JSON.stringify(payload, null, 2));
      console.log("----------------------------------------------");
      
      // API call with correct format
      fetch(`${config.API_URL}/api/admin/timetable/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify(payload)
      })
      .then(res => {
        console.log('Response status:', res.status);
        console.log('Response headers:', Object.fromEntries([...res.headers.entries()]));
        
        // Handle token expiration (401 Unauthorized)
        if (res.status === 401) {
          console.error('Token expired (401 Unauthorized)');
          
          // Clear authentication data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Show error message
          showSnackbar('Your session has expired. Please log in again.', 'error');
          
          // Redirect to login page after a short delay
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
          
          setLoading(false);
          throw new Error('Token expired');
        }
        
        return res.text();
      })
      .then(text => {
        console.log('Raw response text:', text.substring(0, 500)); // Log first 500 chars
        try {
          const data = JSON.parse(text);
          console.log('Save response JSON:', data);
          
          if (data.success) {
            showSnackbar('Timetable saved successfully!', 'success');
            
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
            
            // Fetch updated timetables list and switch to manage tab
            console.log("Fetching timetables after save");
            const currentToken = token || localStorage.getItem('token');
            fetch(`${config.API_URL}/api/admin/timetable/list?university=${ADMIN_ID}`, {
              headers: {
                Authorization: `Bearer ${currentToken}`
              }
            })
            .then(res => res.json())
            .then(listData => {
              console.log('Post-save timetables response:', listData);
              if (listData.success && Array.isArray(listData.data)) {
                setTemplates(listData.data);
                console.log(`Loaded ${listData.data.length} timetables after save`);
              }
              // Switch to manage tab
              setActiveTab('manage');
            })
            .catch(err => {
              console.error('Error fetching timetables after save:', err);
              fetchTimetables();
              setActiveTab('manage');
            });
          } else {
            // Handle specific error cases with more detailed information
            console.log('API error details:', data);
            
            if (data.message === 'Resource not found') {
              showSnackbar('The API endpoint is not available. Please check the server configuration.', 'error');
            } else if (data.message && data.message.includes('University')) {
              console.error('Authentication issue with user ID. Error:', data.message);
              showSnackbar('Authentication issue. Please try logging out and back in.', 'error');
            } else if (data.message && data.message.includes('validation failed')) {
              // Extract and display validation error details
              const errorDetails = data.message.split(':').slice(1).join(':').trim();
              console.error('Validation error fields:', errorDetails);
              showSnackbar(`Validation error: ${errorDetails}`, 'error');
              
              // General error logging without field-specific checks
              console.error('User ID:', userId);
              console.error('Admin ID:', adminId);
              console.error('Form values:', formState);
            } else {
              showSnackbar(`Failed to save timetable: ${data.message || 'Unknown error'}`, 'error');
            }
          }
        } catch (e) {
          console.error('Not JSON response:', text);
          showSnackbar('Failed to save with invalid response from server', 'error');
        }
        setLoading(false);
      })
      .catch(err => {
        if (err.message !== 'Token expired') { // Don't show error if already handled
          console.error('Save error:', err);
          showSnackbar(`Error saving timetable: ${err.message}`, 'error');
          setLoading(false);
        }
      });
    } catch (err) {
      console.error('Error preparing timetable data:', err);
      showSnackbar(`Failed to prepare timetable data: ${err}`, 'error');
      setLoading(false);
    }
  };

  // Add a debug function to test minimal required payload
  const debugTimetableSave = async () => {
    console.log("------ DEBUG FUNCTION: REMOVED CREATEBY AND CLASSROOMID ------");
    setLoading(true);
    
    try {
      // Get user info from hook or localStorage
      let currentToken = token;
      if (!currentToken) {
        currentToken = localStorage.getItem('token');
      }
      
      // Hardcoded admin ID 
      const adminId = "67ebf8fd6d67fe911abf8c42";
      
      // Create exact payload matching the format user shared but without problematic fields
      const exactPayload = {
        "university": adminId,
        "academicYear": getCurrentAcademicYear(),
        "template": {
          "name": `${formState.year} Year Sem ${formState.semester} Div ${formState.division} Timetable`,
          "description": `Timetable for ${formState.year} Year, Semester ${formState.semester}, Division ${formState.division}`,
          "year": formState.year,
          "semester": parseInt(formState.semester),
          "division": formState.division,
          // Removed classroomId field
          "days": DAYS.map(day => ({
            "day": day,
            "slots": [
              {
                "startTime": "09:00",
                "endTime": "10:00",
                "subjectCode": "SUBJ101",
                "facultyId": null
              },
              {
                "startTime": "10:00",
                "endTime": "11:00",
                "subjectCode": "SUBJ101", 
                "facultyId": null
              },
              {
                "startTime": "11:15",
                "endTime": "12:15",
                "subjectCode": "SUBJ101",
                "facultyId": null
              },
              {
                "startTime": "13:15",
                "endTime": "14:15",
                "subjectCode": "SUBJ101",
                "facultyId": null
              },
              {
                "startTime": "14:15",
                "endTime": "15:15",
                "subjectCode": "SUBJ101",
                "facultyId": null
              },
              {
                "startTime": "15:15",
                "endTime": "16:15",
                "subjectCode": "SUBJ101",
                "facultyId": null
              }
            ]
          })),
          // Removed createdBy field
          "status": "draft"
        }
      };
      
      console.log("Sending exact debug payload WITHOUT createdBy and classroomId:", JSON.stringify(exactPayload, null, 2));
      
      const response = await fetch(`${config.API_URL}/api/admin/timetable/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify(exactPayload)
      });
      
      console.log("Debug response status:", response.status);
      console.log("Debug response headers:", Object.fromEntries([...response.headers.entries()]));
      
      const responseText = await response.text();
      console.log("Debug raw response:", responseText);
      
      try {
        const data = JSON.parse(responseText);
        console.log("Debug response JSON:", data);
        
        if (data.success) {
          showSnackbar('Debug timetable created successfully!', 'success');
          
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
          
          // Fetch timetables directly
          console.log("Fetching timetables after debug save");
          fetch(`${config.API_URL}/api/admin/timetable/list?university=${ADMIN_ID}`, {
            headers: {
              Authorization: `Bearer ${currentToken}`
            }
          })
          .then(res => res.json())
          .then(listData => {
            console.log('Post-debug-save timetables response:', listData);
            if (listData.success && Array.isArray(listData.data)) {
              setTemplates(listData.data);
              console.log(`Loaded ${listData.data.length} timetables after debug save`);
            }
            // Switch to manage tab
            setActiveTab('manage');
          })
          .catch(err => {
            console.error('Error fetching timetables after debug save:', err);
            // Still switch tabs even if fetch fails
            setActiveTab('manage');
          });
        } else {
          showSnackbar(`Debug failed: ${data.message || 'Unknown error'}`, 'error');
        }
      } catch (e) {
        console.error('Debug response not JSON:', responseText);
      }
    } catch (err) {
      console.error('Debug error:', err);
    } finally {
      setLoading(false);
    }
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
          console.log(`Initially loaded ${data.data.length} timetables`);
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
  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    // Handle class teacher drop
    if (destination.droppableId === 'class-teacher') {
      if (draggableId.startsWith('faculty-')) {
        const facultyId = draggableId.replace('faculty-', '');
        const facultyMember = faculty.find(f => f._id === facultyId);
        if (facultyMember) setClassTeacher(facultyMember);
      }
      return;
    }

    // Only allow drop into timetable slots
    if (destination.droppableId.startsWith('slot-')) {
      const [_, day, slotIdx] = destination.droppableId.split('-');
      const slotIndex = parseInt(slotIdx);
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

  // Function to download timetable as CSV
  const downloadTimetable = (timetable: Template) => {
    try {
      // Create CSV content
      let csvContent = "Day,Time,Subject,Faculty\n";
      
      // Add each slot to the CSV
      timetable.days.forEach(day => {
        day.slots.forEach(slot => {
          const timeRange = `${slot.startTime} - ${slot.endTime}`;
          const subject = slot.subjectCode || '-';
          const facultyMember = faculty.find(f => f._id === slot.facultyId);
          const facultyName = facultyMember ? facultyMember.name : '-';
          
          csvContent += `${day.day},${timeRange},${subject},${facultyName}\n`;
        });
      });
      
      // Create blob and download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `timetable-${timetable.year}-sem${timetable.semester}-div${timetable.division}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      
      // Trigger download and cleanup
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showSnackbar('Timetable downloaded successfully', 'success');
    } catch (error) {
      console.error('Error downloading timetable:', error);
      showSnackbar('Failed to download timetable', 'error');
    }
  };

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
                    {t.days.reduce((total, day) => total + day.slots.filter(slot => slot.facultyId).length, 0)} Faculty assigned
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-600">
                    {t.days.reduce((total, day) => {
                      const uniqueSubjects = new Set(day.slots.map(slot => slot.subjectCode).filter(Boolean));
                      return total + uniqueSubjects.size;
                    }, 0)} Subjects
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
                  onClick={() => handleTemplateDelete(selectedTemplate._id || '')}
                >
                  <Trash className="h-4 w-4" /> Delete
                </Button>
                
                <Button
                  size="sm" 
                  variant="outline"
                  className="flex items-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                  onClick={() => downloadTimetable(selectedTemplate)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span>Download</span>
                </Button>
                
                {selectedTemplate.status !== 'published' && (
                <Button
                    size="sm" 
                    variant="default"
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    onClick={() => handleTemplatePublish(selectedTemplate._id || '')}
                  >
                    <Eye className="h-4 w-4" /> Publish
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
                            {matchingSlot ? (
                          <div>
                                <div className="font-medium text-blue-600">{matchingSlot.subjectCode || '-'}</div>
                                {matchingSlot.facultyId && (
                                  <div className="text-xs text-gray-500">
                                    {faculty.find(f => f._id === matchingSlot.facultyId)?.name || 'Unknown'}
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

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <div className="flex flex-1 px-8 py-8 gap-8 bg-gradient-to-br from-blue-50 to-white justify-center items-start">
        <div className="w-full max-w-7xl bg-white rounded-2xl shadow-2xl p-8 border flex flex-col gap-8">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'create' | 'manage')}>
            <TabsList className="mb-6 border-2 border-blue-200 p-1 rounded-xl">
              <TabsTrigger value="create" className="px-8 py-3 font-semibold text-base">Create</TabsTrigger>
              <TabsTrigger value="manage" className="px-8 py-3 font-semibold text-base">Manage</TabsTrigger>
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
                      <FormSelect label="Classroom" value={formState.classroom} onChange={value => handleFormChange('classroom', value)} options={classrooms.map(classroom => ({ value: classroom._id, label: classroom.name }))} className="min-w-[160px]" disabled={!formState.division} />
                      <Button size="icon" variant="outline" className="ml-1 border-blue-300 text-blue-700 hover:bg-blue-50" onClick={fetchAvailableClassrooms} title="Refresh Classrooms">
                        <RefreshCw size={18} />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Time Controls */}
                <div className="flex flex-col gap-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <div className="grid grid-cols-2 gap-8">
                    {/* Interval Time Controls */}
                    <div className="flex flex-col gap-2">
                      <h3 className="font-semibold text-blue-800">Interval Time</h3>
                      <div className="flex flex-row gap-4 items-center">
                        <input 
                          type="time" 
                          value={intervalFrom} 
                          onChange={e => handleIntervalTimeChange('from', e.target.value)} 
                          className="border-2 rounded-lg px-4 py-2 bg-white border-blue-200 flex-1" 
                        />
                        <span className="font-medium">to</span>
                        <input 
                          type="time" 
                          value={intervalTo} 
                          onChange={e => handleIntervalTimeChange('to', e.target.value)} 
                          className="border-2 rounded-lg px-4 py-2 bg-white border-blue-200 flex-1" 
                        />
                      </div>
                      <p className="text-sm text-blue-600">
                        Next class will be from {intervalTo} to {parseTimeToMinutes(intervalTo) + 60 < 24 * 60 ? 
                          formatMinutesToTime(parseTimeToMinutes(intervalTo) + 60) : '23:59'}
                      </p>
                    </div>
                    
                    {/* Lunch Break Controls */}
                    <div className="flex flex-col gap-2">
                      <h3 className="font-semibold text-blue-800">Lunch Break Time</h3>
                      <div className="flex flex-row gap-4 items-center">
                        <input 
                          type="time" 
                          value={lunchFrom} 
                          onChange={e => handleLunchTimeChange('from', e.target.value)} 
                          className="border-2 rounded-lg px-4 py-2 bg-white border-blue-200 flex-1" 
                        />
                        <span className="font-medium">to</span>
                        <input 
                          type="time" 
                          value={lunchTo} 
                          onChange={e => handleLunchTimeChange('to', e.target.value)} 
                          className="border-2 rounded-lg px-4 py-2 bg-white border-blue-200 flex-1" 
                        />
                      </div>
                      <p className="text-sm text-blue-600">
                        Lunch break duration: {Math.round((parseTimeToMinutes(lunchTo) - parseTimeToMinutes(lunchFrom)) / 5) * 5} minutes
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Selected Data Summary */}
                {formState.year && formState.semester && formState.division && formState.classroom && intervalFrom && intervalTo && (
                  <div className="text-blue-800 font-medium bg-blue-50 border-2 border-blue-200 rounded-lg px-6 py-3 mt-2 text-center">
                    {`${formState.year} Year, Sem ${formState.semester}, Div ${formState.division}, Room ${classrooms.find(c => c._id === formState.classroom)?.name || ''}, Interval: ${intervalFrom} - ${intervalTo}`}
                  </div>
                )}
                {/* Only show Create Template button when all fields are filled */}
                {formState.year && formState.semester && formState.division && formState.classroom && intervalFrom && intervalTo && !templateGenerated && (
                  <div className="flex justify-end">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-base font-semibold rounded-xl border-2 border-blue-700" onClick={() => setTemplateGenerated(true)}>
                      Create Template
                    </Button>
                  </div>
                )}
              </div>
              {/* Timetable Area */}
              {templateGenerated && (
                <DragDropContext onDragEnd={onDragEnd}>
                  <div className="flex flex-row gap-8 min-h-[60vh]">
                    {/* Days Sidebar with Class Teacher on top */}
                    <div className="flex flex-col gap-4 items-center">
                      {/* Class Teacher Droppable */}
                      <div className="mb-4">
                        <div className="text-center font-semibold text-blue-700 mb-2">Class Teacher</div>
                        <Droppable droppableId="class-teacher">
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={cn(
                                'w-32 h-16 border-2 rounded-xl transition-all flex items-center justify-center',
                                snapshot.isDraggingOver ? 'border-blue-500 bg-blue-100 shadow-md' : 'border-blue-300 bg-blue-50',
                                classTeacher ? 'p-2' : 'p-1'
                              )}
                            >
                              {classTeacher ? (
                                <div className="text-sm font-medium text-blue-700 text-center">
                                  {classTeacher.name}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500 text-center">
                                  Drop faculty here
                                </div>
                              )}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                      {/* Days Buttons */}
                      {DAYS.map(day => (
                        <Button
                          key={day}
                          variant={activeSlot?.day === day ? 'default' : 'outline'}
                          className={cn(
                            'w-32 py-3 rounded-xl font-semibold border-2',
                            activeSlot?.day === day ? 'bg-pink-200 text-black border-pink-400 shadow-lg' : 'bg-white text-black border-pink-200 hover:bg-pink-50'
                          )}
                          onClick={() => setActiveSlot({ day, slotIndex: 0 })}
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                    {/* Timetable Grid */}
                    <div className="flex-1 flex flex-col items-center min-w-[350px]">
                      <div className="w-full bg-white rounded-xl shadow-xl p-6 border-2 border-blue-200 mb-4 flex items-center justify-center">
                        <div className="text-xl font-bold text-blue-700">{activeSlot?.day || 'Select a day'}</div>
                      </div>
                      <div className="w-full bg-white rounded-xl shadow-xl p-6 border-2 border-blue-200">
                        <Droppable droppableId={`day-${activeSlot?.day || 'none'}`} isDropDisabled>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col gap-3">
                              {timeSlots.map((slot, idx) => {
                                // Apply different styling based on slot type
                                if (slot.type === 'interval') {
                                  return (
                                    <div key={`${slot.time}-${idx}`} className="flex flex-row w-full bg-pink-100 border-2 border-pink-300 rounded-xl py-2">
                                      <div className="flex-1 text-center py-2 font-semibold text-pink-700">Interval time ({intervalFrom} to {intervalTo})</div>
                                    </div>
                                  );
                                }
                                
                                if (slot.type === 'lunch') {
                                  return (
                                    <div key={`${slot.time}-${idx}`} className="flex flex-row w-full bg-gray-100 border-2 border-gray-300 rounded-xl py-2">
                                      <div className="flex-1 text-center py-2 font-semibold text-gray-600">Lunch break ({lunchFrom} to {lunchTo})</div>
                                    </div>
                                  );
                                }
                                
                                // Regular class slot
                                const slotData = activeSlot?.day ? timetable[activeSlot.day][idx] : {};
                                return (
                                  <Droppable droppableId={`slot-${activeSlot?.day}-${idx}`} key={`${slot.time}-${idx}`} direction="horizontal">
                                    {(slotProvided, slotSnapshot) => (
                                      <div
                                        ref={slotProvided.innerRef}
                                        {...slotProvided.droppableProps}
                                        className={cn(
                                          'flex flex-row items-center py-3 px-4 rounded-xl transition-all duration-200 border-2',
                                          slotSnapshot.isDraggingOver ? 'bg-blue-100 border-blue-400 shadow-md' : 'bg-white border-blue-200',
                                          'min-h-[65px]'
                                        )}
                                      >
                                        <span className="text-gray-700 font-medium w-32 text-lg">{slot.time}</span>
                                        <div className="flex gap-2 flex-1 justify-end items-center">
                                          {slotData.subject && (
                                            <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg shadow text-sm font-semibold border-2 border-blue-200">
                                              {slotData.subject.name || slotData.subject.subjectCode || 'Unnamed Subject'}
                                            </div>
                                          )}
                                          {slotData.faculty && (
                                            <div className="px-3 py-2 bg-blue-100 text-blue-900 rounded-lg shadow text-sm font-semibold border-2 border-blue-300">
                                              {slotData.faculty.name}
                                            </div>
                                          )}
                                          {!slotData.subject && !slotData.faculty && (
                                            <span className="text-gray-300 text-sm">-</span>
                                          )}
                                        </div>
                                        {slotProvided.placeholder}
                                      </div>
                                    )}
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
                    <div className="flex flex-row gap-6 w-1/3">
                      {/* Faculty Panel */}
                      <div className="bg-white rounded-xl shadow-xl border-2 border-blue-200 p-4 flex-1 flex flex-col min-w-[200px]">
                        <div className="font-bold text-blue-700 text-lg mb-3 text-center flex items-center justify-between">
                          <span>Faculty</span>
                          <Button size="icon" variant="outline" className="ml-2 border-blue-300 text-blue-700 hover:bg-blue-50" onClick={handleRefreshFaculty} disabled={isLoadingFaculty} title="Refresh Faculty">
                            <RefreshCw size={18} />
                          </Button>
                        </div>
                        <Droppable droppableId="faculty-list" isDropDisabled>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 overflow-y-auto min-h-[400px] space-y-3">
                              {sortedFaculty.length > 0 ? sortedFaculty.map((f, idx) => (
                                <Draggable draggableId={`faculty-${f._id}`} index={idx} key={f._id}>
                                  {(dragProvided, dragSnapshot) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      {...dragProvided.dragHandleProps}
                                      className={cn(
                                        'p-3 border-2 rounded-lg bg-blue-50 text-blue-900 font-medium shadow-sm cursor-pointer transition-all',
                                        dragSnapshot.isDragging ? 'bg-blue-200 shadow-lg scale-105' : 'hover:bg-blue-100'
                                      )}
                                    >
                                      {f.name}
                                    </div>
                                  )}
                                </Draggable>
                              )) : <div className="text-gray-400 text-center">No faculty</div>}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                      {/* Subjects Panel */}
                      <div className="bg-white rounded-xl shadow-xl border-2 border-blue-200 p-4 flex-1 flex flex-col min-w-[200px]">
                        <div className="font-bold text-blue-700 text-lg mb-3 text-center flex items-center justify-between">
                          <span>Subjects</span>
                          <Button size="icon" variant="outline" className="ml-2 border-blue-300 text-blue-700 hover:bg-blue-50" onClick={handleRefreshSubjects} disabled={isLoadingSubjects} title="Refresh Subjects">
                            <RefreshCw size={18} />
                          </Button>
                        </div>
                        <Droppable droppableId="subjects-list" isDropDisabled>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 overflow-y-auto min-h-[400px] space-y-3">
                              {sortedSubjects.length > 0 ? sortedSubjects.map((s, idx) => (
                                <Draggable draggableId={`subject-${s._id}`} index={idx} key={s._id}>
                                  {(dragProvided, dragSnapshot) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      {...dragProvided.dragHandleProps}
                                      className={cn(
                                        'p-3 border-2 rounded-lg bg-blue-50 text-blue-700 font-medium shadow-sm cursor-pointer transition-all',
                                        dragSnapshot.isDragging ? 'bg-blue-200 shadow-lg scale-105' : 'hover:bg-blue-100'
                                      )}
                                    >
                                      {s.name || s.subjectCode || 'Unnamed Subject'}
                                    </div>
                                  )}
                                </Draggable>
                              )) : <div className="text-gray-400 text-center">No subjects</div>}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    </div>
                  </div>
                  {/* Save Timetable Button */}
                  <div className="flex justify-end mt-8">
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl shadow-lg text-lg font-bold border-2 border-blue-700 flex items-center gap-2" 
                      onClick={handleSaveTimetable}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                          <span>Saving Timetable...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-5 w-5" />
                          <span>Save Timetable</span>
                        </>
                      )}
                    </Button>
                    
                    {/* Debug Button */}
                    <Button 
                      className="ml-4 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl shadow-lg text-lg font-bold border-2 border-gray-700 flex items-center gap-2" 
                      onClick={debugTimetableSave}
                      disabled={loading}
                    >
                      <AlertCircle className="h-5 w-5" />
                      <span>Debug Save</span>
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
    </div>
  );
};

export default withDashboard(TimetablePage); 
