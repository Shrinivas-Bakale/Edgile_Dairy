import React, { useState, useEffect } from 'react';
import { codesAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Menu } from '@headlessui/react';
import { EllipsisVerticalIcon, TrashIcon, ClipboardDocumentIcon } from '@heroicons/react/24/solid';
import DashboardWrapper from '../../components/DashboardWrapper';

interface RegistrationCode {
  _id: string;
  code: string;
  type: 'student' | 'faculty' | 'admin';
  used: boolean;
  usedBy?: {
    id: string;
    name?: string;
    registerNumber?: string;
    email?: string;
    role: string;
    employeeId?: string;
  };
  usedAt?: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  __v?: number;
}

const RegistrationCodes: React.FC = () => {
  console.log('RegistrationCodes component rendering');
  const { token } = useAuth();
  const [codes, setCodes] = useState<RegistrationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [selectedType, setSelectedType] = useState<'student' | 'faculty'>('student');
  const [activeTab, setActiveTab] = useState<'active' | 'used'>('active');

  const fetchCodes = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Attempting to fetch registration codes...');
      const response = await codesAPI.getAllCodes();
      console.log('Raw response:', response);
      
      let codesData = [];
      if (Array.isArray(response)) {
        codesData = response;
      } else if (response?.data) {
        codesData = response.data;
      } else if (response?.codes) {
        codesData = response.codes;
      } else if (response?.registrationCodes) {
        codesData = response.registrationCodes;
      }

      console.log('Processed codes:', codesData);
      setCodes(codesData);
    } catch (err: any) {
      console.error('Error fetching codes:', err);
      setError('Failed to fetch registration codes: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('RegistrationCodes useEffect - token exists:', !!token);
    fetchCodes();
  }, [token]);

  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    try {
      const response = await codesAPI.generateCode(selectedType);
      console.log('Generate code response:', response);
      
      // Handle various success response formats
      if (response && response.success) {
        toast.success(`New ${selectedType} registration code generated!`);
        fetchCodes(); // Refresh the codes list
      } else if (response && response.registrationCode) {
        toast.success(`New ${selectedType} registration code generated!`);
        // Optionally add the new code to the existing list without refetching
        setCodes(prevCodes => [response.registrationCode, ...prevCodes]);
      } else if (response && (response.code || response.data)) {
        toast.success(`New ${selectedType} registration code generated!`);
        fetchCodes(); // Refresh the codes list
      } else {
        toast.error(response?.message || 'Failed to generate code');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while generating the code');
      console.error('Error generating code:', err);
    } finally {
      setGeneratingCode(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => toast.success('Code copied to clipboard!'))
      .catch(() => toast.error('Failed to copy code'));
  };

  // Function to format dates consistently
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      console.error('Invalid date format:', dateString);
      return 'Invalid date';
    }
  };

  // Function to check if a code is expired
  const isExpired = (code: RegistrationCode) => {
    try {
      return !code.isActive || new Date(code.expiresAt) < new Date();
    } catch (e) {
      console.error('Error checking expiration:', e);
      return false;
    }
  };

  // Function to check if a date is older than three months
  const isOlderThanThreeMonths = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return date < threeMonthsAgo;
    } catch (e) {
      console.error('Error checking date:', e);
      return false;
    }
  };

  // Handle deleting a code
  const handleDeleteCode = async (codeId: string, isActive = false) => {
    if (isActive) {
      // Confirm deletion for active codes
      if (!window.confirm('This code is still active. Are you sure you want to delete it? This cannot be undone.')) {
        return;
      }
    }
    
    // Show loading toast
    const loadingToast = toast.loading('Deleting registration code...');
    
    try {
      // Attempt to delete from database
      await codesAPI.deleteCode(codeId);
      
      // Update UI immediately for better user experience
      setCodes(prevCodes => prevCodes.filter(code => code._id !== codeId));
      
      // Remove loading toast and show success
      toast.dismiss(loadingToast);
      toast.success('Registration code successfully deleted from database!');
      
      // Refresh codes from server to ensure UI is in sync with database
      fetchCodes();
    } catch (err: any) {
      console.error('Error deleting code:', err);
      
      // Determine specific error message based on response
      let errorMessage = 'Failed to delete registration code';
      
      if (err.response) {
        // Handle specific HTTP status codes
        if (err.response.status === 404) {
          console.warn('Backend delete endpoint not found. Simulating deletion in UI only.');
          // Remove code from UI anyway to improve user experience
          setCodes(prevCodes => prevCodes.filter(code => code._id !== codeId));
          toast.dismiss(loadingToast);
          toast.warning('Code removed from list, but backend API endpoint for deletion is not implemented correctly.', 
            { duration: 5000 });
          return; // Exit early after handling this special case
        }
        
        switch (err.response.status) {
          case 401:
            errorMessage = 'You are not authorized to delete this code';
            break;
          case 403:
            errorMessage = 'You do not have permission to delete this code';
            break;
          case 400:
            errorMessage = err.response.data?.message || 'Invalid request to delete code';
            break;
          case 500:
            errorMessage = 'Server error occurred while deleting code';
            break;
          default:
            errorMessage = `Error (${err.response.status}): ${err.response.data?.message || 'Unknown error'}`;
        }
      } else if (err.request) {
        errorMessage = 'Server did not respond to delete request - check your connection';
      } else {
        errorMessage = err.message || 'Failed to send delete request';
      }
      
      // Remove loading toast and show error
      toast.dismiss(loadingToast);
      toast.error(errorMessage);
    }
  };

  // Improved getUserDisplay function to handle populated user data
  const getUserDisplay = (code: RegistrationCode) => {
    console.log('Getting user display for code:', code);
    
    // If no usedBy data at all
    if (!code.usedBy) {
      console.log('No usedBy information');
      return 'Unknown User';
    }
    
    // Handle different user types
    if (code.type === 'faculty') {
      // If we have the faculty name
      if (code.usedBy.name) {
        // Show name with employeeId if available
        return code.usedBy.employeeId ? 
          `${code.usedBy.name} (${code.usedBy.employeeId})` : 
          code.usedBy.name;
      }
    } else if (code.type === 'student') {
      // If we have the student register number
      if (code.usedBy.registerNumber) {
        return code.usedBy.name ? 
          `${code.usedBy.name} (${code.usedBy.registerNumber})` : 
          code.usedBy.registerNumber;
      }
      // If we have the student name but no registerNumber
      if (code.usedBy.name) {
        return code.usedBy.name;
      }
    }
    
    // Fallback if specific data is missing but we have email
    if (code.usedBy.email) {
      return code.usedBy.email;
    }
    
    // Ultimate fallback - just show the role and ID
    if (code.usedBy.id) {
      const role = code.usedBy.role ? 
        `${code.usedBy.role.charAt(0).toUpperCase() + code.usedBy.role.slice(1)}` : 
        code.type.charAt(0).toUpperCase() + code.type.slice(1);
      
      return `${role} User`;
    }
    
    return 'Unknown User';
  };

  // Updated filtering functions
  const activeFacultyCodes = codes.filter(code => 
    code.type === 'faculty' && !code.used && !isExpired(code)
  );
  
  const activeStudentCodes = codes.filter(code => 
    code.type === 'student' && !code.used && !isExpired(code)
  );
  
  const usedCodes = codes.filter(code => {
    console.log('Checking code:', code);
    return code.used === true;
  });

  // Render code tables
  const renderCodeTable = (codesToRender: RegistrationCode[], showType = false) => {
    if (codesToRender.length === 0) {
      return (
        <div className="text-gray-600 dark:text-gray-400 py-4">No codes found.</div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Code
              </th>
              {showType && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Expires
              </th>
              {activeTab === 'used' && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Used At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Used By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </>
              )}
              {activeTab === 'active' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {codesToRender.map((code) => (
              <tr key={code._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {code.code}
                </td>
                {showType && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 capitalize">
                    {code.type}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {formatDate(code.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {formatDate(code.expiresAt)}
                </td>
                {activeTab === 'used' && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {code.usedAt ? formatDate(code.usedAt) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {getUserDisplay(code)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {!code.usedAt || !isOlderThanThreeMonths(code.usedAt) ? (
                        <button
                          className="text-gray-400 cursor-not-allowed"
                          disabled
                          title={code.usedAt ? `Available for deletion after ${formatDate(new Date(new Date(code.usedAt).setMonth(new Date(code.usedAt).getMonth() + 3)).toString())}` : "Cannot delete this code"}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      ) : (
                        <button
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          onClick={() => handleDeleteCode(code._id)}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </>
                )}
                {activeTab === 'active' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <div className="flex space-x-4">
                      <button 
                        onClick={() => copyToClipboard(code.code)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        title="Copy code to clipboard"
                      >
                        <ClipboardDocumentIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCode(code._id, true)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete this code"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Registration Codes</h2>
          
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
              <select
                className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-4 py-2"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as 'student' | 'faculty')}
                disabled={generatingCode}
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
              </select>
              
              <button
                className={`${
                  generatingCode 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                } text-white px-4 py-2 rounded-md transition-colors`}
                onClick={handleGenerateCode}
                disabled={generatingCode}
              >
                {generatingCode ? 'Generating...' : 'Generate New Code'}
              </button>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Generate registration codes for students and faculty members. 
              These codes will be valid for 30 days from creation.
            </p>
          </div>
          
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="flex -mb-px">
              <button
                className={`py-2 px-4 text-sm font-medium ${
                  activeTab === 'active'
                    ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('active')}
              >
                Active Codes
              </button>
              <button
                className={`ml-8 py-2 px-4 text-sm font-medium ${
                  activeTab === 'used'
                    ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('used')}
              >
                Used Codes
              </button>
            </nav>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 py-4">{error}</div>
          ) : activeTab === 'active' ? (
            <>
              {/* Faculty Codes Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">Faculty Codes</h3>
                {renderCodeTable(activeFacultyCodes)}
              </div>
              
              {/* Student Codes Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">Student Codes</h3>
                {renderCodeTable(activeStudentCodes)}
              </div>
            </>
          ) : (
            <>
              {/* Used Codes Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">Used Codes</h3>
                {renderCodeTable(usedCodes, true)}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardWrapper>
  );
};

export default RegistrationCodes; 