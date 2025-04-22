import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardWrapper from '../../components/DashboardWrapper';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI } from '../../utils/api';
import { 
  IconBook, 
  IconArrowLeft,
  IconDeviceFloppy as IconSave,
  IconTrash,
  IconAlertCircle,
  IconUserCheck,
  IconCheck,
  IconClock,
  IconCalendar
} from '@tabler/icons-react';

interface Subject {
  _id: string;
  subjectName: string;
  subjectCode: string;
  type: 'core' | 'lab' | 'elective';
  totalDuration: number;
  weeklyHours: number;
  year: string;
  semester: number;
  academicYear: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

interface FacultyPreference {
  _id: string;
  faculty: {
    _id: string;
    name: string;
    email: string;
    department?: string;
  };
  comment?: string;
  createdAt: string;
}

const SubjectEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State for subject data
  const [subject, setSubject] = useState<Subject | null>(null);
  const [facultyPreferences, setFacultyPreferences] = useState<FacultyPreference[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    subjectName: '',
    subjectCode: '',
    type: 'core' as 'core' | 'lab' | 'elective',
    totalDuration: 48,
    year: 'First',
    semester: 1
  });
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Load subject data
  useEffect(() => {
    const fetchSubject = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await adminAPI.getSubjectById(id);
        
        if (response.success && response.subject) {
          setSubject(response.subject);
          setFacultyPreferences(response.facultyPreferences || []);
          
          // Initialize form with subject data
          setFormData({
            subjectName: response.subject.subjectName,
            subjectCode: response.subject.subjectCode,
            type: response.subject.type,
            totalDuration: response.subject.totalDuration,
            year: response.subject.year,
            semester: response.subject.semester
          });
        } else {
          setError('Failed to load subject details');
        }
      } catch (err: any) {
        console.error('Error fetching subject:', err);
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubject();
  }, [id]);
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData({
        ...formData,
        [name]: parseInt(value) || 0
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  // Calculate weekly hours based on total duration
  const calculateWeeklyHours = () => {
    return Math.ceil(formData.totalDuration / 12);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id || !subject) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await adminAPI.updateSubject(id, formData);
      
      if (response.success) {
        setSubject(response.subject);
        setSuccess('Subject updated successfully');
        
        // Clear success message after a delay
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        setError(response.message || 'Failed to update subject');
      }
    } catch (err: any) {
      console.error('Error updating subject:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle archive (soft delete)
  const handleArchive = async () => {
    if (!id || !subject) return;
    
    const confirmArchive = window.confirm(
      'Are you sure you want to archive this subject? It will no longer appear in default views.'
    );
    
    if (!confirmArchive) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await adminAPI.archiveSubject(id);
      
      if (response.success) {
        // Navigate back to subjects list with success message
        navigate('/admin/subjects', { 
          state: { message: 'Subject archived successfully' } 
        });
      } else {
        setError(response.message || 'Failed to archive subject');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error archiving subject:', err);
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };
  
  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-6">
        {/* Back button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/subjects')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <IconArrowLeft size={20} className="mr-1" />
            Back to Subjects
          </button>
        </div>
        
        {/* Title */}
        <div className="flex flex-wrap justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <IconBook size={28} className="mr-2" />
            Edit Subject
          </h1>
          
          {!loading && subject && !subject.archived && (
            <button
              onClick={handleArchive}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <IconTrash size={20} className="mr-1" />
              Archive Subject
            </button>
          )}
        </div>
        
        {/* Error and Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md flex items-center">
            <IconAlertCircle size={20} className="mr-2" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-md flex items-center">
            <IconCheck size={20} className="mr-2" />
            {success}
          </div>
        )}
        
        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        )}
        
        {/* Subject Form */}
        {!loading && subject && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Subject Edit Form */}
            <div className="md:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Subject Details
                </h2>
                
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Subject Name
                      </label>
                      <input
                        type="text"
                        name="subjectName"
                        value={formData.subjectName}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Subject Code
                      </label>
                      <input
                        type="text"
                        name="subjectCode"
                        value={formData.subjectCode}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Type
                      </label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="core">Core</option>
                        <option value="lab">Lab</option>
                        <option value="elective">Elective</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Total Duration (hours)
                      </label>
                      <input
                        type="number"
                        name="totalDuration"
                        value={formData.totalDuration}
                        onChange={handleChange}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Weekly hours: {calculateWeeklyHours()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Year
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
                        <option value="Fourth">Fourth</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Semester
                      </label>
                      <select
                        name="semester"
                        value={formData.semester}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                        <option value={6}>6</option>
                        <option value={7}>7</option>
                        <option value={8}>8</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        <>
                          <IconSave size={20} className="mr-1" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
            
            {/* Subject Information & Faculty Preferences */}
            <div>
              {/* Subject Information */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Subject Information
                </h2>
                
                <div className="space-y-3">
                  <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <IconCalendar size={18} className="mr-2 text-gray-500 dark:text-gray-400" />
                    <span>Academic Year: <span className="font-medium">{subject.academicYear}</span></span>
                  </div>
                  
                  <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <IconClock size={18} className="mr-2 text-gray-500 dark:text-gray-400" />
                    <span>Created: <span className="font-medium">{new Date(subject.createdAt).toLocaleDateString()}</span></span>
                  </div>
                  
                  <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <IconClock size={18} className="mr-2 text-gray-500 dark:text-gray-400" />
                    <span>Last Updated: <span className="font-medium">{new Date(subject.updatedAt).toLocaleDateString()}</span></span>
                  </div>
                  
                  {subject.archived && (
                    <div className="flex items-center text-red-600 dark:text-red-400">
                      <IconTrash size={18} className="mr-2" />
                      <span className="font-medium">Archived</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Faculty Preferences */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Faculty Preferences
                </h2>
                
                {facultyPreferences.length === 0 ? (
                  <div className="text-center py-4">
                    <IconUserCheck size={36} className="mx-auto text-gray-400 dark:text-gray-600 mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No faculty preferences yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {facultyPreferences.map(preference => (
                      <div 
                        key={preference._id} 
                        className="border border-gray-200 dark:border-gray-700 rounded-md p-4"
                      >
                        <div className="flex items-center mb-2">
                          <IconUserCheck size={18} className="mr-2 text-indigo-500" />
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {preference.faculty.name}
                          </h3>
                        </div>
                        
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          {preference.faculty.email}
                          {preference.faculty.department && ` • ${preference.faculty.department}`}
                        </p>
                        
                        {preference.comment && (
                          <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 italic">
                            "{preference.comment}"
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Submitted on {new Date(preference.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardWrapper>
  );
};

export default SubjectEditPage; 