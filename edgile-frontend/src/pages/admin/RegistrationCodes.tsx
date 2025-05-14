import React, { useState, useEffect } from 'react';
import { codesAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Menu } from '@headlessui/react';
import { 
  PlusIcon, 
  ArrowPathIcon, 
  DocumentDuplicateIcon, 
  TrashIcon, 
  AcademicCapIcon, 
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EllipsisHorizontalIcon 
} from '@heroicons/react/24/outline';
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
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
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
      toast.success('Registration code successfully deleted!');
      
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
    // If no usedBy data at all
    if (!code.usedBy) {
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
      const role = code.usedBy.role ? code.usedBy.role.charAt(0).toUpperCase() + code.usedBy.role.slice(1) : 'User';
      return `${role} (ID: ${code.usedBy.id})`;
    }
    
    return 'Unknown User';
  };

  // Function to render the code table
  const renderCodeCards = (codesToRender: RegistrationCode[]) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {codesToRender.map(code => {
          const expired = isExpired(code);
          const old = isOlderThanThreeMonths(code.createdAt);
          
          return (
            <div 
              key={code._id} 
              className={`rounded-lg shadow-sm border overflow-hidden ${
                code.used ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-100'
              }`}
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    {code.type === 'student' ? (
                      <AcademicCapIcon className="h-5 w-5 text-blue-500 mr-2" />
                    ) : (
                      <UserIcon className="h-5 w-5 text-green-500 mr-2" />
                    )}
                    <span className="font-medium text-gray-800 capitalize">
                      {code.type} Code
                    </span>
                  </div>
                  
                  <div>
                    {code.used ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        Used
                      </span>
                    ) : expired ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircleIcon className="h-3 w-3 mr-1" />
                        Expired
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        Active
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-mono text-gray-800 tracking-wide">
                      {code.code}
                    </h3>
                    <button 
                      onClick={() => copyToClipboard(code.code)} 
                      className="text-blue-600 hover:text-blue-800"
                      title="Copy code"
                    >
                      <DocumentDuplicateIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                    <span>Created: {formatDate(code.createdAt)}</span>
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                    <span>Expires: {formatDate(code.expiresAt)}</span>
                  </div>
                  
                  {code.used && code.usedAt && (
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                      <span>Used on: {formatDate(code.usedAt)}</span>
                    </div>
                  )}
                  
                  {code.used && code.usedBy && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-md text-gray-700">
                      <div className="font-medium">Used by:</div>
                      <div>{getUserDisplay(code)}</div>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-gray-100 pt-3 flex justify-end">
                  <button
                    onClick={() => handleDeleteCode(code._id, !code.used && !expired)}
                    className="inline-flex items-center px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  // Filter codes for tabs
  const activeCodes = codes.filter(code => !code.used && !isExpired(code));
  const usedCodes = codes.filter(code => code.used || isExpired(code));

  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex flex-wrap justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <DocumentDuplicateIcon className="h-8 w-8 mr-2 text-blue-600" />
            Registration Codes
          </h1>
          
          <div className="flex items-center space-x-3 mt-3 sm:mt-0">
            <div className="relative inline-block">
              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as 'student' | 'faculty')}
                className="pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
              </select>
            </div>
            
            <button
              onClick={handleGenerateCode}
              disabled={generatingCode}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingCode ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Generate Code
                </>
              )}
            </button>
            
            <button
              onClick={fetchCodes}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white rounded-md shadow-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowPathIcon className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
            {error}
          </div>
        )}
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex -mb-px">
            <button
              className={`px-4 py-2 border-b-2 font-medium text-sm ${
                activeTab === 'active'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('active')}
            >
              Active Codes ({activeCodes.length})
            </button>
            <button
              className={`ml-8 px-4 py-2 border-b-2 font-medium text-sm ${
                activeTab === 'used'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('used')}
            >
              Used/Expired Codes ({usedCodes.length})
            </button>
          </nav>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        {/* Empty State */}
        {!loading && codes.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-gray-100">
            <DocumentDuplicateIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No registration codes found</h3>
            <p className="text-gray-500 mb-6">
              Generate a new registration code to get started.
            </p>
            <button
              onClick={handleGenerateCode}
              disabled={generatingCode}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Generate New Code
            </button>
          </div>
        )}
        
        {/* Active Tab Content */}
        {!loading && activeTab === 'active' && activeCodes.length > 0 && (
          <>
            <h2 className="text-lg font-medium text-gray-700 mb-4">
              Active Registration Codes
            </h2>
            {renderCodeCards(activeCodes)}
          </>
        )}
        
        {/* Used Tab Content */}
        {!loading && activeTab === 'used' && usedCodes.length > 0 && (
          <>
            <h2 className="text-lg font-medium text-gray-700 mb-4">
              Used and Expired Codes
            </h2>
            {renderCodeCards(usedCodes)}
          </>
        )}
        
        {/* Empty Tab States */}
        {!loading && activeTab === 'active' && activeCodes.length === 0 && codes.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center border border-gray-100">
            <h3 className="text-base font-medium text-gray-700 mb-2">No active codes available</h3>
            <p className="text-gray-500 mb-4">
              All codes have been used or expired.
            </p>
            <button
              onClick={handleGenerateCode}
              disabled={generatingCode}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Generate New Code
            </button>
          </div>
        )}
        
        {!loading && activeTab === 'used' && usedCodes.length === 0 && codes.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center border border-gray-100">
            <h3 className="text-base font-medium text-gray-700">No used or expired codes</h3>
            <p className="text-gray-500">
              All available codes are still active.
            </p>
          </div>
        )}
      </div>
    </DashboardWrapper>
  );
};

export default RegistrationCodes; 