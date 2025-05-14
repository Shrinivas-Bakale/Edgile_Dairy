import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  IconMail, 
  IconPhone, 
  IconSchool, 
  IconUser, 
  IconUserOff, 
  IconPlus, 
  IconFilter,
  IconSearch,
  IconUsers,
  IconChevronDown,
  IconChevronRight,
  IconDownload,
  IconArrowBackUp
} from '@tabler/icons-react';
import { adminAPI } from '../../utils/api';
import DashboardWrapper from '../../components/DashboardWrapper';
import { Modal, Select, MenuItem, InputLabel, FormControl, Snackbar, Alert } from '@mui/material';

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  registerNumber: string;
  classYear: number;
  semester: number;
  division: string;
  status: string;
  imageUrl?: string;
  university: string;
  universityName: string;
}

const DIVISIONS = ["A1", "A2", "A3", "A4", "A5", "A6"];
const CLASS_YEARS = [1, 2, 3];
const SEMESTERS = [1, 2, 3, 4, 5, 6];

const SEMESTERS_BY_YEAR: { [key: number]: number[] } = { 1: [1, 2], 2: [3, 4], 3: [5, 6] };

const StudentsPage: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter states
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteYear, setPromoteYear] = useState<number | null>(null);
  const [promoteSemester, setPromoteSemester] = useState<number | null>(null);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [undoLoading, setUndoLoading] = useState(false);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [showGraduated, setShowGraduated] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Debug authentication state
        const token = localStorage.getItem('token');
        console.log('Authentication state:', {
          isAuthenticated: !!user,
          hasToken: !!token,
          tokenPreview: token ? `${token.substring(0, 10)}...` : 'no token',
          user: user
        });
        
        console.log('Fetching students data...');
        
        // Use the getAllStudents API function 
        const studentsData = await adminAPI.getStudents();
        console.log('Students data received:', studentsData);
        
        // Get admin's university name
        const adminUniversity = (user?.universityName || 'KLE BCA Hubli').trim();
        
        // Map the students data to our component format
        const studentsList = studentsData.map((student: any) => ({
          id: student._id || student.id || '',
          name: student.name || 'Student',
          email: student.email,
          phone: student.phone || 'Not specified',
          registerNumber: student.registerNumber || '',
          classYear: student.classYear || 1,
          semester: student.semester || 1,
          division: student.division || 'A1',
          status: student.status || 'pending',
          imageUrl: student.profileImage || student.imageUrl,
          university: student.university || '',
          universityName: student.universityName || adminUniversity
        }));
        
        console.log('Final students list:', {
          count: studentsList.length,
          studentsList: studentsList.map((s: Student) => ({
            name: s.name,
            email: s.email,
            classYear: s.classYear,
            division: s.division,
            status: s.status
          }))
        });

        setStudents(studentsList);
        setFilteredStudents(studentsList);
      } catch (err: any) {
        console.error('Error fetching students:', err);
        setError(err.response?.data?.message || 'Failed to fetch students');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [user]);

  // Apply filters whenever filter state changes
  useEffect(() => {
    let result = [...students];
    
    if (selectedYear !== null) {
      result = result.filter(student => student.classYear === selectedYear);
    }
    
    if (selectedDivision !== null) {
      result = result.filter(student => student.division === selectedDivision);
    }
    
    if (selectedSemester !== null) {
      result = result.filter(student => student.semester === selectedSemester);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(student => 
        student.name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        student.registerNumber.toLowerCase().includes(query)
      );
    }
    
    setFilteredStudents(result);
  }, [students, selectedYear, selectedDivision, selectedSemester, searchQuery]);

  const resetFilters = () => {
    setSelectedYear(null);
    setSelectedDivision(null);
    setSelectedSemester(null);
    setSearchQuery('');
  };

  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Inactive
          </span>
        );
      case 'graduated':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Graduated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  // Filter out graduated students unless viewing graduated
  const visibleStudents = showGraduated ? students.filter(s => s.status === 'graduated') : students.filter(s => s.status !== 'graduated');

  // Check if undo is available for the selected year/semester
  useEffect(() => {
    const checkUndoAvailable = async () => {
      if (!promoteYear || !promoteSemester) {
        setUndoAvailable(false);
        return;
      }
      
      try {
        // Call the API to check if there are any recently promoted students for this year/semester
        const testResponse: any = await adminAPI.undoPromotion({ year: promoteYear, semester: promoteSemester });
        setUndoAvailable(testResponse.undone && testResponse.undone.length > 0);
      } catch (error) {
        setUndoAvailable(false);
      }
    };
    
    if (promoteOpen && promoteYear && promoteSemester) {
      checkUndoAvailable();
    }
  }, [promoteYear, promoteSemester, promoteOpen]);

  // Add the undo promotion function
  const handleUndoPromotion = async () => {
    if (!promoteYear || !promoteSemester) return;
    
    setUndoLoading(true);
    try {
      const res: any = await adminAPI.undoPromotion({ year: promoteYear, semester: promoteSemester });
      
      // Show success message even if no students were undone
      setSnackbar({ 
        open: true, 
        message: res.message || `Undid promotion for ${res.undone?.length || 0} students.`, 
        severity: 'success' 
      });
      
      if (res.undone?.length > 0) {
        // Only close the modal if students were actually undone
        setPromoteOpen(false);
        
        // Refresh students list only if changes were made
        const studentsData = await adminAPI.getStudents();
        setStudents(studentsData);
      }
    } catch (e: any) {
      // This should only happen for server errors now, not for "no promotions found"
      setSnackbar({ 
        open: true, 
        message: e.response?.data?.message || 'Server error while undoing promotion.', 
        severity: 'error' 
      });
    } finally {
      setUndoLoading(false);
    }
  };

  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <IconUsers size={28} className="mr-2 text-blue-600" />
            Students Management
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 transition-colors"
            >
              <IconFilter className="mr-2 text-gray-600" size={18} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
              {showFilters ? <IconChevronDown size={16} className="ml-1 text-gray-600" /> : <IconChevronRight size={16} className="ml-1 text-gray-600" />}
            </button>
            <button
              onClick={() => setPromoteOpen(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm"
            >
              <IconPlus className="mr-2" size={18} />
              Promote
            </button>
            <button
              onClick={() => setShowGraduated(g => !g)}
              className="flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors shadow-sm"
            >
              <IconUsers className="mr-2" size={18} />
              {showGraduated ? 'Show Active' : 'Graduated Students'}
            </button>
            <button
              onClick={() => {/* Add export functionality */}}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
            >
              <IconDownload className="mr-2" size={18} />
              Export Data
            </button>
          </div>
        </div>

        {/* Search Box */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IconSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students by name, email or register number..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-sm p-5 mb-6 border border-gray-100">
            <h2 className="text-lg font-medium text-gray-700 mb-4 flex items-center">
              <IconFilter className="mr-2 text-blue-600" size={20} />
              Filter Students
            </h2>
            <div className="flex flex-wrap gap-5">
              <div className="w-full sm:w-auto">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <select
                  value={selectedYear || ''}
                  onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">All Years</option>
                  {CLASS_YEARS.map(year => (
                    <option key={year} value={year}>Year {year}</option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-auto">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Division
                </label>
                <select
                  value={selectedDivision || ''}
                  onChange={(e) => setSelectedDivision(e.target.value || null)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">All Divisions</option>
                  {DIVISIONS.map(division => (
                    <option key={division} value={division}>Division {division}</option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-auto">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester
                </label>
                <select
                  value={selectedSemester || ''}
                  onChange={(e) => setSelectedSemester(e.target.value ? parseInt(e.target.value) : null)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">All Semesters</option>
                  {SEMESTERS.map(semester => (
                    <option key={semester} value={semester}>Semester {semester}</option>
                  ))}
                </select>
              </div>
              <div className="self-end">
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* No Results State */}
        {!loading && filteredStudents.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-gray-100">
            <IconUser size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No students found</h3>
            <p className="text-gray-500 mb-4">
              {students.length > 0 
                ? 'Try adjusting your search or filters to see more results.' 
                : 'There are no students in the system yet.'}
            </p>
            <button
              onClick={resetFilters}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {students.length > 0 ? 'Reset Filters' : 'Refresh'}
            </button>
          </div>
        )}

        {/* Results Grid */}
        {!loading && filteredStudents.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents
              .filter(s => showGraduated ? s.status === 'graduated' : s.status !== 'graduated')
              .map((student, idx) => (
                <div key={student.id || student.registerNumber || idx} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="p-5 border-2 border-slate-700 rounded-xl ">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          {student.imageUrl ? (
                            <img 
                              src={student.imageUrl} 
                              alt={student.name} 
                              className="h-10 w-10 rounded-full object-cover" 
                            />
                          ) : (
                            <IconUser size={20} className="text-blue-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 leading-tight">{student.name}</h3>
                          <p className="text-sm text-gray-500">{student.registerNumber}</p>
                        </div>
                      </div>
                      {renderStatusBadge(student.status)}
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center text-gray-600">
                        <IconMail size={18} className="mr-2 text-gray-400" />
                        <a href={`mailto:${student.email}`} className="text-sm hover:text-blue-600">
                          {student.email}
                        </a>
                      </div>
                      
                      {student.phone && (
                        <div className="flex items-center text-gray-600">
                          <IconPhone size={18} className="mr-2 text-gray-400" />
                          <a href={`tel:${student.phone}`} className="text-sm hover:text-blue-600">
                            {student.phone}
                          </a>
                        </div>
                      )}
                      
                      <div className="flex items-center text-gray-600">
                        <IconSchool size={18} className="mr-2 text-gray-400" />
                        <span className="text-sm">
                          Year {student.classYear}, Sem {student.semester}, Div {student.division}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
                      <button
                        onClick={() => {/* View Profile */}}
                        className="text-blue-600 text-sm font-medium hover:text-blue-800"
                      >
                        View Profile
                      </button>
                      
                      <button
                        onClick={() => {/* Toggle Status */}}
                        className={`text-sm font-medium flex items-center ${
                          student.status === 'inactive' 
                            ? 'text-green-600 hover:text-green-800' 
                            : 'text-red-600 hover:text-red-800'
                        }`}
                      >
                        {student.status === 'inactive' ? (
                          <>
                            <IconUser size={16} className="mr-1" />
                            Activate
                          </>
                        ) : (
                          <>
                            <IconUserOff size={16} className="mr-1" />
                            Deactivate
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <Modal open={promoteOpen} onClose={() => setPromoteOpen(false)}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#fff', padding: 32, borderRadius: 12, minWidth: 340 }}>
          <h2 className="text-lg font-bold mb-4">Promote Students</h2>
          <FormControl fullWidth margin="normal">
            <InputLabel>Year</InputLabel>
            <Select value={promoteYear ?? ''} onChange={e => { setPromoteYear(Number(e.target.value)); setPromoteSemester(null); }} label="Year">
              {CLASS_YEARS.map(y => <MenuItem key={y} value={y}>Year {y}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Semester</InputLabel>
            <Select value={promoteSemester ?? ''} onChange={e => setPromoteSemester(Number(e.target.value))} label="Semester" disabled={!promoteYear}>
              {(promoteYear ? SEMESTERS_BY_YEAR[promoteYear] : []).map(s => <MenuItem key={s} value={s}>Semester {s}</MenuItem>)}
            </Select>
          </FormControl>
          <div className="flex justify-between items-center mt-6">
            {undoAvailable && (
              <button
                onClick={() => handleUndoPromotion()}
                className="px-3 py-1.5 bg-yellow-500 text-white text-sm rounded disabled:opacity-50 flex items-center"
                disabled={undoLoading || promoteLoading}
              >
                <IconArrowBackUp className="mr-1" size={16} />
                {undoLoading ? 'Undoing...' : 'Undo Recent'}
              </button>
            )}
            <div className={`flex gap-2 ${undoAvailable ? '' : 'ml-auto'}`}>
              <button 
                onClick={() => setPromoteOpen(false)} 
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setPromoteLoading(true);
                  try {
                    const res: any = await adminAPI.promoteStudents({ year: promoteYear!, semester: promoteSemester! });
                    setSnackbar({ open: true, message: res.message || 'Promotion successful!', severity: 'success' });
                    setPromoteOpen(false);
                    // Refresh students
                    const studentsData = await adminAPI.getStudents();
                    setStudents(studentsData);
                  } catch (e: any) {
                    setSnackbar({ open: true, message: e.response?.data?.message || 'Promotion failed', severity: 'error' });
                  } finally {
                    setPromoteLoading(false);
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
                disabled={!promoteYear || !promoteSemester || promoteLoading || undoLoading}
              >
                {promoteYear === 3 && promoteSemester === 6 ? 'Graduate' : (promoteLoading ? 'Promoting...' : 'Promote')}
              </button>
            </div>
          </div>
        </div>
      </Modal>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardWrapper>
  );
};

export default StudentsPage; 