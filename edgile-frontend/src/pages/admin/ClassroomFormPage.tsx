import React, { useState, useEffect } from 'react';
import DashboardWrapper from '../../components/DashboardWrapper';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI } from '../../utils/api';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IconArrowLeft,
  IconBuildingSkyscraper,
  IconCheck,
  IconUser,
  IconAlertCircle,
  IconTrash
} from '@tabler/icons-react';

interface ClassroomFormData {
  name: string;
  floor: number | string;
  capacity: number | string;
  status: 'available' | 'unavailable' | 'maintenance';
}

interface ClassroomResponse {
  _id: string;
  name: string;
  floor: number;
  capacity: number;
  status: 'available' | 'unavailable' | 'maintenance';
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  classroom?: ClassroomResponse;
}

interface FormErrors {
  name?: string;
  floor?: string;
  capacity?: string;
  status?: string;
}

const ClassroomFormPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  
  // State variables
  const [formData, setFormData] = useState<ClassroomFormData>({
    name: '',
    floor: '',
    capacity: '',
    status: 'available'
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(isEditMode); // Set loading to true if in edit mode
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  
  // Load classroom data if in edit mode
  useEffect(() => {
    const fetchClassroom = async () => {
      if (!isEditMode || !id) return;
      
      try {
        setLoading(true);
        console.log("Fetching classroom data for ID:", id);
        
        // Add a retry mechanism for fetching the classroom
        let classroom = null;
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount <= maxRetries && !classroom) {
          try {
            const response = await adminAPI.getClassroomById(id);
            
            // For debugging - log the response
            console.log(`Attempt ${retryCount + 1}: API response for classroom:`, response);
            
            // Ensure we have a valid response
            if (response && typeof response === 'object') {
              // Check if we have the necessary fields
              const responseObj = response as any;
              if (responseObj.name && (typeof responseObj.floor !== 'undefined') && 
                  (typeof responseObj.capacity !== 'undefined') && responseObj.status) {
                classroom = responseObj;
                break;
              }
            }
            
            // If we reach here, the response didn't have the expected structure
            console.warn(`Attempt ${retryCount + 1}: Response structure not as expected:`, response);
            retryCount++;
            
            if (retryCount <= maxRetries) {
              // Wait before retrying (increasing delay for each retry)
              await new Promise(resolve => setTimeout(resolve, retryCount * 500));
            }
          } catch (error) {
            console.error(`Attempt ${retryCount + 1}: Error fetching classroom:`, error);
            retryCount++;
            
            if (retryCount <= maxRetries) {
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, retryCount * 500));
            } else {
              throw error; // Rethrow the error after all retries failed
            }
          }
        }
        
        if (!classroom) {
          console.error("No classroom found with ID:", id);
          setSubmitError("Could not load classroom data. The classroom may have been deleted or you may not have permission to view it.");
          // Don't navigate away immediately, let the user see the error
          return;
        }
        
        console.log("Classroom data successfully loaded:", classroom);
        setFormData({
          name: (classroom as any).name || '',
          floor: (classroom as any).floor || '',
          capacity: (classroom as any).capacity || '',
          status: (classroom as any).status || 'available'
        });
      } catch (error) {
        console.error('Error loading classroom:', error);
        setSubmitError('Failed to load classroom data. Please try again or contact support if the problem persists.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchClassroom();
  }, [id, isEditMode, navigate]);
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is updated
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  // Validate form data
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Validate name - safely check for undefined
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Classroom name is required';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name cannot exceed 50 characters';
    }
    
    // Validate floor
    if (formData.floor === '' || formData.floor === undefined) {
      newErrors.floor = 'Floor number is required';
    } else {
      const floorNum = Number(formData.floor);
      if (isNaN(floorNum) || floorNum < 1) {
        newErrors.floor = 'Floor must be a positive number';
      }
    }
    
    // Validate capacity
    if (formData.capacity === '' || formData.capacity === undefined) {
      newErrors.capacity = 'Capacity is required';
    } else {
      const capacityNum = Number(formData.capacity);
      if (isNaN(capacityNum) || capacityNum < 1) {
        newErrors.capacity = 'Capacity must be a positive number';
      }
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
      const classroomData = {
        name: formData.name.trim(),
        floor: Number(formData.floor),
        capacity: Number(formData.capacity),
        status: formData.status
      };
      
      console.log(`${isEditMode ? 'Updating' : 'Creating'} classroom with data:`, classroomData);
      
      // Create or update classroom
      let response: ApiResponse;
      if (isEditMode && id) {
        response = await adminAPI.updateClassroom(id, classroomData) as ApiResponse;
      } else {
        response = await adminAPI.createClassroom(classroomData) as ApiResponse;
      }
      
      console.log("API response:", response);
      
      if (response && response.success) {
        setSubmitSuccess(response.message || `Classroom ${isEditMode ? 'updated' : 'created'} successfully`);
        
        // Navigate back to classrooms list after a short delay
        setTimeout(() => {
          navigate('/admin/classrooms');
        }, 1500);
      } else {
        setSubmitError((response && response.message) || 'An error occurred while saving the classroom');
      }
    } catch (error: any) {
      console.error('Error saving classroom:', error);
      setSubmitError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle classroom deletion
  const handleDelete = async () => {
    if (!isEditMode || !id) return;
    
    try {
      setSubmitting(true);
      console.log("Deleting classroom with ID:", id);
      
      const response = await adminAPI.deleteClassroom(id) as ApiResponse;
      console.log("Delete API response:", response);
      
      if (response && response.success) {
        setSubmitSuccess(response.message || 'Classroom deleted successfully');
        
        // Navigate back to classrooms list after a short delay
        setTimeout(() => {
          navigate('/admin/classrooms');
        }, 1500);
      } else {
        setSubmitError((response && response.message) || 'Failed to delete classroom');
        setDeleteConfirm(false);
      }
    } catch (error: any) {
      console.error('Error deleting classroom:', error);
      setSubmitError(error.message || 'An unexpected error occurred while deleting the classroom');
      setDeleteConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle retry loading
  const handleRetryLoading = () => {
    setSubmitError(null);
    setLoading(true);
    
    // Refresh the page to retry loading
    window.location.reload();
  };
  
  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/classrooms')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <IconArrowLeft size={20} className="mr-1" />
            Back to Classrooms
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Classroom' : 'Add New Classroom'}
            </h1>
          </div>
          
          {/* Loading Indicator */}
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          )}
          
          {/* Error Message with Retry Button */}
          {submitError && isEditMode && !loading && (
            <div className="mx-6 mt-6 bg-red-100 text-red-800 p-4 rounded-md">
              <div className="flex items-center mb-2">
                <IconAlertCircle size={24} className="mr-2" />
                <span className="font-medium">Error</span>
              </div>
              <p className="mb-4">{submitError}</p>
              <div className="flex space-x-3">
                <button 
                  onClick={handleRetryLoading}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                >
                  Retry Loading
                </button>
                <button
                  onClick={() => navigate('/admin/classrooms')}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md transition-colors"
                >
                  Back to Classrooms
                </button>
              </div>
            </div>
          )}
          
          {/* Regular Error Message */}
          {submitError && (!isEditMode || loading) && (
            <div className="mx-6 mt-6 bg-red-100 text-red-800 p-4 rounded-md flex items-center">
              <IconAlertCircle size={24} className="mr-2" />
              <span>{submitError}</span>
            </div>
          )}
          
          {/* Success Message */}
          {submitSuccess && (
            <div className="mx-6 mt-6 bg-green-100 text-green-800 p-4 rounded-md flex items-center">
              <IconCheck size={24} className="mr-2" />
              <span>{submitSuccess}</span>
            </div>
          )}
          
          {/* Form */}
          {!loading && !submitError && (
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Classroom Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Room 302, Lab A"
                    className={`w-full p-2 border rounded-md ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    } focus:ring-indigo-500 focus:border-indigo-500`}
                    disabled={submitting}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Choose a unique, descriptive name for this classroom
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Floor Number *
                  </label>
                  <input
                    type="number"
                    name="floor"
                    value={formData.floor}
                    onChange={handleChange}
                    placeholder="e.g., 3"
                    min="1"
                    className={`w-full p-2 border rounded-md ${
                      errors.floor ? 'border-red-500' : 'border-gray-300'
                    } focus:ring-indigo-500 focus:border-indigo-500`}
                    disabled={submitting}
                  />
                  {errors.floor && (
                    <p className="mt-1 text-sm text-red-600">{errors.floor}</p>
                  )}
                  <div className="flex items-center mt-1 text-xs text-gray-500">
                    <IconBuildingSkyscraper size={14} className="mr-1" />
                    <span>Floor number must be a positive integer</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacity *
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleChange}
                    placeholder="e.g., 40"
                    min="1"
                    className={`w-full p-2 border rounded-md ${
                      errors.capacity ? 'border-red-500' : 'border-gray-300'
                    } focus:ring-indigo-500 focus:border-indigo-500`}
                    disabled={submitting}
                  />
                  {errors.capacity && (
                    <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>
                  )}
                  <div className="flex items-center mt-1 text-xs text-gray-500">
                    <IconUser size={14} className="mr-1" />
                    <span>Maximum number of students this room can accommodate</span>
                  </div>
                </div>
                
                {isEditMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full p-2 border rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={submitting}
                    >
                      <option value="available">Available</option>
                      <option value="unavailable">Unavailable</option>
                      <option value="maintenance">Under Maintenance</option>
                    </select>
                  </div>
                )}
              </div>
              
              <div className="mt-8 flex flex-wrap gap-4 justify-between">
                <div>
                  {isEditMode && (
                    <div>
                      {!deleteConfirm ? (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(true)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
                          disabled={submitting}
                        >
                          <IconTrash size={18} className="inline mr-1" />
                          Delete Classroom
                        </button>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-red-600">Confirm deletion?</span>
                          <button
                            type="button"
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md font-medium text-sm transition-colors duration-200"
                            disabled={submitting}
                          >
                            Yes, Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(false)}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded-md font-medium text-sm transition-colors duration-200"
                            disabled={submitting}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/classrooms')}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md font-medium transition-colors duration-200"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors duration-200"
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
                      <span>
                        {isEditMode ? 'Update Classroom' : 'Create Classroom'}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </DashboardWrapper>
  );
};

export default ClassroomFormPage; 