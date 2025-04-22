import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, ArrowLeft, Save, Trash } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Subject, Faculty, TimeSlot, Day, Template } from './TimetableTemplates';

// Define standard time slots
const DEFAULT_TIME_SLOTS = [
  '09:00-10:00',
  '10:00-11:00',
  '11:00-12:00',
  '12:00-13:00',
  '14:00-15:00',
  '15:00-16:00',
  '16:00-17:00'
];

interface TimetableEditorProps {
  template: Template;
  subjects: Subject[];
  faculty: Faculty[];
  onSave: (template: Template) => Promise<void>;
  onBack: () => void;
  onDelete?: (templateId: string) => Promise<void>;
}

export const TimetableEditor: React.FC<TimetableEditorProps> = ({
  template,
  subjects,
  faculty,
  onSave,
  onBack,
  onDelete
}) => {
  const [editedTemplate, setEditedTemplate] = useState<Template>(template);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Initialize with default time slots if empty
  useEffect(() => {
    const updatedDays = template.days.map(day => {
      // If day has no slots, create default empty slots
      if (!day.slots || day.slots.length === 0) {
        return {
          ...day,
          slots: DEFAULT_TIME_SLOTS.map(timeRange => {
            const [startTime, endTime] = timeRange.split('-');
            return {
              startTime,
              endTime,
              subjectCode: '',
              facultyId: null
            };
          })
        };
      }
      return day;
    });

    setEditedTemplate({
      ...template,
      days: updatedDays
    });
  }, [template]);

  // Handle completion of drag operations
  const handleDragEnd = (result: any) => {
    const { destination, source, draggableId } = result;

    // Drop outside droppable area or same position
    if (!destination) return;
    
    // Parse the draggable ID to get the type and ID
    const [itemType, itemId] = draggableId.split('-');
    
    // Handle drops into timetable slots
    if (destination.droppableId.startsWith('slot-')) {
      const [_, dayName, slotIndex] = destination.droppableId.split('-');
      
      // Find the day in the template
      const updatedTemplate = { ...editedTemplate };
      const dayIndex = updatedTemplate.days.findIndex(d => d.day === dayName);
      
      if (dayIndex === -1) return;
      
      // Update the slot with the dragged item
      if (itemType === 'subject') {
        const subject = subjects.find(s => s._id === itemId);
        if (!subject) return;
        
        updatedTemplate.days[dayIndex].slots[parseInt(slotIndex)] = {
          ...updatedTemplate.days[dayIndex].slots[parseInt(slotIndex)],
          subjectCode: subject.subjectCode
        };
      } else if (itemType === 'faculty') {
        const facultyMember = faculty.find(f => f._id === itemId);
        if (!facultyMember) return;
        
        updatedTemplate.days[dayIndex].slots[parseInt(slotIndex)] = {
          ...updatedTemplate.days[dayIndex].slots[parseInt(slotIndex)],
          facultyId: facultyMember._id
        };
      }
      
      setEditedTemplate(updatedTemplate);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setValidationErrors([]);
    
    try {
      await onSave(editedTemplate);
    } catch (error) {
      console.error('Error saving template:', error);
      setValidationErrors(['Failed to save template']);
    } finally {
      setIsLoading(false);
    }
  };

  // Render a single time slot in the timetable
  const renderTimeSlot = (day: Day, slot: TimeSlot, index: number) => {
    const subject = slot.subjectCode ? subjects.find(s => s.subjectCode === slot.subjectCode) : null;
    const facultyMember = slot.facultyId ? faculty.find(f => f._id === slot.facultyId) : null;
    
    return (
      <Droppable droppableId={`slot-${day.day}-${index}`} key={`${day.day}-${index}`}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`p-3 mb-2 border rounded-lg transition-colors ${
              subject || facultyMember ? 'bg-primary/10 border-primary' : 'bg-card'
            }`}
          >
            <div className="text-sm font-medium">{slot.startTime} - {slot.endTime}</div>
            
            {subject && (
              <div className="mt-1">
                <Badge variant="outline" className="text-xs">
                  {subject.name}
                </Badge>
              </div>
            )}
            
            {facultyMember && (
              <div className="mt-1">
                <Badge variant="secondary" className="text-xs">
                  {facultyMember.name}
                </Badge>
              </div>
            )}
            
            {!subject && !facultyMember && (
              <div className="text-xs text-muted-foreground mt-2">
                Drag subjects/faculty here
              </div>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <Button
          onClick={onBack}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Templates
        </Button>
        <div className="flex items-center gap-2">
          {onDelete && (
            <Button
              onClick={() => onDelete(template._id)}
              variant="destructive"
              size="sm"
              className="flex items-center gap-2"
            >
              <Trash className="h-4 w-4" />
              Delete Template
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={isLoading}
            size="sm"
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Validation errors display */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Errors</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Timetable grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {editedTemplate.days.map((day) => (
            <Card key={day.day} className="col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-md">{day.day}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {day.slots.map((slot, index) => 
                  renderTimeSlot(day, slot, index)
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default TimetableEditor; 