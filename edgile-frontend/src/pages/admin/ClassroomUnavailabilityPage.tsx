import React, { useState, useEffect } from 'react';
import DashboardWrapper from '../../components/DashboardWrapper';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI } from '../../utils/api';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IconArrowLeft,
  IconCalendarEvent,
  IconAlertCircle,
  IconCheck,
  IconAlertTriangle,
  IconInfoCircle,
  IconArrowRight
} from '@tabler/icons-react';

interface Classroom {
  _id: string;
  name: string;
  floor: number;
  capacity: number;
  status: string;
}

interface UnavailabilityFormData {
  startDate: string;
  endDate: string;
  reason: string;
  substituteClassroomId: string;
}

interface FormErrors {
  startDate?: string;
  endDate?: string;
  reason?: string;
}

const ClassroomUnavailabilityPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  // State variables
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [substitutes, setSubstitutes] = useState<Classroom[]>([]);
  const [formData, setFormData] = useState<UnavailabilityFormData>({
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    reason: '',
    substituteClassroomId: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [substitutesLoading, setSubstitutesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  
  // Load classroom data
  useEffect(() => {
    const fetchClassroom = async () => {
      if (!id) {
        navigate('/admin/classrooms');
        return;
      }
      
      try {
        setLoading(true);
        const response = await adminAPI.getClassroomById(id);
        
        if (!response || !response.success) {
          navigate('/admin/classrooms');
          return;
        }
        
        setClassroom(response.classroom);
        setLoading(false);
      } catch (error) {
        console.error('Error loading classroom:', error);
        navigate('/admin/classrooms');
      }
    };
    
    fetchClassroom();
  }, [id, navigate]);
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is updated
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    
    // Load substitute suggestions if start and end dates are set
    if ((name === 'startDate' || name === 'endDate') && formData.startDate && formData.endDate) {
      loadSubstitutesSuggestions();
    }
  };
  
  // Load substitute classroom suggestions
  const loadSubstitutesSuggestions = async () => {
    if (!id || !formData.startDate) return;
    
    try {
      setSubstitutesLoading(true);
      const response = await adminAPI.getSubstituteClassroomSuggestions(
        id,
        formData.startDate,
        formData.endDate
      );
      
      if (response && Array.isArray(response) && response.length > 0) {
        setSubstitutes(response);
      } else {
        setSubstitutes([]);
      }
    } catch (error) {
      console.error('Error loading substitute suggestions:', error);
      setSubstitutes([]);
    } finally {
      setSubstitutesLoading(false);
    }
  };
  
  // Validate form data
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Validate start date
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    } else {
      const startDate = new Date(formData.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (startDate < today) {
        newErrors.startDate = 'Start date cannot be in the past';
      }
    }
    
    // Validate end date if provided
    if (formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      if (endDate < startDate) {
        newErrors.endDate = 'End date must be after start date';
      }
    }
    
    // Validate reason
    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    } else if (formData.reason.length > 200) {
      newErrors.reason = 'Reason cannot exceed 200 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset status messages
    setSubmitError(null);
    setSubmitSuccess(null);
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Prepare data
      const unavailabilityData = {
        classroomId: id || '',
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        reason: formData.reason.trim(),
        substituteClassroomId: formData.substituteClassroomId || undefined
      };
      
      console.log("Submitting unavailability data:", unavailabilityData);
      
      // Create unavailability record
      const response = await adminAPI.markClassroomUnavailable(unavailabilityData);
      
      if (response && response.success) {
        setSubmitSuccess(response.message || 'Classroom marked as unavailable successfully');
        
        // Navigate back to classrooms list after a short delay
        setTimeout(() => {
          navigate('/admin/classrooms');
        }, 1500);
      } else {
        setSubmitError(response?.message || 'An error occurred');
      }
    } catch (error: any) {
      console.error('Error marking classroom as unavailable:', error);
      setSubmitError(error.message || 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/classrooms')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <IconArrowLeft size={20} className="mr-1" />
            Back to Classrooms
          </button>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <IconAlertTriangle size={28} className="mr-2 text-yellow-500" />
              Mark Classroom as Unavailable
            </h1>
          </div>
          
          {/* Loading Indicator */}
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          )}
          
          {/* Classroom Info */}
          {classroom && (
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {classroom.name}
              </h2>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>Floor: {classroom.floor} | Capacity: {classroom.capacity}</p>
                <p className="mt-1">
                  Current Status: 
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    classroom.status === 'available' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : classroom.status === 'maintenance'
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {classroom.status.charAt(0).toUpperCase() + classroom.status.slice(1)}
                  </span>
                </p>
              </div>
            </div>
          )}
          
          {/* Error or Success Messages */}
          {submitError && (
            <div className="mx-6 mt-6 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-md flex items-center">
              <IconAlertCircle size={24} className="mr-2" />
              <span>{submitError}</span>
            </div>
          )}
          
          {submitSuccess && (
            <div className="mx-6 mt-6 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 p-4 rounded-md flex items-center">
              <IconCheck size={24} className="mr-2" />
              <span>{submitSuccess}</span>
            </div>
          )}
          
          {/* Information Notice */}
          <div className="mx-6 mt-6 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-4 rounded-md flex">
            <IconInfoCircle size={24} className="mr-2 flex-shrink-0 mt-1" />
            <div>
              <p className="font-medium">What happens when a classroom is marked unavailable?</p>
              <ul className="mt-2 ml-4 list-disc text-sm">
                <li>The classroom will not be available for new bookings during the specified period</li>
                <li>Existing bookings may be affected and will need to be rescheduled</li>
                <li>If you select a substitute classroom, affected classes may be automatically reassigned</li>
                <li>You can set a temporary unavailability (with end date) or indefinite (no end date)</li>
              </ul>
            </div>
          </div>
          
          {/* Form */}
          {!loading && classroom && (
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                      errors.startDate ? 'border-red-500 dark:border-red-500' : ''
                    }`}
                    disabled={submitting}
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.startDate}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date <span className="text-gray-500">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                      errors.endDate ? 'border-red-500 dark:border-red-500' : ''
                    }`}
                    disabled={submitting}
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.endDate}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Leave blank for indefinite unavailability
                  </p>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reason for Unavailability *
                  </label>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    placeholder="e.g., Renovation, Equipment installation, Water damage..."
                    rows={3}
                    className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                      errors.reason ? 'border-red-500 dark:border-red-500' : ''
                    }`}
                    disabled={submitting}
                  />
                  {errors.reason && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reason}</p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Substitute Classroom <span className="text-gray-500">(Optional)</span>
                  </label>
                  
                  {substitutesLoading ? (
                    <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mt-2">
                      <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-indigo-500 rounded-full mr-2"></div>
                      <span>Finding substitute classrooms...</span>
                    </div>
                  ) : substitutes.length > 0 ? (
                    <div>
                      <select
                        name="substituteClassroomId"
                        value={formData.substituteClassroomId}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600"
                        disabled={submitting}
                      >
                        <option value="">-- Select a substitute classroom --</option>
                        {substitutes.map(sub => (
                          <option key={sub._id} value={sub._id}>
                            {sub.name} (Floor: {sub.floor}, Capacity: {sub.capacity})
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                        <IconInfoCircle size={14} className="mr-1" />
                        These classrooms are available during the specified period and have similar capacity
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-400">
                        {formData.startDate && formData.endDate ? (
                          <div className="flex items-center">
                            <IconAlertTriangle size={18} className="mr-2 text-orange-500" />
                            <span>No substitute classrooms are available for the selected dates</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <IconCalendarEvent size={18} className="mr-2 text-blue-500" />
                            <span>Enter both start and end dates to see substitute suggestions</span>
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Without a substitute, affected classes will need to be rescheduled manually
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-8 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/admin/classrooms')}
                  className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
                  disabled={submitting}
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200 flex items-center"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      Mark as Unavailable
                      <IconArrowRight size={18} className="ml-1" />
                    </span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </DashboardWrapper>
  );
};

export default ClassroomUnavailabilityPage; 