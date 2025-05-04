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

// Constants
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const YEARS = ['First', 'Second', 'Third'] as const;
const SEMESTERS = {
  'First': [1, 2],
  'Second': [3, 4],
  'Third': [5, 6]
} as const;
const TIME_SLOTS = [
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '12:00 - 13:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
  '16:00 - 17:00'
];

// Style constants
const CARD_CLASS = "mb-6";
const BUTTON_CLASS = "flex items-center justify-center gap-2 w-full";

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

// Main component
const TimetablePage = (): ReactElement => {
  const { user, token } = useAuth();
  const { showSnackbar } = useSnackbar();
  
  // State variables with proper types
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('create');
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
  
  // Add state for timetable slots
  const [timetable, setTimetable] = useState(() => {
    // Initialize timetable: day -> slot[]
    const initial: Record<string, { subject?: Subject; faculty?: Faculty }[]> = {};
    DAYS.forEach(day => {
      initial[day] = TIME_SLOTS.map(() => ({}));
    });
    return initial;
  });

  // Add state to control template generation
  const [templateGenerated, setTemplateGenerated] = useState(false);
  const isConfigComplete = formState.year && formState.semester && formState.division && formState.classroom;

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

  // Load initial data
  useEffect(() => {
    if (user?._id && token) {
      console.log("Initial classroom fetch on component mount");
      fetchAvailableClassrooms();
    }
  }, [user, token]);

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

  // Drag-and-drop handler
  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    // Drag to class teacher column
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

  // Main render
  if (isPageLoading) {
    return <LoadingOverlay message="Loading page..." />;
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <div className="flex flex-1 px-8 py-8 gap-8 bg-gradient-to-br from-blue-50 to-white justify-center items-start">
        <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl p-8 border flex flex-col gap-8">
          {/* Top Bar with Dropdowns and Buttons */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <FormSelect
                  label="Year"
                  value={formState.year}
                  onChange={value => { handleFormChange('year', value); updateAvailableSemesters(value); }}
                  options={YEARS.map(year => ({ value: year, label: year }))}
                  className="min-w-[120px]"
                />
                <FormSelect
                  label="Sem"
                  value={formState.semester}
                  onChange={value => handleFormChange('semester', value)}
                  options={availableSemesters.map(sem => ({ value: sem.toString(), label: `Sem ${sem}` }))}
                  className="min-w-[120px]"
                  disabled={!formState.year}
                />
                <FormSelect
                  label="Div"
                  value={formState.division}
                  onChange={value => handleFormChange('division', value)}
                  options={['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].map(div => ({ value: div, label: div }))}
                  className="min-w-[120px]"
                  disabled={!formState.semester}
                />
                <div className="flex gap-4 items-end">
                  <FormSelect
                    label="Classroom"
                    value={formState.classroom}
                    onChange={value => handleFormChange('classroom', value)}
                    options={classrooms.map(classroom => ({ value: classroom._id, label: classroom.name }))}
                    className="min-w-[160px]"
                    disabled={!formState.division}
                  />
                  <Button
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 ml-2"
                    onClick={e => {
                      e.preventDefault();
                      fetchAvailableClassrooms();
                    }}
                    disabled={isPageLoading}
                  >
                    {isPageLoading ? 'Refreshing...' : 'Refresh Classrooms'}
                  </Button>
                </div>
              </div>
              <div className="flex gap-4">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6">Create</Button>
                <Button className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-6 border border-blue-600">Manage</Button>
              </div>
            </div>
            {/* Configuration summary and CTA */}
            {isConfigComplete && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mt-2">
                <div className="text-blue-800 font-medium">
                  {`${formState.year} Year, Sem ${formState.semester}, Div ${formState.division}, Room ${classrooms.find(c => c._id === formState.classroom)?.name || ''}`}
                </div>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 ml-4"
                  disabled={!isConfigComplete || templateGenerated}
                  onClick={() => setTemplateGenerated(true)}
                >
                  Generate Template
                </Button>
              </div>
            )}
          </div>
          {/* Only show timetable UI after template is generated */}
          {templateGenerated && (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-8 min-h-[60vh]">
                {/* Days Sidebar */}
                <div className="flex flex-col gap-4 items-center pt-2">
                  {DAYS.map(day => (
                    <Button
                      key={day}
                      variant={activeSlot?.day === day ? 'default' : 'outline'}
                      className={cn(
                        'w-32 py-2 rounded-lg font-semibold border-2',
                        activeSlot?.day === day ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                      )}
                      onClick={() => setActiveSlot({ day, slotIndex: 0 })}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
                {/* Timetable Grid */}
                <div className="flex-1 flex flex-col items-center min-w-[350px]">
                  <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 border border-blue-100 mb-4 flex items-center justify-between">
                    <div className="text-lg font-bold text-blue-700">{activeSlot?.day || 'Select a day'}</div>
                    {classTeacher && (
                      <div className="text-blue-600 font-semibold">Class Teacher: {classTeacher.name}</div>
                    )}
                  </div>
                  <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 border border-blue-100">
                    <Droppable droppableId={`day-${activeSlot?.day || 'none'}`} isDropDisabled>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col gap-2">
                          {TIME_SLOTS.map((slot, idx) => (
                            <Droppable droppableId={`slot-${activeSlot?.day}-${idx}`} key={slot} direction="horizontal">
                              {(slotProvided, slotSnapshot) => {
                                const slotData = activeSlot?.day ? timetable[activeSlot.day][idx] : {};
                                return (
                                  <div
                                    ref={slotProvided.innerRef}
                                    {...slotProvided.droppableProps}
                                    className={cn(
                                      'flex items-center justify-between border-b last:border-b-0 py-3 px-4 rounded-lg transition-all duration-200',
                                      slotSnapshot.isDraggingOver ? 'bg-blue-100 border-blue-400 shadow-md' : 'bg-white border-blue-100',
                                      'min-h-[56px]'
                                    )}
                                  >
                                    <span className="text-gray-700 font-medium w-32">{slot}</span>
                                    <div className="flex gap-2 flex-1 justify-end items-center">
                                      {slotData.subject && (
                                        <div className="px-2 py-1 bg-blue-50 text-blue-700 rounded shadow text-xs font-semibold border border-blue-200">
                                          {slotData.subject.name || slotData.subject.subjectCode || 'Unnamed Subject'}
                                        </div>
                                      )}
                                      {slotData.faculty && (
                                        <div className="px-2 py-1 bg-blue-100 text-blue-900 rounded shadow text-xs font-semibold border border-blue-300">
                                          {slotData.faculty.name}
                                        </div>
                                      )}
                                      {!slotData.subject && !slotData.faculty && (
                                        <span className="text-gray-300 text-xs">-</span>
                                      )}
                                    </div>
                                    {slotProvided.placeholder}
                                  </div>
                                );
                              }}
                            </Droppable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
                {/* Right Panels: Faculty and Subjects as draggable lists */}
                <div className="flex flex-row gap-8 w-full">
                  {/* Class Teacher Column */}
                  <div className="bg-white rounded-2xl shadow-xl border p-4 flex flex-col items-center min-w-[180px] max-w-[200px]">
                    <div className="font-bold text-blue-700 text-lg mb-2 text-center">Class Teacher</div>
                    <Droppable droppableId="class-teacher">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            'flex-1 flex flex-col items-center justify-center min-h-[80px] border-2 rounded-lg transition-all',
                            snapshot.isDraggingOver ? 'border-blue-400 bg-blue-50' : 'border-blue-200 bg-white'
                          )}
                        >
                          {classTeacher ? (
                            <div className="p-2 bg-blue-100 text-blue-900 rounded shadow font-semibold border border-blue-300 w-full text-center">
                              {classTeacher.name}
                            </div>
                          ) : (
                            <span className="text-gray-400">Drag a faculty here</span>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                  {/* Faculty Panel */}
                  <div className="bg-white rounded-2xl shadow-xl border p-4 flex-1 flex flex-col">
                    <div className="font-bold text-blue-700 text-lg mb-2 text-center flex items-center justify-between">
                      <span>Faculty</span>
                      <Button size="sm" variant="outline" className="ml-2 border-blue-300 text-blue-700 hover:bg-blue-50" onClick={handleRefreshFaculty} disabled={isLoadingFaculty}>
                        {isLoadingFaculty ? 'Refreshing...' : 'Refresh'}
                      </Button>
                    </div>
                    <Droppable droppableId="faculty-list" isDropDisabled>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 overflow-y-auto min-h-[120px] space-y-2">
                          {faculty.length > 0 ? faculty.map((f, idx) => (
                            <Draggable draggableId={`faculty-${f._id}`} index={idx} key={f._id}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className={cn(
                                    'p-2 border rounded-lg bg-blue-50 text-blue-900 font-medium shadow-sm cursor-pointer transition-all',
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
                  <div className="bg-white rounded-2xl shadow-xl border p-4 flex-1 flex flex-col">
                    <div className="font-bold text-blue-700 text-lg mb-2 text-center flex items-center justify-between">
                      <span>Subjects</span>
                      <Button size="sm" variant="outline" className="ml-2 border-blue-300 text-blue-700 hover:bg-blue-50" onClick={handleRefreshSubjects} disabled={isLoadingSubjects}>
                        {isLoadingSubjects ? 'Refreshing...' : 'Refresh'}
                      </Button>
                    </div>
                    <Droppable droppableId="subjects-list" isDropDisabled>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 overflow-y-auto min-h-[120px] space-y-2">
                          {subjects.length > 0 ? subjects.map((s, idx) => (
                            <Draggable draggableId={`subject-${s._id}`} index={idx} key={s._id}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className={cn(
                                    'p-2 border rounded-lg bg-blue-50 text-blue-700 font-medium shadow-sm cursor-pointer transition-all',
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
            </DragDropContext>
          )}
          {/* Save Timetable CTA */}
          {templateGenerated && (
            <div className="flex justify-end mt-6">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg shadow-lg text-lg font-bold border border-blue-700">
                Save Timetable
              </Button>
            </div>
          )}
          {/* Manage Timetable Card */}
          {activeTab === 'manage' && (
            <div className="w-full max-w-4xl mx-auto mt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {templates.map((t) => (
                  <Card key={t._id} className="border-blue-300 hover:shadow-xl cursor-pointer transition-all" onClick={() => setSelectedTemplate(t)}>
                    <CardHeader>
                      <CardTitle>{t.year} Year, Div {t.division}</CardTitle>
                      <CardDescription>Class Teacher: {classTeacher?.name || 'Not assigned'}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              {/* Show timetable in table/excel format when a card is selected */}
              {selectedTemplate && (
                <div className="mt-8 bg-white rounded-2xl shadow-xl border p-6">
                  <div className="text-xl font-bold text-blue-700 mb-4">Timetable for {selectedTemplate.year} Year, Div {selectedTemplate.division}</div>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border-b-2 border-blue-200 p-2 text-left">Day</th>
                        {TIME_SLOTS.map(slot => (
                          <th key={slot} className="border-b-2 border-blue-200 p-2 text-center">{slot}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTemplate.days.map(day => (
                        <tr key={day.day}>
                          <td className="border-b border-blue-100 p-2 font-semibold text-blue-700">{day.day}</td>
                          {day.slots.map((slot, idx) => (
                            <td key={idx} className="border-b border-blue-100 p-2 text-center">
                              {slot.subjectCode || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default withDashboard(TimetablePage); 
