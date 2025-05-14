import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardWrapper from '../../components/DashboardWrapper';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
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
  IconCalendar,
  IconSchool,
  IconCertificate,
  IconAdjustments
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
  description?: string;
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

// Interface for API responses
interface SubjectResponse {
  success: boolean;
  subject?: Subject;
  facultyPreferences?: FacultyPreference[];
  message?: string;
}

interface UpdateResponse {
  success: boolean;
  message?: string;
}

const SubjectEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  
  // State for subject data
  const [subject, setSubject] = useState<Subject | null>(null);
  const [facultyPreferences, setFacultyPreferences] = useState<FacultyPreference[]>([]);
  
  // State for academic years
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    subjectName: '',
    subjectCode: '',
    type: 'core' as 'core' | 'lab' | 'elective',
    totalDuration: 48,
    year: 'First',
    semester: 1,
    academicYear: '',
    description: ''
  });
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validation, setValidation] = useState<{[key: string]: string}>({});
  
  // Load subject data and academic years
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch academic years
        const yearsResponse = await adminAPI.getAcademicYears();
        if (Array.isArray(yearsResponse) && yearsResponse.length > 0) {
          setAcademicYears(yearsResponse);
        } else {
          // Set default if no academic years are returned
          const currentYear = new Date().getFullYear().toString();
          setAcademicYears([currentYear]);
        }
        
        // If this is an edit page (has ID), fetch the subject
        if (id) {
          const response = await adminAPI.getSubjectById(id) as SubjectResponse;
          
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
              semester: response.subject.semester,
              academicYear: response.subject.academicYear,
              description: response.subject.description || ''
            });
          } else {
            setError('Failed to load subject details');
          }
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  // Add a function to get available semesters based on year
  const getAvailableSemestersByYear = (year: string): number[] => {
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
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Clear validation error when field is edited
    if (validation[name]) {
      setValidation(prev => {
        const newValidation = {...prev};
        delete newValidation[name];
        return newValidation;
      });
    }
    
    if (name === 'year') {
      // If year changes, adjust semester to first available semester for that year
      const availableSemesters = getAvailableSemestersByYear(value);
      const currentSemester = parseInt(formData.semester.toString());
      
      // Check if current semester is valid for the new year
      const isCurrentSemesterValid = availableSemesters.includes(currentSemester);
      
      setFormData({
        ...formData,
        year: value,
        // Reset semester if current one isn't valid for the new year
        ...(isCurrentSemesterValid ? {} : { semester: availableSemesters[0] })
      });
    } else if (type === 'number') {
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
  
  // Validate form data
  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    // Required fields
    if (!formData.subjectName.trim()) errors.subjectName = 'Subject name is required';
    if (!formData.subjectCode.trim()) errors.subjectCode = 'Subject code is required';
    if (formData.totalDuration <= 0) errors.totalDuration = 'Duration must be greater than 0';
    if (!formData.academicYear) errors.academicYear = 'Academic year is required';
    
    setValidation(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) return;
    
    // Cannot proceed without ID for edit
    if (!id || !subject) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await adminAPI.updateSubject(id, formData) as UpdateResponse;
      
      if (response.success) {
        // Navigate back to subjects list with success message
        navigate('/admin/subjects', { 
          state: { message: 'Subject updated successfully' } 
        });
      } else {
        setError(response.message || 'Failed to update subject');
        setSaving(false);
      }
    } catch (err: any) {
      console.error('Error updating subject:', err);
      setError(err.message || 'An unexpected error occurred');
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
      
      const response = await adminAPI.archiveSubject(id) as UpdateResponse;
      
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
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Back button with improved styling */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/subjects')}
            className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors duration-200"
          >
            <IconArrowLeft size={20} className="mr-1" />
            <span>Back to Subjects</span>
          </button>
        </div>
        
        {/* Title with status indicator */}
        <div className="flex flex-wrap justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <IconBook size={32} className="mr-3 text-indigo-500" />
            Edit Subject
          </h1>
          
          {!loading && subject && (
            <div className="flex items-center space-x-4">
              {subject.archived ? (
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to restore this subject?')) {
                      try {
                        setLoading(true);
                        const response = await adminAPI.updateSubject(id!, { archived: false }) as UpdateResponse;
                        if (response.success) {
                          setLoading(false);
                          setSubject({ ...subject, archived: false });
                          showSnackbar('Subject restored successfully');
                        } else {
                          setLoading(false);
                          showSnackbar(response.message || 'Failed to restore subject');
                        }
                      } catch (error) {
                        setLoading(false);
                        showSnackbar('An error occurred while restoring the subject');
                      }
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-colors duration-200"
                >
                  <IconCheck size={20} className="mr-2" />
                  Restore Subject
                </button>
              ) : (
                <button
                  onClick={handleArchive}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-colors duration-200"
                >
                  <IconTrash size={20} className="mr-2" />
                  Archive Subject
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Archived status warning if the subject is archived */}
        {!loading && subject && subject.archived && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start">
            <IconAlertCircle size={24} className="mt-0.5 mr-3 flex-shrink-0 text-red-500" />
            <div>
              <p className="font-medium">Archived Subject</p>
              <p>This subject is currently archived and will not appear in default subject lists.</p>
            </div>
          </div>
        )}
        
        {/* Error Messages */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
            <IconAlertCircle size={24} className="mr-3 text-red-500" />
            {error}
          </div>
        )}
        
        {/* Success Messages */}
        {success && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center">
            <IconCheck size={24} className="mr-3 text-green-500" />
            {success}
          </div>
        )}
        
        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
          </div>
        )}
        
        {/* Subject Form */}
        {!loading && subject && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Subject Edit Form */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-8 transition-all duration-200 hover:shadow-xl border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 border-b pb-4 border-gray-100 flex items-center">
                  <IconAdjustments size={24} className="mr-2 text-indigo-500" />
                  Subject Details
                </h2>
                
                <form onSubmit={handleSubmit}>
                  <div className="space-y-8">
                    {/* Basic Info */}
                    <div>
                      <h3 className="text-sm font-medium uppercase text-gray-500 mb-4">Basic Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="subjectName" className="block text-sm font-medium text-gray-700 mb-2">
                            Subject Name
                          </label>
                          <input
                            id="subjectName"
                            name="subjectName"
                            type="text"
                            value={formData.subjectName}
                            onChange={handleChange}
                            className={`block w-full rounded-lg border ${validation.subjectName ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-2.5`}
                            required
                          />
                          {validation.subjectName && (
                            <p className="mt-1 text-sm text-red-600">{validation.subjectName}</p>
                          )}
                        </div>
                        
                        <div>
                          <label htmlFor="subjectCode" className="block text-sm font-medium text-gray-700 mb-2">
                            Subject Code
                          </label>
                          <input
                            id="subjectCode"
                            name="subjectCode"
                            type="text"
                            value={formData.subjectCode}
                            onChange={handleChange}
                            className={`block w-full rounded-lg border ${validation.subjectCode ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-2.5`}
                            required
                          />
                          {validation.subjectCode && (
                            <p className="mt-1 text-sm text-red-600">{validation.subjectCode}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Academic Year */}
                    <div>
                      <h3 className="text-sm font-medium uppercase text-gray-500 mb-4">Academic Year</h3>
                      <div>
                        <label htmlFor="academicYear" className="block text-sm font-medium text-gray-700 mb-2">
                          Academic Year
                        </label>
                        <select
                          id="academicYear"
                          name="academicYear"
                          value={formData.academicYear}
                          onChange={handleChange}
                          className={`block w-full rounded-lg border ${validation.academicYear ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-2.5`}
                          required
                        >
                          <option value="" disabled>Select Academic Year</option>
                          {academicYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                        {validation.academicYear && (
                          <p className="mt-1 text-sm text-red-600">{validation.academicYear}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Details */}
                    <div>
                      <h3 className="text-sm font-medium uppercase text-gray-500 mb-4">Subject Type & Duration</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Type
                          </label>
                          <select
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-2.5"
                          >
                            <option value="core">Core</option>
                            <option value="lab">Lab</option>
                            <option value="elective">Elective</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Total Duration (hours)
                          </label>
                          <input
                            type="number"
                            name="totalDuration"
                            value={formData.totalDuration}
                            onChange={handleChange}
                            min="1"
                            className={`block w-full rounded-lg border ${validation.totalDuration ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-2.5`}
                            required
                          />
                          {validation.totalDuration ? (
                            <p className="mt-1 text-sm text-red-600">{validation.totalDuration}</p>
                          ) : (
                            <p className="mt-2 text-sm text-gray-500">
                              Weekly hours: <span className="font-medium">{calculateWeeklyHours()}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Course Timeline */}
                    <div>
                      <h3 className="text-sm font-medium uppercase text-gray-500 mb-4">Course Timeline</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Year
                          </label>
                          <select
                            name="year"
                            value={formData.year}
                            onChange={handleChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-2.5"
                          >
                            <option value="First">First Year</option>
                            <option value="Second">Second Year</option>
                            <option value="Third">Third Year</option>
                          </select>
                          <p className="mt-2 text-xs text-gray-500">
                            {formData.year === 'First' && 'Semesters 1-2'}
                            {formData.year === 'Second' && 'Semesters 3-4'}
                            {formData.year === 'Third' && 'Semesters 5-6'}
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Semester
                          </label>
                          <select
                            name="semester"
                            value={formData.semester}
                            onChange={handleChange}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-2.5"
                          >
                            {getAvailableSemestersByYear(formData.year).map(semester => (
                              <option key={semester} value={semester}>Semester {semester}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    {/* Description */}
                    <div>
                      <h3 className="text-sm font-medium uppercase text-gray-500 mb-4">Description</h3>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={4}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base"
                        placeholder="Enter a detailed course description..."
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-8 pt-6 border-t border-gray-100">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium flex items-center transition-colors duration-200 shadow-sm"
                    >
                      {saving ? (
                        <>
                          <svg className="animate-spin mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving Changes...
                        </>
                      ) : (
                        <>
                          <IconSave size={20} className="mr-2" />
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
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100 flex items-center">
                  <IconBook size={20} className="mr-2 text-indigo-500" />
                  Subject Information
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-center text-gray-700">
                    <IconCalendar size={18} className="mr-3 text-indigo-500" />
                    <div>
                      <p className="text-xs uppercase text-gray-500">Academic Year</p>
                      <p className="font-medium">{subject.academicYear}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-gray-700">
                    <IconClock size={18} className="mr-3 text-indigo-500" />
                    <div>
                      <p className="text-xs uppercase text-gray-500">Created</p>
                      <p className="font-medium">{new Date(subject.createdAt).toLocaleDateString(undefined, { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric'
                      })}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-gray-700">
                    <IconClock size={18} className="mr-3 text-indigo-500" />
                    <div>
                      <p className="text-xs uppercase text-gray-500">Last Updated</p> 
                      <p className="font-medium">{new Date(subject.updatedAt).toLocaleDateString(undefined, { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric'
                      })}</p>
                    </div>
                  </div>
                  
                  {subject.archived && (
                    <div className="flex items-center text-red-600 mt-2 pt-2 border-t border-gray-100">
                      <IconTrash size={18} className="mr-3" />
                      <div>
                        <p className="text-xs uppercase">Status</p>
                        <p className="font-medium">Archived</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Faculty Preferences */}
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100 flex items-center">
                  <IconCertificate size={20} className="mr-2 text-indigo-500" />
                  Faculty Preferences
                </h2>
                
                {facultyPreferences.length === 0 ? (
                  <div className="text-center py-6">
                    <IconUserCheck size={36} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">
                      No faculty preferences yet
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Faculty members can express interest in teaching this subject
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {facultyPreferences.map(preference => (
                      <div 
                        key={preference._id} 
                        className="border border-gray-200 rounded-md p-4 hover:border-indigo-300 transition-colors duration-200"
                      >
                        <div className="flex items-center mb-2">
                          <IconUserCheck size={18} className="mr-2 text-indigo-500" />
                          <h3 className="font-medium text-gray-900">
                            {preference.faculty.name}
                          </h3>
                        </div>
                        
                        <p className="text-sm text-gray-500 mb-2">
                          {preference.faculty.email}
                          {preference.faculty.department && ` • ${preference.faculty.department}`}
                        </p>
                        
                        {preference.comment && (
                          <div className="text-sm text-gray-700 mt-2 p-2 bg-gray-50 rounded border-l-2 border-indigo-300 italic">
                            "{preference.comment}"
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500 mt-2">
                          Submitted on {new Date(preference.createdAt).toLocaleDateString(undefined, { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric'
                          })}
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