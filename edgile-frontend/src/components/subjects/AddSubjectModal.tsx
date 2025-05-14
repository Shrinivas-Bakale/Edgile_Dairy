import React, { useState } from 'react';
import { 
  IconX, 
  IconPlus,
  IconAlertCircle,
  IconTrash
} from '@tabler/icons-react';
import { adminAPI } from '../../utils/api';
import { useSnackbar } from '../../contexts/SnackbarContext';

interface Subject {
  subjectName: string;
  subjectCode: string;
  type: 'core' | 'lab' | 'elective';
  totalDuration: number;
  description: string;
}

interface AddSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (subjects: any[]) => void;
  academicYears: string[]; // Keeping for compatibility but won't use
  currentAcademicYear: string; // Keeping for compatibility but won't use
}

const AddSubjectModal: React.FC<AddSubjectModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess
}) => {
  const { showSnackbar } = useSnackbar();

  // Common data shared across all subjects
  const [commonData, setCommonData] = useState({
    year: 'First',
    semester: 1
  });
  
  // Multiple subject entries
  const [subjects, setSubjects] = useState<Subject[]>([{
    subjectName: '',
    subjectCode: '',
    type: 'core',
    totalDuration: 48,
    description: ''
  }]);
  
  const [errors, setErrors] = useState<{ 
    common: { [key: string]: string },
    subjects: { [key: string]: { [key: string]: string } }
  }>({
    common: {},
    subjects: {'0': {}}
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Handle common data changes
  const handleCommonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setCommonData({
      ...commonData,
      [name]: name === 'semester' ? parseInt(value) : value
    });
    
    // Clear errors when field is changed
    if (errors.common[name]) {
      const updatedErrors = { ...errors };
      updatedErrors.common[name] = '';
      setErrors(updatedErrors);
    }
  };
  
  // Handle subject data changes
  const handleSubjectChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const updatedSubjects = [...subjects];
    
    // Handle number fields
    if (type === 'number') {
      updatedSubjects[index] = {
        ...updatedSubjects[index],
        [name]: parseInt(value) || 0
      };
    } else {
      updatedSubjects[index] = {
        ...updatedSubjects[index],
        [name]: value
      };
    }
    
    setSubjects(updatedSubjects);
    
    // Clear errors when field is changed
    if (errors.subjects[index] && errors.subjects[index][name]) {
      const updatedErrors = { ...errors };
      updatedErrors.subjects[index][name] = '';
      setErrors(updatedErrors);
    }
  };
  
  // Add another subject entry
  const addSubjectEntry = () => {
    setSubjects([
      ...subjects,
      {
        subjectName: '',
        subjectCode: '',
        type: 'core',
        totalDuration: 48,
        description: ''
      }
    ]);
    
    // Add entry to errors object
    setErrors({
      ...errors,
      subjects: {
        ...errors.subjects,
        [subjects.length.toString()]: {}
      }
    });
  };
  
  // Remove a subject entry
  const removeSubjectEntry = (index: number) => {
    if (subjects.length <= 1) return; // Don't remove the last entry
    
    const updatedSubjects = [...subjects];
    updatedSubjects.splice(index, 1);
    setSubjects(updatedSubjects);
    
    // Update errors object
    const updatedErrors = { ...errors };
    const updatedSubjectErrors: { [key: string]: { [key: string]: string } } = {};
    
    // Rebuild the subject errors with updated indices
    Object.keys(updatedErrors.subjects).forEach(oldIndex => {
      const numericIndex = parseInt(oldIndex);
      if (numericIndex < index) {
        updatedSubjectErrors[oldIndex] = updatedErrors.subjects[oldIndex];
      } else if (numericIndex > index) {
        updatedSubjectErrors[(numericIndex - 1).toString()] = updatedErrors.subjects[oldIndex];
      }
    });
    
    updatedErrors.subjects = updatedSubjectErrors;
    setErrors(updatedErrors);
  };
  
  // Validate form inputs
  const validateForm = () => {
    const newErrors = {
      common: {} as { [key: string]: string },
      subjects: {} as { [key: string]: { [key: string]: string } }
    };
    
    // Validate each subject
    subjects.forEach((subject, index) => {
      newErrors.subjects[index.toString()] = {};
      
      if (!subject.subjectName.trim()) {
        newErrors.subjects[index.toString()].subjectName = 'Subject name is required';
      }
      
      if (!subject.subjectCode.trim()) {
        newErrors.subjects[index.toString()].subjectCode = 'Subject code is required';
      }
      
      if (subject.totalDuration <= 0) {
        newErrors.subjects[index.toString()].totalDuration = 'Total duration must be greater than 0';
      }
    });
    
    setErrors(newErrors);
    
    // Check if there are any errors
    const hasCommonErrors = Object.keys(newErrors.common).length > 0;
    const hasSubjectErrors = Object.values(newErrors.subjects).some(
      subjectErrors => Object.keys(subjectErrors).length > 0
    );
    
    return !hasCommonErrors && !hasSubjectErrors;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Validate form
      if (!validateForm()) {
        setIsSubmitting(false);
        return;
      }
      
      const createdSubjects = [];
      
      // Submit each subject
      for (const subject of subjects) {
        const subjectData = {
          ...subject,
          year: commonData.year,
          semester: parseInt(commonData.semester.toString())
        };
        
        // Add type assertion to handle the response properly
        const response = await adminAPI.createSubject(subjectData) as {
          success: boolean;
          subject?: any;
          message?: string;
        };
        
        if (response.success) {
          createdSubjects.push(response.subject);
        } else {
          // Show error in snackbar instead of state
          showSnackbar(response.message || 'Failed to create subject', 'error');
          setSubmitError(null); // Clear the error state
          break;
        }
      }
      
      if (createdSubjects.length === subjects.length) {
        // All subjects created successfully
        onSuccess(createdSubjects);
        resetForm();
        onClose();
      }
    } catch (error: any) {
      console.error('Error creating subjects:', error);
      // Show error in snackbar instead of state
      showSnackbar(error.message || 'An unexpected error occurred', 'error');
      setSubmitError(null); // Clear the error state
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Reset form to initial state
  const resetForm = () => {
    setCommonData({
      year: 'First',
      semester: 1
    });
    
    setSubjects([{
      subjectName: '',
      subjectCode: '',
      type: 'core',
      totalDuration: 48,
      description: ''
    }]);
    
    setErrors({
      common: {},
      subjects: {'0': {}}
    });
    
    setSubmitError(null);
  };
  
  // Calculate weekly hours based on total duration (12 weeks in a semester)
  const calculateWeeklyHours = (totalDuration: number) => {
    return Math.ceil(totalDuration / 12);
  };
  
  // Get available semesters based on selected year
  const getAvailableSemesters = (year: string) => {
    switch (year) {
      case 'First':
        return [1, 2];
      case 'Second':
        return [3, 4];
      case 'Third':
        return [5, 6];
      default:
        return [1, 2, 3, 4, 5, 6];
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 my-8">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <IconPlus size={20} className="mr-2 text-indigo-600" />
            Add New Subjects
          </h2>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <IconX size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {submitError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
                <IconAlertCircle size={20} className="mr-2 flex-shrink-0 text-red-500" />
                <span className="text-red-700">{submitError}</span>
              </div>
            )}
            
            {/* Common settings section */}
            <div className="mb-6 p-5 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Common Settings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="year"
                    value={commonData.year}
                    onChange={handleCommonChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900"
                    required
                  >
                    <option value="First">First Year</option>
                    <option value="Second">Second Year</option>
                    <option value="Third">Third Year</option>
                  </select>
                  {errors.common.year && (
                    <p className="mt-1 text-sm text-red-600">{errors.common.year}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Semester <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="semester"
                    value={commonData.semester}
                    onChange={handleCommonChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900"
                    required
                  >
                    {getAvailableSemesters(commonData.year).map(sem => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                  {errors.common.semester && (
                    <p className="mt-1 text-sm text-red-600">{errors.common.semester}</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Subject details section */}
            <div className="mb-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">
                  Subject Details
                </h3>
                <button
                  type="button"
                  onClick={addSubjectEntry}
                  className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
                >
                  <IconPlus size={16} className="mr-1" />
                  Add More
                </button>
              </div>
              
              {subjects.map((subject, index) => (
                <div 
                  key={index} 
                  className="p-5 border border-gray-200 rounded-lg relative"
                >
                  {subjects.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSubjectEntry(index)}
                      className="absolute top-3 right-3 text-gray-400 hover:text-red-500 focus:outline-none"
                    >
                      <IconTrash size={18} />
                    </button>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="subjectName"
                        value={subject.subjectName}
                        onChange={(e) => handleSubjectChange(index, e)}
                        className={`w-full px-3 py-2 border ${
                          errors.subjects[index]?.subjectName 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-indigo-500'
                        } rounded-md shadow-sm focus:outline-none focus:ring-2 bg-white text-gray-900`}
                        placeholder="e.g., Data Structures and Algorithms"
                        required
                      />
                      {errors.subjects[index]?.subjectName && (
                        <p className="mt-1 text-sm text-red-600">{errors.subjects[index].subjectName}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="subjectCode"
                        value={subject.subjectCode}
                        onChange={(e) => handleSubjectChange(index, e)}
                        className={`w-full px-3 py-2 border ${
                          errors.subjects[index]?.subjectCode 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-indigo-500'
                        } rounded-md shadow-sm focus:outline-none focus:ring-2 bg-white text-gray-900`}
                        placeholder="e.g., CS201"
                        required
                      />
                      {errors.subjects[index]?.subjectCode && (
                        <p className="mt-1 text-sm text-red-600">{errors.subjects[index].subjectCode}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="type"
                        value={subject.type}
                        onChange={(e) => handleSubjectChange(index, e)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900"
                        required
                      >
                        <option value="core">Core</option>
                        <option value="lab">Lab</option>
                        <option value="elective">Elective</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Duration (hours) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="totalDuration"
                        value={subject.totalDuration}
                        onChange={(e) => handleSubjectChange(index, e)}
                        className={`w-full px-3 py-2 border ${
                          errors.subjects[index]?.totalDuration 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-indigo-500'
                        } rounded-md shadow-sm focus:outline-none focus:ring-2 bg-white text-gray-900`}
                        min="1"
                        required
                      />
                      {errors.subjects[index]?.totalDuration && (
                        <p className="mt-1 text-sm text-red-600">{errors.subjects[index].totalDuration}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Weekly hours: {calculateWeeklyHours(subject.totalDuration)}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={subject.description}
                      onChange={(e) => handleSubjectChange(index, e)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900"
                      rows={3}
                      placeholder="Enter subject description..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-end p-6 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : 'Create Subjects'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSubjectModal; 