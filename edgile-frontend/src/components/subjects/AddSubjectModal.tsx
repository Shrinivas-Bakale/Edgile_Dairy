import React, { useState, useEffect } from 'react';
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
}

interface AddSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (subjects: any[]) => void;
  academicYears: string[];
  currentAcademicYear: string;
}

const AddSubjectModal: React.FC<AddSubjectModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  academicYears,
  currentAcademicYear
}) => {
  const { showSnackbar } = useSnackbar();

  // Common data shared across all subjects
  const [commonData, setCommonData] = useState({
    year: 'First',
    semester: 1,
    academicYear: new Date().getFullYear().toString() // Default to current year
  });
  
  // Multiple subject entries
  const [subjects, setSubjects] = useState<Subject[]>([{
    subjectName: '',
    subjectCode: '',
    type: 'core',
    totalDuration: 48
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
  
  // Handle common data changes (year, semester, academicYear)
  const handleCommonChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle year selection - automatically update semester to valid range
    if (name === 'year') {
      let defaultSemester = 1;
      if (value === 'Second') {
        defaultSemester = 3;
      } else if (value === 'Third') {
        defaultSemester = 5;
      }
      
      setCommonData({
        ...commonData,
        [name]: value,
        semester: defaultSemester
      });
      return;
    }
    
    // Handle number fields
    if (type === 'number' && name === 'academicYear') {
      // Ensure academicYear is a valid year
      const year = parseInt(value);
      const currentYear = new Date().getFullYear();
      
      // Allow years between 2000 and current year + 10
      if (year >= 2000 && year <= currentYear + 10) {
        setCommonData({
          ...commonData,
          [name]: value
        });
      }
    } else {
      setCommonData({
        ...commonData,
        [name]: value
      });
    }
    
    // Clear errors when field is changed
    if (errors.common[name]) {
      setErrors({
        ...errors,
        common: {
          ...errors.common,
          [name]: ''
        }
      });
    }
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
        return [1, 2];
    }
  };
  
  // Handle subject data changes
  const handleSubjectChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        totalDuration: 48
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
    if (subjects.length === 1) {
      // Don't remove the last entry, just clear it
      setSubjects([{
        subjectName: '',
        subjectCode: '',
        type: 'core',
        totalDuration: 48
      }]);
      
      setErrors({
        ...errors,
        subjects: {'0': {}}
      });
      
      return;
    }
    
    const updatedSubjects = subjects.filter((_, i) => i !== index);
    setSubjects(updatedSubjects);
    
    // Update errors object
    const updatedSubjectErrors = { ...errors.subjects };
    delete updatedSubjectErrors[index.toString()];
    
    // Reindex the errors
    const reindexedErrors: { [key: string]: { [key: string]: string } } = {};
    updatedSubjects.forEach((_, i) => {
      const oldIndex = i >= index ? (i + 1).toString() : i.toString();
      reindexedErrors[i.toString()] = updatedSubjectErrors[oldIndex] || {};
    });
    
    setErrors({
      ...errors,
      subjects: reindexedErrors
    });
  };
  
  // Validate form inputs
  const validateForm = () => {
    const newErrors = {
      common: {} as { [key: string]: string },
      subjects: {} as { [key: string]: { [key: string]: string } }
    };
    
    // Validate common data
    if (!commonData.academicYear) {
      newErrors.common.academicYear = 'Academic year is required';
    }
    
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
  
  // Format years for display
  const formatYearForDisplay = (year: string): string => {
    // If not already in YYYY-YY format, format it
    if (!/^\d{4}-\d{2}$/.test(year)) {
      return formatAcademicYear(year);
    }
    return year;
  };
  
  // Set academicYear on component mount
  useEffect(() => {
    if (currentAcademicYear) {
      setCommonData(prev => ({
        ...prev,
        academicYear: currentAcademicYear
      }));
    }
  }, [currentAcademicYear]);
  
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
          semester: parseInt(commonData.semester.toString()),
          academicYear: formatAcademicYear(commonData.academicYear)
        };
        
        const response = await adminAPI.createSubject(subjectData);
        
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
      semester: 1,
      academicYear: new Date().getFullYear().toString()
    });
    
    setSubjects([{
      subjectName: '',
      subjectCode: '',
      type: 'core',
      totalDuration: 48
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
  
  // Format academic year to ensure YYYY-YY format
  const formatAcademicYear = (year: string): string => {
    // If already in correct format, return as is
    if (/^\d{4}-\d{2}$/.test(year)) {
      return year;
    }
    
    // If single year format, convert to YYYY-YY
    if (/^\d{4}$/.test(year)) {
      const startYear = parseInt(year);
      const endYear = (startYear + 1) % 100; // Get last two digits of the next year
      return `${startYear}-${endYear.toString().padStart(2, '0')}`;
    }
    
    // If old format YYYY-YYYY, convert to YYYY-YY
    if (/^\d{4}-\d{4}$/.test(year)) {
      const [startYear, endYear] = year.split('-');
      return `${startYear}-${endYear.slice(2)}`;
    }
    
    return year; // Return as is if format is unrecognized
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 my-8">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <IconPlus size={20} className="mr-2" />
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
        
        <form onSubmit={handleSubmit} className="p-6">
          {submitError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-start">
              <IconAlertCircle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}
          
          {/* Common fields (Year, Semester, Academic Year) */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">
              Common Settings
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Year *
                </label>
                <select
                  name="year"
                  value={commonData.year}
                  onChange={handleCommonChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="First">First</option>
                  <option value="Second">Second</option>
                  <option value="Third">Third</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Semester *
                </label>
                <select
                  name="semester"
                  value={commonData.semester}
                  onChange={handleCommonChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {getAvailableSemesters(commonData.year).map(semesterNumber => (
                    <option key={semesterNumber} value={semesterNumber}>
                      {semesterNumber}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Academic Year *
                </label>
                <select
                  name="academicYear"
                  value={commonData.academicYear}
                  onChange={handleCommonChange}
                  className={`w-full px-3 py-2 border ${
                    errors.common.academicYear 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'
                  } rounded-md shadow-sm focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                >
                  {academicYears.map(year => (
                    <option key={year} value={year}>
                      {formatYearForDisplay(year)}
                    </option>
                  ))}
                  <option value={new Date().getFullYear().toString()}>
                    {formatYearForDisplay(new Date().getFullYear().toString())}
                  </option>
                </select>
                {errors.common.academicYear && (
                  <p className="mt-1 text-sm text-red-600">{errors.common.academicYear}</p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Format: YYYY-YY (e.g., 2023-24)
                </p>
              </div>
            </div>
          </div>
          
          {/* Subject entries */}
          <div className="mb-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Subject Details
              </h3>
              <button
                type="button"
                onClick={addSubjectEntry}
                className="flex items-center text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                <IconPlus size={16} className="mr-1" />
                Add More
              </button>
            </div>
            
            {subjects.map((subject, index) => (
              <div 
                key={index} 
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg relative"
              >
                {subjects.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSubjectEntry(index)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 focus:outline-none"
                  >
                    <IconTrash size={18} />
                  </button>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Subject Name *
                    </label>
                    <input
                      type="text"
                      name="subjectName"
                      value={subject.subjectName}
                      onChange={(e) => handleSubjectChange(index, e)}
                      className={`w-full px-3 py-2 border ${
                        errors.subjects[index]?.subjectName 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'
                      } rounded-md shadow-sm focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                      placeholder="e.g., Data Structures and Algorithms"
                    />
                    {errors.subjects[index]?.subjectName && (
                      <p className="mt-1 text-sm text-red-600">{errors.subjects[index].subjectName}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Subject Code *
                    </label>
                    <input
                      type="text"
                      name="subjectCode"
                      value={subject.subjectCode}
                      onChange={(e) => handleSubjectChange(index, e)}
                      className={`w-full px-3 py-2 border ${
                        errors.subjects[index]?.subjectCode 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'
                      } rounded-md shadow-sm focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                      placeholder="e.g., CS201"
                    />
                    {errors.subjects[index]?.subjectCode && (
                      <p className="mt-1 text-sm text-red-600">{errors.subjects[index].subjectCode}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type *
                    </label>
                    <select
                      name="type"
                      value={subject.type}
                      onChange={(e) => handleSubjectChange(index, e)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="core">Core</option>
                      <option value="lab">Lab</option>
                      <option value="elective">Elective</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Total Duration (hours) *
                    </label>
                    <input
                      type="number"
                      name="totalDuration"
                      value={subject.totalDuration}
                      onChange={(e) => handleSubjectChange(index, e)}
                      min="1"
                      className={`w-full px-3 py-2 border ${
                        errors.subjects[index]?.totalDuration 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'
                      } rounded-md shadow-sm focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                    />
                    {errors.subjects[index]?.totalDuration ? (
                      <p className="mt-1 text-sm text-red-600">{errors.subjects[index].totalDuration}</p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Weekly hours: {calculateWeeklyHours(subject.totalDuration)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md mr-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Create Subjects ({subjects.length})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSubjectModal; 