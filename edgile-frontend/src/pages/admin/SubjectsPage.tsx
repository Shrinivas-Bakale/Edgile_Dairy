import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardWrapper from '../../components/DashboardWrapper';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { adminAPI } from '../../utils/api';
import {
  IconPlus,
  IconRefresh,
  IconFilter,
  IconSearch,
  IconTrash,
  IconPencil,
  IconCopy,
  IconBook,
  IconX,
  IconCalendarTime,
  IconArrowsSort
} from '@tabler/icons-react';
import AddSubjectModal from '../../components/subjects/AddSubjectModal';
import CopySubjectsModal from '../../components/subjects/CopySubjectsModal';

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

const SubjectsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showSnackbar } = useSnackbar();
  
  // State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<string>('');
  
  // Filter state
  const [filters, setFilters] = useState({
    year: '',
    semester: '',
    type: '',
    search: '',
    showArchived: false
  });
  
  // Modal state
  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  
  // Fetch subjects data
  useEffect(() => {
    fetchSubjects();
    fetchAcademicYears();
  }, []);
  
  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [filters, subjects]);
  
  // Check for success message in location state on component mount
  useEffect(() => {
    if (location.state?.message) {
      showSnackbar(location.state.message, 'success');
      // Clear the message from location state
      navigate('.', { replace: true, state: {} });
    }
  }, [location.state, navigate, showSnackbar]);
  
  const fetchSubjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = {
        year: filters.year || undefined,
        semester: filters.semester ? parseInt(filters.semester) : undefined,
        archived: filters.showArchived || undefined,
        academicYear: currentAcademicYear || undefined
      };
      
      const response = await adminAPI.getSubjects(queryParams);
      
      if (response.success) {
        setSubjects(response.subjects || []);
      } else {
        setError(response.message || 'Failed to fetch subjects');
      }
    } catch (error: any) {
      console.error('Error fetching subjects:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAcademicYears = async () => {
    try {
      const response = await adminAPI.getAcademicYears();
      
      if (Array.isArray(response) && response.length > 0) {
        setAcademicYears(response);
        // Set current academic year to the most recent one
        setCurrentAcademicYear(response[0]);
      } else {
        console.error('No academic years returned or invalid response format');
        // Set a default academic year if none exists
        const currentYear = new Date().getFullYear().toString();
        setAcademicYears([currentYear]);
        setCurrentAcademicYear(currentYear);
      }
    } catch (error) {
      console.error('Error fetching academic years:', error);
      // Set a default academic year if there's an error
      const currentYear = new Date().getFullYear().toString();
      setAcademicYears([currentYear]);
      setCurrentAcademicYear(currentYear);
    }
  };
  
  const applyFilters = () => {
    let filtered = [...subjects];
    
    // Apply year filter
    if (filters.year) {
      filtered = filtered.filter(subject => subject.year === filters.year);
    }
    
    // Apply semester filter
    if (filters.semester) {
      filtered = filtered.filter(subject => 
        subject.semester === parseInt(filters.semester)
      );
    }
    
    // Apply type filter
    if (filters.type) {
      filtered = filtered.filter(subject => 
        subject.type === filters.type
      );
    }
    
    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(subject => 
        subject.subjectName.toLowerCase().includes(searchTerm) ||
        subject.subjectCode.toLowerCase().includes(searchTerm)
      );
    }
    
    setFilteredSubjects(filtered);
  };
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFilters(prev => ({
        ...prev,
        [name]: target.checked
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleAcademicYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentAcademicYear(e.target.value);
    // Refresh subjects with the new academic year
    setTimeout(() => {
      fetchSubjects();
    }, 0);
  };
  
  const handleRefresh = () => {
    fetchSubjects();
  };
  
  const handleEditSubject = (id: string) => {
    navigate(`/admin/subjects/edit/${id}`);
  };
  
  const renderSubjectTypeTag = (type: string) => {
    const styles = {
      core: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      lab: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      elective: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type as keyof typeof styles]}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
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
        return [1, 2, 3, 4, 5, 6]; // All semesters if no year selected
    }
  };
  
  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-6">
        {/* Header with title and actions */}
        <div className="flex flex-wrap justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <IconBook size={28} className="mr-2" />
            Subjects Management
          </h1>
          
          <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
            <button
              onClick={() => setIsAddSubjectModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <IconPlus size={20} className="mr-1" />
              Add Subject
            </button>
            
            <button
              onClick={() => setIsCopyModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              <IconCopy size={20} className="mr-1" />
              Copy Subjects
            </button>
            
            <button
              onClick={handleRefresh}
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md flex items-center"
            >
              <IconRefresh size={20} className="mr-1" />
              Refresh
            </button>
          </div>
        </div>
        
        {/* Filters and Academic Year selector */}
        <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Academic Year
              </label>
              <select
                value={currentAcademicYear}
                onChange={handleAcademicYearChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {academicYears.map(year => {
                  // Format years for display if needed
                  const formattedYear = /^\d{4}-\d{2}$/.test(year) 
                    ? year 
                    : formatAcademicYear(year);
                    
                  return (
                    <option key={year} value={year}>{formattedYear}</option>
                  );
                })}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Year
              </label>
              <select
                name="year"
                value={filters.year}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Years</option>
                <option value="First">First</option>
                <option value="Second">Second</option>
                <option value="Third">Third</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Semester
              </label>
              <select
                name="semester"
                value={filters.semester}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Semesters</option>
                {getAvailableSemesters(filters.year).map(semesterNumber => (
                  <option key={semesterNumber} value={semesterNumber.toString()}>
                    {semesterNumber}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                name="type"
                value={filters.type}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Types</option>
                <option value="core">Core</option>
                <option value="lab">Lab</option>
                <option value="elective">Elective</option>
              </select>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IconSearch size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Search subjects..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showArchived"
                name="showArchived"
                checked={filters.showArchived}
                onChange={handleFilterChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="showArchived" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                Show Archived
              </label>
            </div>
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        )}
        
        {/* Subjects Table */}
        {!loading && filteredSubjects.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <IconBook size={48} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No subjects found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {subjects.length > 0 
                ? 'Try adjusting your filters to see more results' 
                : 'Add your first subject to get started'}
            </p>
          </div>
        )}
        
        {!loading && filteredSubjects.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Subject
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Code
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Year / Semester
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Duration
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredSubjects.map(subject => (
                    <tr key={subject._id} className={subject.archived ? 'bg-gray-50 dark:bg-gray-900/50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {subject.subjectName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {subject.subjectCode}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderSubjectTypeTag(subject.type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {subject.year} Year
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Semester {subject.semester}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {subject.totalDuration} hours total
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {Number.isInteger(subject.weeklyHours) 
                            ? `${subject.weeklyHours} hours per week` 
                            : `${Math.floor(subject.weeklyHours)}-${Math.ceil(subject.weeklyHours)} hours per week`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {subject.archived ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            Archived
                          </span>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditSubject(subject._id)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Add subject modal */}
        <AddSubjectModal
          isOpen={isAddSubjectModalOpen}
          onClose={() => setIsAddSubjectModalOpen(false)}
          onSuccess={(newSubjects) => {
            // Add all newly created subjects to the list
            setSubjects([...subjects, ...newSubjects]);
            // Display success message using snackbar instead of location state
            showSnackbar(`Successfully added ${newSubjects.length} subject${newSubjects.length > 1 ? 's' : ''}`, 'success');
          }}
          academicYears={academicYears}
          currentAcademicYear={currentAcademicYear}
        />
        
        {/* Copy subjects modal */}
        <CopySubjectsModal
          isOpen={isCopyModalOpen}
          onClose={() => setIsCopyModalOpen(false)}
          onSuccess={(newSubjects) => {
            setSubjects([...subjects, ...newSubjects]);
            // Display success message using snackbar
            showSnackbar(`Successfully copied ${newSubjects.length} subject${newSubjects.length > 1 ? 's' : ''}`, 'success');
          }}
          academicYears={academicYears}
        />
      </div>
    </DashboardWrapper>
  );
};

export default SubjectsPage; 