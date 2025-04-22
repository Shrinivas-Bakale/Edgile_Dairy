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
import { useDarkMode } from '../../contexts/DarkModeContext';

interface ClassroomFormData {
  name: string;
  floor: number | string;
  capacity: number | string;
  status: 'available' | 'unavailable' | 'maintenance';
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
  const { isDarkMode } = useDarkMode();
  const isEditMode = !!id;
  
  // State variables
  const [formData, setFormData] = useState<ClassroomFormData>({
    name: '',
    floor: '',
    capacity: '',
    status: 'available'
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  
  // Load classroom data if in edit mode
  useEffect(() => {
    const fetchClassroom = async () => {
      if (!isEditMode) return;
      
      try {
        setLoading(true);
        const classroom = await adminAPI.getClassroomById(id);
        
        if (!classroom) {
          navigate('/admin/classrooms');
          return;
        }
        
        setFormData({
          name: classroom.name,
          floor: classroom.floor,
          capacity: classroom.capacity,
          status: classroom.status
        });
        setLoading(false);
      } catch (error) {
        console.error('Error loading classroom:', error);
        navigate('/admin/classrooms');
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
    
    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Classroom name is required';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name cannot exceed 50 characters';
    }
    
    // Validate floor
    if (!formData.floor) {
      newErrors.floor = 'Floor number is required';
    } else {
      const floorNum = Number(formData.floor);
      if (isNaN(floorNum) || floorNum < 1) {
        newErrors.floor = 'Floor must be a positive number';
      }
    }
    
    // Validate capacity
    if (!formData.capacity) {
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
        ...(isEditMode && { status: formData.status })
      };
      
      // Create or update classroom
      let response;
      if (isEditMode) {
        response = await adminAPI.updateClassroom(id, classroomData);
      } else {
        response = await adminAPI.createClassroom(classroomData);
      }
      
      if (response.success) {
        setSubmitSuccess(response.message || `Classroom ${isEditMode ? 'updated' : 'created'} successfully`);
        
        // Navigate back to classrooms list after a short delay
        setTimeout(() => {
          navigate('/admin/classrooms');
        }, 1500);
      } else {
        setSubmitError(response.message || 'An error occurred');
      }
    } catch (error: any) {
      console.error('Error saving classroom:', error);
      setSubmitError(error.message || 'An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle classroom deletion
  const handleDelete = async () => {
    if (!isEditMode || !id) return;
    
    try {
      setSubmitting(true);
      const response = await adminAPI.deleteClassroom(id);
      
      if (response.success) {
        setSubmitSuccess(response.message || 'Classroom deleted successfully');
        
        // Navigate back to classrooms list after a short delay
        setTimeout(() => {
          navigate('/admin/classrooms');
        }, 1500);
      } else {
        setSubmitError(response.message || 'Failed to delete classroom');
        setDeleteConfirm(false);
      }
    } catch (error: any) {
      console.error('Error deleting classroom:', error);
      setSubmitError(error.message || 'An unexpected error occurred');
      setDeleteConfirm(false);
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditMode ? 'Edit Classroom' : 'Add New Classroom'}
            </h1>
          </div>
          
          {/* Loading Indicator */}
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
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
          
          {/* Form */}
          {!loading && (
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Classroom Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Room 302, Lab A"
                    className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                      errors.name ? 'border-red-500 dark:border-red-500' : ''
                    }`}
                    disabled={submitting}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Choose a unique, descriptive name for this classroom
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Floor Number *
                  </label>
                  <input
                    type="number"
                    name="floor"
                    value={formData.floor}
                    onChange={handleChange}
                    placeholder="e.g., 3"
                    min="1"
                    className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                      errors.floor ? 'border-red-500 dark:border-red-500' : ''
                    }`}
                    disabled={submitting}
                  />
                  {errors.floor && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.floor}</p>
                  )}
                  <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <IconBuildingSkyscraper size={14} className="mr-1" />
                    <span>Floor number must be a positive integer</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Capacity *
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleChange}
                    placeholder="e.g., 40"
                    min="1"
                    className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                      errors.capacity ? 'border-red-500 dark:border-red-500' : ''
                    }`}
                    disabled={submitting}
                  />
                  {errors.capacity && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.capacity}</p>
                  )}
                  <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <IconUser size={14} className="mr-1" />
                    <span>Maximum number of students this room can accommodate</span>
                  </div>
                </div>
                
                {isEditMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600"
                      disabled={submitting}
                    >
                      <option value="available">Available</option>
                      <option value="unavailable">Unavailable</option>
                      <option value="maintenance">Under Maintenance</option>
                    </select>
                  </div>
                )}
              </div>
              
              <div className="mt-8 flex justify-between">
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
                        <div className="flex items-center">
                          <span className="mr-2 text-red-600 dark:text-red-400">Confirm deletion?</span>
                          <button
                            type="button"
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md font-medium text-sm transition-colors duration-200 mr-2"
                            disabled={submitting}
                          >
                            Yes, Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(false)}
                            className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-white px-3 py-1 rounded-md font-medium text-sm transition-colors duration-200"
                            disabled={submitting}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-4">
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