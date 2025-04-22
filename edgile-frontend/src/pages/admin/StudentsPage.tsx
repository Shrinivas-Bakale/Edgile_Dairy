import React, { useState, useEffect } from 'react';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useAuth } from '../../contexts/AuthContext';
import { IconMail, IconPhone, IconSchool, IconUser, IconUserOff, IconPlus, IconX, IconFilter } from '@tabler/icons-react';
import { adminAPI } from '../../utils/api';
import { toast } from 'react-hot-toast';
import DashboardWrapper from '../../components/DashboardWrapper';

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

interface RegistrationCode {
  code: string;
  used: boolean;
  type: string;
  active?: boolean;
  createdBy?: string;
}

const DIVISIONS = ["A1", "A2", "A3", "A4", "A5", "A6"];
const CLASS_YEARS = [1, 2, 3];
const SEMESTERS = [1, 2, 3, 4, 5, 6];

const StudentsPage: React.FC = () => {
  const { isDarkMode } = useDarkMode();
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

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
    
    setFilteredStudents(result);
  }, [students, selectedYear, selectedDivision, selectedSemester]);

  const resetFilters = () => {
    setSelectedYear(null);
    setSelectedDivision(null);
    setSelectedSemester(null);
  };

  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Pending
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Inactive
          </span>
        );
      case 'graduated':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Graduated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            {status}
          </span>
        );
    }
  };

  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Students Management
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <IconFilter className="mr-2" size={18} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Year
                </label>
                <select
                  value={selectedYear || ''}
                  onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">All Years</option>
                  {CLASS_YEARS.map(year => (
                    <option key={year} value={year}>Year {year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Division
                </label>
                <select
                  value={selectedDivision || ''}
                  onChange={(e) => setSelectedDivision(e.target.value || null)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">All Divisions</option>
                  {DIVISIONS.map(division => (
                    <option key={division} value={division}>Division {division}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Semester
                </label>
                <select
                  value={selectedSemester || ''}
                  onChange={(e) => setSelectedSemester(e.target.value ? parseInt(e.target.value) : null)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 dark:bg-red-900/30">
            <div className="flex">
              <div className="flex-shrink-0">
                <IconX className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Students
                </h3>
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  Total: {filteredStudents.length}
                </span>
              </div>
              
              {filteredStudents.length === 0 ? (
                <div className="text-center py-12">
                  <IconUserOff className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No students found</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {students.length > 0 
                      ? 'Try adjusting your filters to see more results.' 
                      : 'No students have been added yet.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                          Student
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                          Contact
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                          Year/Semester
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                          Division
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                {student.imageUrl ? (
                                  <img className="h-10 w-10 rounded-full" src={student.imageUrl} alt="" />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <IconUser className="h-6 w-6 text-indigo-600" />
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{student.name}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{student.registerNumber}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <div className="text-sm text-gray-900 dark:text-white flex items-center">
                                <IconMail className="mr-1 h-4 w-4 text-gray-500 dark:text-gray-400" />
                                {student.email}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                                <IconPhone className="mr-1 h-4 w-4 text-gray-500 dark:text-gray-400" />
                                {student.phone}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">Year {student.classYear}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Semester {student.semester}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">{student.division}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {renderStatusBadge(student.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardWrapper>
  );
};

export default StudentsPage; 