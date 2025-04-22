import React, { useState } from 'react';
import { 
  IconX, 
  IconCopy, 
  IconAlertCircle 
} from '@tabler/icons-react';
import { adminAPI } from '../../utils/api';
import { useSnackbar } from '../../contexts/SnackbarContext';

interface CopySubjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (subjects: any[]) => void;
  academicYears: string[];
}

const CopySubjectsModal: React.FC<CopySubjectsModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  academicYears 
}) => {
  const { showSnackbar } = useSnackbar();
  
  const [formData, setFormData] = useState({
    sourceYear: '',
    targetYear: '',
    year: 'First',
    semester: 1
  });
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle year selection - automatically update semester to valid range
    if (name === 'year') {
      let defaultSemester = 1;
      if (value === 'Second') {
        defaultSemester = 3;
      } else if (value === 'Third') {
        defaultSemester = 5;
      }
      
      setFormData({
        ...formData,
        [name]: value,
        semester: defaultSemester
      });
      return;
    }
    
    setFormData({
      ...formData,
      [name]: name === 'semester' ? parseInt(value) : value
    });
    
    // Clear errors when field is changed
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };
  
  // Validate form inputs
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.sourceYear) {
      newErrors.sourceYear = 'Source academic year is required';
    }
    
    if (!formData.targetYear) {
      newErrors.targetYear = 'Target academic year is required';
    }
    
    if (formData.sourceYear === formData.targetYear) {
      newErrors.targetYear = 'Source and target years must be different';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
  
  // Format years for display
  const formatYearForDisplay = (year: string): string => {
    // If not already in YYYY-YY format, format it
    if (!/^\d{4}-\d{2}$/.test(year)) {
      return formatAcademicYear(year);
    }
    return year;
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
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Validate form
      if (!formData.sourceYear || !formData.targetYear || !formData.year || !formData.semester) {
        showSnackbar('Please fill all required fields', 'error');
        setIsSubmitting(false);
        return;
      }
      
      // Use formatted academic years
      const copyData = {
        ...formData,
        sourceYear: formatAcademicYear(formData.sourceYear),
        targetYear: formatAcademicYear(formData.targetYear)
      };
      
      const response = await adminAPI.copySubjects(copyData);
      
      if (response.success) {
        // Show success message in snackbar
        showSnackbar(`Successfully copied ${response.subjects?.length || 0} subjects`, 'success');
        
        // Call onSuccess callback with copied subjects
        onSuccess(response.subjects || []);
        
        // Reset form and close modal
        setFormData({
          sourceYear: '',
          targetYear: '',
          year: 'First',
          semester: 1
        });
        
        onClose();
      } else {
        showSnackbar(response.message || 'Failed to copy subjects', 'error');
      }
    } catch (error: any) {
      console.error('Error copying subjects:', error);
      showSnackbar(error.message || 'An unexpected error occurred', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      sourceYear: '',
      targetYear: '',
      year: 'First',
      semester: 1
    });
    setErrors({});
    setSubmitError(null);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <IconCopy size={20} className="mr-2" />
            Copy Subjects
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
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Source Academic Year *
            </label>
            <select
              name="sourceYear"
              value={formData.sourceYear}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${
                errors.sourceYear 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'
              } rounded-md shadow-sm focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
            >
              <option value="">Select Source Year</option>
              {academicYears.map(year => (
                <option key={`source-${year}`} value={year}>
                  {formatYearForDisplay(year)}
                </option>
              ))}
            </select>
            {errors.sourceYear && (
              <p className="mt-1 text-sm text-red-600">{errors.sourceYear}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Academic Year *
            </label>
            <select
              name="targetYear"
              value={formData.targetYear}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${
                errors.targetYear 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'
              } rounded-md shadow-sm focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
            >
              <option value="">Select Target Year</option>
              {academicYears.map(year => (
                <option key={`target-${year}`} value={year}>
                  {formatYearForDisplay(year)}
                </option>
              ))}
            </select>
            {errors.targetYear && (
              <p className="mt-1 text-sm text-red-600">{errors.targetYear}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Format: YYYY-YY (e.g., 2023-24)
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Year *
              </label>
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
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
                value={formData.semester}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {getAvailableSemesters(formData.year).map(semesterNumber => (
                  <option key={semesterNumber} value={semesterNumber}>
                    {semesterNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <IconAlertCircle size={20} className="text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  This will copy all subjects from the selected year and semester in the source academic year to the same year and semester in the target academic year. Existing subjects in the target year will not be overwritten.
                </p>
              </div>
            </div>
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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Copy Subjects
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CopySubjectsModal; 