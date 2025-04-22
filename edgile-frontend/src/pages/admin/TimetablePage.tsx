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
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

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

      if (response.data?.data) {
        const normalizedSubjects = response.data.data.map((subject: any) => ({
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

      if (response.data?.data) {
        const facultyWithStatus = response.data.data.map((faculty: any) => ({
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

  // Render functions
  const renderForm = () => {
    return (
      <Card className={CARD_CLASS}>
        <CardHeader>
          <CardTitle>Class Configuration</CardTitle>
          <CardDescription>
            Configure the class details for timetable generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <FormSelect
              label="Year"
              value={formState.year}
              onChange={(value) => {
                console.log("Year changed to:", value);
                handleFormChange('year', value);
                updateAvailableSemesters(value);
              }}
              options={YEARS.map(year => ({ value: year, label: year }))}
              required
              error={formState.errors.year}
              className="space-y-2"
            />
            
            <FormSelect
              label="Semester"
              value={formState.semester}
              onChange={(value) => {
                console.log("Semester changed to:", value);
                handleFormChange('semester', value);
              }}
              options={availableSemesters.map(sem => ({ 
                value: sem.toString(), 
                label: `Semester ${sem}` 
              }))}
              disabled={!formState.year}
              tooltip={!formState.year ? "Please select a year first" : undefined}
              required
              error={formState.errors.semester}
              className="space-y-2"
            />
            
            <FormSelect
              label="Division"
              value={formState.division}
              onChange={(value) => {
                console.log("Division changed to:", value);
                handleFormChange('division', value);
              }}
              options={['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].map(div => ({ value: div, label: div }))}
              disabled={!formState.semester}
              tooltip={!formState.semester ? "Please select a semester first" : undefined}
              required
              error={formState.errors.division}
              className="space-y-2"
            />
            
            {isPageLoading ? (
              <div className="flex items-center space-x-2 py-4">
                <Loading size="sm" />
                <span className="text-gray-600 dark:text-gray-300">Loading classrooms...</span>
              </div>
            ) : (
              <div>
                <FormSelect
                  label="Classroom"
                  value={formState.classroom}
                  onChange={(value) => {
                    console.log("Classroom changed to:", value);
                    handleFormChange('classroom', value);
                  }}
                  options={classrooms.map(classroom => ({ 
                    value: classroom._id, 
                    label: `${classroom.name} (Capacity: ${classroom.capacity}${classroom.building ? `, ${classroom.building}` : ''})` 
                  }))}
                  disabled={!formState.division || isPageLoading}
                  tooltip={!formState.division ? "Please select a division first" : isPageLoading ? "Loading classrooms..." : undefined}
                  required
                  error={formState.errors.classroom}
                  className="space-y-2"
                />
                {classrooms.length === 0 && !isPageLoading && (
                  <Button 
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      fetchAvailableClassrooms();
                    }}
                    className="mt-2"
                  >
                    Refresh Classrooms
                  </Button>
                )}
              </div>
            )}
            
            {/* Add the debug component at the end */}
            {process.env.NODE_ENV !== 'production' && (
              <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                <div className="font-medium text-gray-800 dark:text-gray-200">Current values:</div>
                <div className="text-gray-700 dark:text-gray-300">Year: {formState.year || 'Not selected'}</div>
                <div className="text-gray-700 dark:text-gray-300">Semester: {formState.semester || 'Not selected'}</div>
                <div className="text-gray-700 dark:text-gray-300">Division: {formState.division || 'Not selected'}</div>
                <div className="text-gray-700 dark:text-gray-300">Classroom: {formState.classroom || 'Not selected'}</div>
                <div className="text-gray-700 dark:text-gray-300">Available Classrooms: {classrooms.length}</div>
                <div className="text-gray-700 dark:text-gray-300">Available Semesters: {availableSemesters.join(', ')}</div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    );
  };

  const renderCreateTimetable = () => {
    if (!isFormComplete()) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Incomplete Configuration</AlertTitle>
          <AlertDescription>
            Please complete the class configuration above to create timetables.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="grid grid-cols-12 gap-6">
        {/* Left Panel: Templates */}
        <div className="col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Timetable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={createCustomTemplate}
                  variant="outline"
                  className="flex-1"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Custom
                </Button>
                <Button
                  onClick={generateTemplates}
                  variant="outline"
                  className="flex-1"
                  disabled={isPageLoading}
                >
                  {isPageLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </div>

              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {templates.map((template) => (
                    <Card
                      key={template._id}
                      className={`cursor-pointer transition-all ${
                        selectedTemplate?._id === template._id
                          ? 'border-primary shadow-lg'
                          : 'hover:border-gray-300'
                      }`}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardHeader className="p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base">
                              {template.name || 'Unnamed Template'}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {template.year} Year - Sem {template.semester}
                            </p>
                          </div>
                          <Badge variant={template.status === 'published' ? 'default' : 'secondary'}>
                            {template.status || 'draft'}
                          </Badge>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Middle and Right Panels: Editor or Subjects/Faculty */}
        {selectedTemplate ? (
          // When a template is selected, show the editor in the middle and right columns
          <div className="col-span-9">
            <TimetableEditor
              template={selectedTemplate as any}
              subjects={subjects}
              faculty={faculty}
              onSave={handleTemplateSave}
              onBack={() => {
                setSelectedTemplate(null);
                setIsEditing(false);
              }}
              onDelete={handleTemplateDelete}
            />
          </div>
        ) : (
          // When no template is selected, show subjects and faculty panels
          <>
            {/* Middle Panel: Empty State */}
            <div className="col-span-6">
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center text-muted-foreground">
                  <p>Select a template or create a new one to start editing</p>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel: Subjects and Faculty */}
            <div className="col-span-3 space-y-4">
              {/* Subjects */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Subjects</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {subjects.length > 0 ? (
                      <div className="space-y-2">
                        {subjects.map((subject) => (
                          <div
                            key={subject._id}
                            className="p-3 bg-card border rounded-lg hover:border-primary transition-colors"
                          >
                            <div className="font-medium">{subject.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {subject.subjectCode}
                            </div>
                            <Badge variant="outline" className="mt-1">
                              {subject.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        {isLoadingSubjects ? 'Loading subjects...' : 'No subjects available'}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Faculty */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Faculty</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {faculty.length > 0 ? (
                      <div className="space-y-2">
                        {faculty.map((member) => (
                          <div
                            key={member._id}
                            className={`p-3 border rounded-lg transition-colors ${
                              member.status === 'busy'
                                ? 'bg-destructive/10 border-destructive'
                                : 'bg-card hover:border-primary'
                            }`}
                          >
                            <div className="font-medium">{member.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {member.department}
                            </div>
                            <Badge
                              variant={member.status === 'available' ? 'default' : 'destructive'}
                              className="mt-1"
                            >
                              {member.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        {isLoadingFaculty ? 'Loading faculty...' : 'No faculty available'}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderManageTimetables = (): ReactElement => (
    <Card className={CARD_CLASS}>
      <CardHeader>
        <CardTitle>Manage Timetables</CardTitle>
        <CardDescription>
          View, edit and publish timetables for this class
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isFormComplete() ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Incomplete Configuration</AlertTitle>
            <AlertDescription>
              Please complete the class configuration above to view timetables.
            </AlertDescription>
          </Alert>
        ) : (
          <EmptyState
            title="No Timetables Found"
            message="Go to the Create Timetable tab to create your first timetable."
            action={{
              label: "Create Timetable",
              onClick: () => setActiveTab('create')
            }}
          />
        )}
      </CardContent>
    </Card>
  );

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

  // Main render
  if (isPageLoading) {
    return <LoadingOverlay message="Loading page..." />;
  }

  return (
    <div className="container mx-auto py-6">
      <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value)}>
        <TabsList className="mb-6">
          <TabsTrigger value="create">Create Timetable</TabsTrigger>
          <TabsTrigger value="manage">Manage Timetables</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create">
          {renderForm()}
          {renderCreateTimetable()}
        </TabsContent>
        
        <TabsContent value="manage">
          {renderForm()}
          {renderManageTimetables()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default withDashboard(TimetablePage); 
