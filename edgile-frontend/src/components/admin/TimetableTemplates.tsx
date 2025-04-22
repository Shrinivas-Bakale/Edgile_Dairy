import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Badge,
} from "@/components/ui";
import { PlusCircle, Trash, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useSnackbar } from '@/hooks/useSnackbar';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Loading from '@/components/Loading';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface Subject {
  _id: string;
  name: string;
  subjectCode: string;
  type: string;
  code?: string;
}

export interface Faculty {
  _id: string;
  name: string;
  email: string;
  department: string;
  status: 'available' | 'busy';
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  subjectCode: string;
  facultyId: string | null;
  time?: string;
  status?: 'empty' | 'valid' | 'conflict';
  conflicts?: string[];
}

export interface Day {
  day: string;
  slots: TimeSlot[];
}

export interface Template {
  _id: string;
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

interface TimetableTemplatesProps {
  templates: Template[];
  subjects: Subject[];
  onSelect: (template: Template | null) => void;
  selectedTemplate: Template | null;
  editable?: boolean;
  onDelete?: (templateId: string) => void;
  onPublish?: (templateId: string) => void;
}

const TimetableTemplates: React.FC<TimetableTemplatesProps> = ({
  templates,
  subjects,
  onSelect,
  selectedTemplate,
  editable = false,
  onDelete,
  onPublish
}) => {
  const { showSnackbar } = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterSemester, setFilterSemester] = useState<number | null>(null);

  // Get unique years and semesters for filtering
  const years = Array.from(new Set(templates.map(t => t.year)));
  const semesters = Array.from(new Set(templates.map(t => t.semester)));

  // Filter templates based on selected filters
  const filteredTemplates = templates.filter(template => {
    if (filterYear && template.year !== filterYear) return false;
    if (filterSemester && template.semester !== filterSemester) return false;
    return true;
  });

  // Handle template selection with validation
  const handleTemplateSelect = (template: Template) => {
    try {
      // Validate template structure
      if (!template.days || !Array.isArray(template.days)) {
        throw new Error('Invalid template structure');
      }

      // Validate each day's slots
      const hasInvalidSlots = template.days.some(day => 
        !day.slots || !Array.isArray(day.slots) || 
        day.slots.some(slot => !slot.startTime || !slot.endTime)
      );

      if (hasInvalidSlots) {
        throw new Error('Template contains invalid time slots');
      }

      onSelect(template);
    } catch (err) {
      console.error('Error selecting template:', err);
      setError(err instanceof Error ? err.message : 'Failed to select template');
      showSnackbar('Invalid template format', 'error');
    }
  };

  // Get subject name with fallback
  const getSubjectName = (code: string): string => {
    const subject = subjects.find(s => s.subjectCode === code);
    return subject?.name || code;
  };

  // Format time range with validation
  const formatTimeRange = (startTime: string, endTime: string): string => {
    try {
      if (!startTime || !endTime) return 'Invalid time';
      return `${startTime} - ${endTime}`;
    } catch {
      return 'Invalid time format';
    }
  };

  // Render template preview with error boundaries
  const renderTemplatePreview = (template: Template) => {
    try {
      return (
        <Card 
          className={`cursor-pointer transition-all ${
            selectedTemplate?._id === template._id 
              ? 'border-primary shadow-lg' 
              : 'hover:border-gray-300'
          }`}
          onClick={() => handleTemplateSelect(template)}
        >
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span className="truncate max-w-[200px]">
                {template.name || 'Unnamed Template'}
              </span>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {template.year} Year - Sem {template.semester}
                </Badge>
                <Badge variant={template.status === 'published' ? 'default' : 'secondary'}>
                  {template.status || 'draft'}
                </Badge>
              </div>
            </CardTitle>
            <CardDescription className="truncate">
              {template.description || 'No description'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {template.days.map((day, index) => (
                  <div key={index} className="space-y-1">
                    <div className="font-medium text-sm">{day.day}</div>
                    <div className="space-y-1">
                      {day.slots.map((slot, slotIndex) => (
                        <TooltipProvider key={slotIndex}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-sm p-1 rounded bg-gray-50 dark:bg-gray-800">
                                <div className="font-medium">
                                  {formatTimeRange(slot.startTime, slot.endTime)}
                                </div>
                                <div className="text-gray-500 truncate">
                                  {getSubjectName(slot.subjectCode)}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{getSubjectName(slot.subjectCode)}</p>
                              <p className="text-sm text-gray-500">
                                {formatTimeRange(slot.startTime, slot.endTime)}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
          {editable && (
            <div className="p-4 border-t flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(template._id);
                }}
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onPublish?.(template._id);
                }}
                disabled={template.status === 'published'}
              >
                {template.status === 'published' ? (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Published
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Publish
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>
      );
    } catch (err) {
      console.error('Error rendering template preview:', err);
      return (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Invalid Template</CardTitle>
            <CardDescription>
              This template could not be displayed due to formatting issues.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loading size="lg" />
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Templates Available</AlertTitle>
        <AlertDescription>
          Create a new template or generate templates automatically.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <Select
          value={filterYear}
          onValueChange={setFilterYear}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Years</SelectItem>
            {years.map(year => (
              <SelectItem key={year} value={year}>
                {year} Year
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterSemester?.toString() || ''}
          onValueChange={(value) => setFilterSemester(value ? parseInt(value) : null)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Semester" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Semesters</SelectItem>
            {semesters.map(sem => (
              <SelectItem key={sem} value={sem.toString()}>
                Semester {sem}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <div key={template._id}>
            {renderTemplatePreview(template)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimetableTemplates; 