import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI } from '../../utils/api';
import DashboardWrapper from '../../components/DashboardWrapper';
import { IconFilter, IconRefresh, IconArrowDown, IconArrowUp } from '@tabler/icons-react';

interface LoginLog {
  id: string;
  userName: string;
  userRole: string;
  userEmail?: string;
  loginMethod: string;
  timestamp: string;
  ipAddress?: string;
  deviceInfo?: string;
  status: string;
  universityCode?: string;
}

const LoginLogs: React.FC = () => {
  const { user } = useAuth();
  const [allLogs, setAllLogs] = useState<LoginLog[]>([]);
  const [facultyLogs, setFacultyLogs] = useState<LoginLog[]>([]);
  const [studentLogs, setStudentLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'faculty' | 'student'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<string>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Filter states
  const [dateFilter, setDateFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const logs = await adminAPI.getLoginLogs();
        console.log('Fetched login logs:', logs);
        
        if (Array.isArray(logs)) {
          // Transform and sort logs
          const transformedLogs = logs.map(log => ({
            id: log._id || log.id || Math.random().toString(36).substring(7),
            userName: log.userName || log.user?.name || 'Unknown User',
            userRole: log.userRole || log.user?.role || 'Unknown',
            userEmail: log.userEmail || log.user?.email,
            loginMethod: log.loginMethod || 'credentials',
            timestamp: log.timestamp || log.createdAt || new Date().toISOString(),
            ipAddress: log.ipAddress || 'Unknown',
            deviceInfo: log.deviceInfo || 'Unknown',
            status: log.status || 'success',
            universityCode: log.universityCode
          }));
          
          // Sort by timestamp descending (newest first)
          const sortedLogs = [...transformedLogs].sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          
          setAllLogs(sortedLogs);
          
          // Separate faculty and student logs
          setFacultyLogs(sortedLogs.filter(log => 
            log.userRole.toLowerCase() === 'faculty'
          ));
          
          setStudentLogs(sortedLogs.filter(log => 
            log.userRole.toLowerCase() === 'student'
          ));
        } else {
          setError('Could not retrieve login logs');
        }
      } catch (err: any) {
        console.error('Error fetching logs:', err);
        setError(err.message || 'Failed to fetch login logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortLogs = (logs: LoginLog[]) => {
    return [...logs].sort((a: any, b: any) => {
      let fieldA = a[sortField];
      let fieldB = b[sortField];
      
      // Handle date fields
      if (sortField === 'timestamp') {
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

  const applyFilters = (logs: LoginLog[]) => {
    return logs.filter(log => {
      const matchesDate = !dateFilter || 
        new Date(log.timestamp).toLocaleDateString().includes(dateFilter);
      
      const matchesRole = !roleFilter || 
        log.userRole.toLowerCase().includes(roleFilter.toLowerCase());
      
      const matchesMethod = !methodFilter || 
        log.loginMethod.toLowerCase().includes(methodFilter.toLowerCase());
      
      return matchesDate && matchesRole && matchesMethod;
    });
  };

  const getActiveLogList = () => {
    let logs;
    switch (activeTab) {
      case 'faculty':
        logs = facultyLogs;
        break;
      case 'student':
        logs = studentLogs;
        break;
      default:
        logs = allLogs;
    }
    
    const filteredLogs = applyFilters(logs);
    return sortLogs(filteredLogs);
  };

  const resetFilters = () => {
    setDateFilter('');
    setRoleFilter('');
    setMethodFilter('');
  };

  const refreshLogs = async () => {
    setLoading(true);
    try {
      const logs = await adminAPI.getLoginLogs();
      if (Array.isArray(logs)) {
        const transformedLogs = logs.map(log => ({
          id: log._id || log.id || Math.random().toString(36).substring(7),
          userName: log.userName || log.user?.name || 'Unknown User',
          userRole: log.userRole || log.user?.role || 'Unknown',
          userEmail: log.userEmail || log.user?.email,
          loginMethod: log.loginMethod || 'credentials',
          timestamp: log.timestamp || log.createdAt || new Date().toISOString(),
          ipAddress: log.ipAddress || 'Unknown',
          deviceInfo: log.deviceInfo || 'Unknown',
          status: log.status || 'success',
          universityCode: log.universityCode
        }));
        
        setAllLogs(transformedLogs);
        setFacultyLogs(transformedLogs.filter(log => log.userRole.toLowerCase() === 'faculty'));
        setStudentLogs(transformedLogs.filter(log => log.userRole.toLowerCase() === 'student'));
      }
    } catch (err) {
      console.error('Error refreshing logs:', err);
    } finally {
      setLoading(false);
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

  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-8 overflow-container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Login Logs
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={refreshLogs}
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
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'all'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('all')}
              >
                All Logs
              </button>
              <button
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'faculty'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('faculty')}
              >
                Faculty Logs
              </button>
              <button
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'student'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('student')}
              >
                Student Logs
              </button>
            </nav>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date
                </label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Role
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="faculty">Faculty</option>
                  <option value="student">Student</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Login Method
                </label>
                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">All Methods</option>
                  <option value="credentials">Credentials</option>
                  <option value="registration code">Registration Code</option>
                  <option value="university code">University Code</option>
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
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer dark:text-gray-300"
                      onClick={() => handleSort('userName')}
                    >
                      User {renderSortIndicator('userName')}
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer dark:text-gray-300"
                      onClick={() => handleSort('userRole')}
                    >
                      Role {renderSortIndicator('userRole')}
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer dark:text-gray-300"
                      onClick={() => handleSort('loginMethod')}
                    >
                      Login Method {renderSortIndicator('loginMethod')}
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer dark:text-gray-300"
                      onClick={() => handleSort('timestamp')}
                    >
                      Time {renderSortIndicator('timestamp')}
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
                  {logsToDisplay.length > 0 ? (
                    logsToDisplay.map((log) => (
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
                          <div className="text-sm text-gray-900 dark:text-white">{log.userRole}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{log.loginMethod}</div>
                          {log.universityCode && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Code: {log.universityCode}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {formatDate(log.timestamp)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            IP: {log.ipAddress}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${log.status === 'success' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No logs found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardWrapper>
  );
};

export default LoginLogs; 