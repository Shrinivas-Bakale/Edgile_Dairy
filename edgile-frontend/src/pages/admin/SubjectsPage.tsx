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
  IconPencil,
  IconBook,
  IconArrowRight,
  IconArchive,
  IconCheck,
  IconAdjustments,
  IconX
} from '@tabler/icons-react';
import AddSubjectModal from '../../components/subjects/AddSubjectModal';

interface Subject {
  _id: string;
  subjectName: string;
  subjectCode: string;
  type: 'core' | 'lab' | 'elective';
  totalDuration: number;
  weeklyHours: number;
  year: string;
  semester: number;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  description?: string;
}

interface SubjectsResponse {
  success: boolean;
  subjects: Subject[];
  message?: string;
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
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // Fetch subjects data
  useEffect(() => {
    fetchSubjects();
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
        archived: filters.showArchived || undefined
      };
      
      const response = await adminAPI.getSubjects(queryParams) as SubjectsResponse;
      
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
    
    // Apply archived filter if not showing archived
    if (!filters.showArchived) {
      filtered = filtered.filter(subject => !subject.archived);
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
  
  const handleRefresh = () => {
    fetchSubjects();
  };
  
  const handleEditSubject = (id: string) => {
    navigate(`/admin/subjects/edit/${id}`);
  };

  const handleViewDetails = (subject: Subject) => {
    setSelectedSubject(subject);
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedSubject(null);
  };
  
  const renderSubjectTypeTag = (type: string) => {
    const styles = {
      core: 'bg-blue-100 text-blue-800',
      lab: 'bg-purple-100 text-purple-800',
      elective: 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type as keyof typeof styles]}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };
  
  const clearFilters = () => {
    setFilters({
      year: '',
      semester: '',
      type: '',
      search: '',
      showArchived: false
    });
  };
  
  return (
    <DashboardWrapper>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header with title and actions */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <div className="flex flex-wrap justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <IconBook size={28} className="mr-2 text-indigo-600" />
              Subjects
            </h1>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none flex items-center"
              >
                <IconFilter size={18} className="mr-2" />
                Filters
              </button>
              
              <button
                onClick={handleRefresh}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none flex items-center"
                aria-label="Refresh"
              >
                <IconRefresh size={18} />
              </button>
              
              <button
                onClick={() => setIsAddSubjectModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center"
              >
                <IconPlus size={18} className="mr-2" />
                Add Subject
              </button>
            </div>
          </div>
          
          {/* Expanded filters */}
          {isFilterExpanded && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <select
                    name="year"
                    value={filters.year}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900"
                  >
                    <option value="">All Years</option>
                    <option value="First">First</option>
                    <option value="Second">Second</option>
                    <option value="Third">Third</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Semester
                  </label>
                  <select
                    name="semester"
                    value={filters.semester}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900"
                  >
                    <option value="">All Semesters</option>
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                    <option value="3">Semester 3</option>
                    <option value="4">Semester 4</option>
                    <option value="5">Semester 5</option>
                    <option value="6">Semester 6</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    name="type"
                    value={filters.type}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900"
                  >
                    <option value="">All Types</option>
                    <option value="core">Core</option>
                    <option value="lab">Lab</option>
                    <option value="elective">Elective</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <IconSearch size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="search"
                      value={filters.search}
                      onChange={handleFilterChange}
                      placeholder="Search by name or code"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="show-archived"
                    name="showArchived"
                    checked={filters.showArchived}
                    onChange={handleFilterChange}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="show-archived" className="ml-2 text-sm text-gray-700">
                    Show archived subjects
                  </label>
                </div>
                
                <button
                  onClick={clearFilters}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  Clear filters
                </button>
              </div>
            </div>
          )}
        </div>
        
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        )}
        
        {/* Subjects Grid View */}
        {!loading && filteredSubjects.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <IconBook size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects found</h3>
            <p className="text-gray-500">
              {subjects.length > 0 
                ? 'Try adjusting your filters to see more results' 
                : 'Add your first subject to get started'}
            </p>
            {subjects.length === 0 && (
              <button
                onClick={() => setIsAddSubjectModalOpen(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md inline-flex items-center"
              >
                <IconPlus size={18} className="mr-2" />
                Add First Subject
              </button>
            )}
          </div>
        )}
        
        {!loading && filteredSubjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubjects.map(subject => (
              <div 
                key={subject._id} 
                className={`bg-white rounded-xl border-2 border-slate-700 overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer ${subject.archived ? 'opacity-60' : ''}`}
                onClick={() => handleViewDetails(subject)}
              >
                <div className="p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                        {subject.subjectName}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2">
                        {subject.subjectCode}
                      </p>
                    </div>
                    {renderSubjectTypeTag(subject.type)}
                  </div>
                  
                  <div className="mt-3 text-sm text-gray-600">
                    <div className="flex justify-between mb-1">
                      <span>Total Hours:</span>
                      <span className="font-medium">{subject.totalDuration}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span>Weekly Hours:</span>
                      <span className="font-medium">{subject.weeklyHours}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span>Year:</span>
                      <span className="font-medium">{subject.year}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Semester:</span>
                      <span className="font-medium">{subject.semester}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                    {subject.archived && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        Archived
                      </span>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent opening details modal
                        handleEditSubject(subject._id);
                      }}
                      className="flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium ml-auto"
                    >
                      Edit
                      <IconArrowRight size={16} className="ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Subject Details Modal */}
        {isDetailsModalOpen && selectedSubject && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 overflow-y-auto">
            <div className="bg-white rounded-lg border border-slate-700 shadow-xl w-full max-w-2xl mx-4 my-8">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <IconBook size={20} className="mr-2 text-indigo-600" />
                  Subject Details
                </h2>
                <button
                  onClick={closeDetailsModal}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <IconX size={20} />
                </button>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      {selectedSubject.subjectName}
                    </h3>
                    {renderSubjectTypeTag(selectedSubject.type)}
                  </div>
                  <p className="text-md text-gray-500 mb-4">
                    {selectedSubject.subjectCode}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm text-gray-500">Total Hours</p>
                      <p className="text-lg font-medium">{selectedSubject.totalDuration}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm text-gray-500">Weekly Hours</p>
                      <p className="text-lg font-medium">{selectedSubject.weeklyHours}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm text-gray-500">Year</p>
                      <p className="text-lg font-medium">{selectedSubject.year}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm text-gray-500">Semester</p>
                      <p className="text-lg font-medium">{selectedSubject.semester}</p>
                    </div>
                  </div>
                  
                  {selectedSubject.description && (
                    <div className="mt-4">
                      <h4 className="text-md font-semibold text-gray-800 mb-2">Description</h4>
                      <p className="text-gray-600 bg-gray-50 p-4 rounded-md">
                        {selectedSubject.description || "No description available"}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleEditSubject(selectedSubject._id)}
                    className="mr-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center"
                  >
                    <IconPencil size={16} className="mr-2" />
                    Edit Subject
                  </button>
                  <button
                    onClick={closeDetailsModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Add Subject Modal */}
        <AddSubjectModal
          isOpen={isAddSubjectModalOpen}
          onClose={() => setIsAddSubjectModalOpen(false)}
          onSuccess={(newSubjects) => {
            // Add all newly created subjects to the list
            setSubjects([...subjects, ...newSubjects]);
            // Display success message using snackbar instead of location state
            showSnackbar(`Successfully added ${newSubjects.length} subject${newSubjects.length > 1 ? 's' : ''}`, 'success');
          }}
          academicYears={[]}
          currentAcademicYear=""
        />
      </div>
    </DashboardWrapper>
  );
};

export default SubjectsPage; 