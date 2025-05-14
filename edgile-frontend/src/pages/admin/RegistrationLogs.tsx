import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI } from '../../utils/api';
import DashboardWrapper from '../../components/DashboardWrapper';
import { IconFilter, IconRefresh, IconArrowDown, IconArrowUp, IconChevronDown } from '@tabler/icons-react';

interface RegistrationLog {
  id: string;
  userName: string;
  userEmail: string;
  userRole: string;
  // Faculty specific
  employeeId?: string;
  department?: string;
  // Student specific
  registerNumber?: string;
  semester?: string;
  division?: string;
  year?: string;
  // Common fields
  universityName: string;
  universityCode: string;
  registeredBy: string;
  registrationMethod: string;
  status: string;
  createdAt: string;
}

const RegistrationLogs: React.FC = () => {
  const { user } = useAuth();
  const [facultyLogs, setFacultyLogs] = useState<RegistrationLog[]>([]);
  const [studentLogs, setStudentLogs] = useState<RegistrationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'faculty' | 'student'>('faculty');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Filter states for faculty
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [employeeIdFilter, setEmployeeIdFilter] = useState<string>('');
  
  // Filter states for students
  const [semesterFilter, setSemesterFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [divisionFilter, setDivisionFilter] = useState<string>('');
  const [registerNumberFilter, setRegisterNumberFilter] = useState<string>('');

  const [isTabsMenuOpen, setIsTabsMenuOpen] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch faculty logs
      const facultyLogsData = await adminAPI.getRegistrationLogs({
        role: 'faculty',
        sort: 'employeeId',
        order: 'asc'
      });
      
      // Transform faculty logs
      const transformedFacultyLogs = facultyLogsData.map((log: any) => ({
        id: log._id,
        userName: log.userName,
        userEmail: log.userEmail,
        userRole: log.userRole,
        employeeId: log.employeeId,
        department: log.department,
        universityName: log.universityName,
        universityCode: log.universityCode,
        registeredBy: log.registeredBy,
        registrationMethod: log.registrationMethod,
        status: log.status,
        createdAt: log.createdAt
      }));
      
      setFacultyLogs(transformedFacultyLogs);
      
      // Fetch student logs
      const studentLogsData = await adminAPI.getRegistrationLogs({
        role: 'student',
        sort: 'registerNumber',
        order: 'asc'
      });
      
      // Transform student logs
      const transformedStudentLogs = studentLogsData.map((log: any) => ({
        id: log._id,
        userName: log.userName,
        userEmail: log.userEmail,
        userRole: log.userRole,
        registerNumber: log.registerNumber,
        semester: log.semester,
        division: log.division,
        year: log.year,
        universityName: log.universityName,
        universityCode: log.universityCode,
        registeredBy: log.registeredBy,
        registrationMethod: log.registrationMethod,
        status: log.status,
        createdAt: log.createdAt
      }));
      
      setStudentLogs(transformedStudentLogs);
    } catch (err: any) {
      console.error('Error fetching logs:', err);
      setError(err.message || 'Failed to fetch registration logs');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortFacultyLogs = () => {
    return [...facultyLogs].sort((a: any, b: any) => {
      let fieldA = a[sortField];
      let fieldB = b[sortField];
      
      // Handle date fields
      if (sortField === 'createdAt') {
        fieldA = new Date(fieldA).getTime();
        fieldB = new Date(fieldB).getTime();
      }
      
      // Handle string case-insensitive comparison
      if (typeof fieldA === 'string' && typeof fieldB === 'string') {
        fieldA = fieldA.toLowerCase();
        fieldB = fieldB.toLowerCase();
      }
      
      if (fieldA < fieldB) return sortDirection === 'asc' ? -1 : 1;
      if (fieldA > fieldB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const sortStudentLogs = () => {
    return [...studentLogs].sort((a: any, b: any) => {
      let fieldA = a[sortField];
      let fieldB = b[sortField];
      
      // Handle date fields
      if (sortField === 'createdAt') {
        fieldA = new Date(fieldA).getTime();
        fieldB = new Date(fieldB).getTime();
      }
      
      // Handle string case-insensitive comparison
      if (typeof fieldA === 'string' && typeof fieldB === 'string') {
        fieldA = fieldA.toLowerCase();
        fieldB = fieldB.toLowerCase();
      }
      
      if (fieldA < fieldB) return sortDirection === 'asc' ? -1 : 1;
      if (fieldA > fieldB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const applyFacultyFilters = (logs: RegistrationLog[]) => {
    return logs.filter(log => {
      const matchesDepartment = !departmentFilter || 
        (log.department && log.department.toLowerCase().includes(departmentFilter.toLowerCase()));
      
      const matchesEmployeeId = !employeeIdFilter || 
        (log.employeeId && log.employeeId.toLowerCase().includes(employeeIdFilter.toLowerCase()));
      
      return matchesDepartment && matchesEmployeeId;
    });
  };

  const applyStudentFilters = (logs: RegistrationLog[]) => {
    return logs.filter(log => {
      const matchesSemester = !semesterFilter || 
        (log.semester && log.semester === semesterFilter);
      
      const matchesYear = !yearFilter || 
        (log.year && log.year === yearFilter);
      
      const matchesDivision = !divisionFilter || 
        (log.division && log.division === divisionFilter);
      
      const matchesRegisterNumber = !registerNumberFilter || 
        (log.registerNumber && log.registerNumber.toLowerCase().includes(registerNumberFilter.toLowerCase()));
      
      return matchesSemester && matchesYear && matchesDivision && matchesRegisterNumber;
    });
  };

  const getActiveLogList = () => {
    if (activeTab === 'faculty') {
      const filteredLogs = applyFacultyFilters(facultyLogs);
      return sortFacultyLogs();
    } else {
      const filteredLogs = applyStudentFilters(studentLogs);
      return sortStudentLogs();
    }
  };

  const resetFilters = () => {
    if (activeTab === 'faculty') {
      setDepartmentFilter('');
      setEmployeeIdFilter('');
    } else {
      setSemesterFilter('');
      setYearFilter('');
      setDivisionFilter('');
      setRegisterNumberFilter('');
    }
  };

  const renderSortIndicator = (field: string) => {
    if (sortField !== field) return null;
    
    return sortDirection === 'asc' 
      ? <IconArrowUp size={16} className="inline ml-1" /> 
      : <IconArrowDown size={16} className="inline ml-1" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const logsToDisplay = getActiveLogList();

  const handleTabsMenuToggle = () => {
    setIsTabsMenuOpen(!isTabsMenuOpen);
  };

  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-8 overflow-container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Registration Logs
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={fetchLogs}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={loading}
            >
              <IconRefresh className="mr-2" size={18} />
              Refresh
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <IconFilter className="mr-2" size={18} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            
            <div className="relative">
              <button
                onClick={handleTabsMenuToggle}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {activeTab === 'faculty' ? 'Faculty Logs' : 'Student Logs'}
                <IconChevronDown className="ml-2" size={18} />
              </button>
              
              {isTabsMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setActiveTab('faculty');
                        setIsTabsMenuOpen(false);
                      }}
                      className={`${
                        activeTab === 'faculty' ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                      } flex w-full px-4 py-2 text-sm text-left hover:bg-gray-100`}
                    >
                      Faculty Logs
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('student');
                        setIsTabsMenuOpen(false);
                      }}
                      className={`${
                        activeTab === 'student' ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                      } flex w-full px-4 py-2 text-sm text-left hover:bg-gray-100`}
                    >
                      Student Logs
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              {activeTab === 'faculty' ? (
                // Faculty filters
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Department
                    </label>
                    <input
                      type="text"
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Filter by department"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      value={employeeIdFilter}
                      onChange={(e) => setEmployeeIdFilter(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Filter by employee ID"
                    />
                  </div>
                </>
              ) : (
                // Student filters
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Semester
                    </label>
                    <select
                      value={semesterFilter}
                      onChange={(e) => setSemesterFilter(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Year
                    </label>
                    <select
                      value={yearFilter}
                      onChange={(e) => setYearFilter(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">All Years</option>
                      <option value="1">Year 1</option>
                      <option value="2">Year 2</option>
                      <option value="3">Year 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Division
                    </label>
                    <select
                      value={divisionFilter}
                      onChange={(e) => setDivisionFilter(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">All Divisions</option>
                      <option value="A1">A1</option>
                      <option value="A2">A2</option>
                      <option value="A3">A3</option>
                      <option value="A4">A4</option>
                      <option value="A5">A5</option>
                      <option value="A6">A6</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Register Number
                    </label>
                    <input
                      type="text"
                      value={registerNumberFilter}
                      onChange={(e) => setRegisterNumberFilter(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Filter by register number"
                    />
                  </div>
                </>
              )}
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
          <div className="bg-red-100 p-4 mb-6 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
              {activeTab === 'faculty' ? (
                // Faculty table
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer dark:text-gray-300"
                        onClick={() => handleSort('userName')}
                      >
                        Name {renderSortIndicator('userName')}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer dark:text-gray-300"
                        onClick={() => handleSort('employeeId')}
                      >
                        Employee ID {renderSortIndicator('employeeId')}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer dark:text-gray-300"
                        onClick={() => handleSort('department')}
                      >
                        Department {renderSortIndicator('department')}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer dark:text-gray-300"
                        onClick={() => handleSort('createdAt')}
                      >
                        Registration Date {renderSortIndicator('createdAt')}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer dark:text-gray-300"
                        onClick={() => handleSort('status')}
                      >
                        Status {renderSortIndicator('status')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-600">
                    {facultyLogs.length > 0 ? (
                      facultyLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {log.userName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {log.userEmail}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">{log.employeeId}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">{log.department}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {formatDate(log.createdAt)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {log.registrationMethod}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${log.status === 'active' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                : log.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          No faculty registration logs found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                // Student table
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer dark:text-gray-300"
                        onClick={() => handleSort('userName')}
                      >
                        Name {renderSortIndicator('userName')}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer dark:text-gray-300"
                        onClick={() => handleSort('registerNumber')}
                      >
                        Register Number {renderSortIndicator('registerNumber')}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer dark:text-gray-300"
                        onClick={() => handleSort('semester')}
                      >
                        Class Details {renderSortIndicator('semester')}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer dark:text-gray-300"
                        onClick={() => handleSort('createdAt')}
                      >
                        Registration Date {renderSortIndicator('createdAt')}
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer dark:text-gray-300"
                        onClick={() => handleSort('status')}
                      >
                        Status {renderSortIndicator('status')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-600">
                    {studentLogs.length > 0 ? (
                      studentLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {log.userName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {log.userEmail}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">{log.registerNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              Year {log.year}, Semester {log.semester}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Division {log.division}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {formatDate(log.createdAt)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {log.registrationMethod}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${log.status === 'active' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                : log.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          No student registration logs found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardWrapper>
  );
};

export default RegistrationLogs; 