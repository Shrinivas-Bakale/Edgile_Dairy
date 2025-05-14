import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { IconMail, IconPhone, IconBuilding, IconUser, IconUserOff, IconPlus, IconX } from '@tabler/icons-react';
import { facultyAPI, adminAPI } from '../utils/api';
import { toast } from 'react-hot-toast';
import DashboardWrapper from '../components/DashboardWrapper';

interface FacultyMember {
  id: string;
  name: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  imageUrl?: string;
  createdBy?: string;
  employeeId?: string;
  status: string;
  registrationCompleted: boolean;
  universityName: string;
}

interface RegistrationCode {
  code: string;
  used: boolean;
  type: string;
  active?: boolean;
  createdBy?: string;
}

interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  position?: string;
  department?: string;
  phone?: string;
  imageUrl?: string;
  createdBy?: string;
  employeeId?: string;
  status?: string;
  registrationCompleted?: boolean;
  universityName?: string;
  universityCode?: string;
}

const DEPARTMENTS = [
  'Technical',
  'Non-Technical',
  'Lab Instructor',
  'Clerk'
] as const;

const DEPARTMENT_PREFIXES = {
  'Technical': 'TEC',
  'Non-Technical': 'N-TEC',
  'Lab Instructor': 'LAB',
  'Clerk': 'CLR'
} as const;

const FacultyPage: React.FC = () => {
  // Constants
  const isDarkMode = false; // Always use light mode
  const { user } = useAuth();
  const [facultyMembers, setFacultyMembers] = useState<FacultyMember[]>([]);
  const [registrationCodes, setRegistrationCodes] = useState<RegistrationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [facultyName, setFacultyName] = useState('');
  const [facultyEmail, setFacultyEmail] = useState('');
  const [selectedCode, setSelectedCode] = useState('');
  const [department, setDepartment] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastUsedNumbers, setLastUsedNumbers] = useState<{ [key: string]: number }>({});
  const [generatedPassword, setGeneratedPassword] = useState('');

  useEffect(() => {
    console.log('Current user data:', user);
  }, [user]);

  const getNextEmployeeId = (selectedDepartment: string) => {
    const prefix = DEPARTMENT_PREFIXES[selectedDepartment as keyof typeof DEPARTMENT_PREFIXES];
    const currentNumber = lastUsedNumbers[selectedDepartment] || 0;
    const nextNumber = currentNumber + 1;
    const paddedNumber = nextNumber.toString().padStart(3, '0');
    return `${prefix}${paddedNumber}`;
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDepartment = e.target.value;
    setDepartment(selectedDepartment);
    if (selectedDepartment) {
      const newEmployeeId = getNextEmployeeId(selectedDepartment);
      setEmployeeId(newEmployeeId);
    } else {
      setEmployeeId('');
    }
  };

  const updateLastUsedNumber = (department: string) => {
    setLastUsedNumbers(prev => ({
      ...prev,
      [department]: (prev[department] || 0) + 1
    }));
  };

  const initializeLastUsedNumbers = (facultyList: FacultyMember[]) => {
    const numbers: { [key: string]: number } = {};
    
    facultyList.forEach(faculty => {
      const prefix = DEPARTMENT_PREFIXES[faculty.department as keyof typeof DEPARTMENT_PREFIXES];
      if (prefix && faculty.employeeId?.startsWith(prefix)) {
        const numberStr = faculty.employeeId.replace(prefix, '');
        const number = parseInt(numberStr, 10);
        if (!isNaN(number)) {
          numbers[faculty.department] = Math.max(numbers[faculty.department] || 0, number);
        }
      }
    });
    
    setLastUsedNumbers(numbers);
  };

  const fetchFaculty = async () => {
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
      
      console.log('Fetching faculty data...');
      
      // Use the new getFacultyMembers function instead of getAllUsers
      const facultyData = await adminAPI.getFacultyMembers();
      console.log('Faculty data received:', facultyData);
      
      // Get admin's university name and ID
      const adminUniversity = (user?.universityName || 'KLE BCA Hubli').trim();
      
      // Map the faculty data to our component format
      const facultyList = facultyData.map((faculty: any) => ({
        id: faculty._id || faculty.id || '',
        name: faculty.name || 'Faculty Member',
        position: faculty.position || 'Faculty',
        department: faculty.department || 'Not specified',
        email: faculty.email,
        phone: faculty.phone || 'Not specified',
        imageUrl: faculty.profileImage || faculty.imageUrl,
        createdBy: faculty.createdBy,
        employeeId: faculty.employeeId,
        status: faculty.status || 'pending',
        registrationCompleted: faculty.registrationCompleted || false,
        universityName: faculty.universityName || adminUniversity
      }));
      
      console.log('Final faculty list:', {
        count: facultyList.length,
        facultyList: facultyList.map((f: FacultyMember) => ({
          name: f.name,
          email: f.email,
          department: f.department,
          status: f.status,
          registrationCompleted: f.registrationCompleted
        }))
      });

      setFacultyMembers(facultyList);
      initializeLastUsedNumbers(facultyList);
    } catch (err: any) {
      console.error('Error fetching faculty:', err);
      setError(err.response?.data?.message || 'Failed to fetch faculty members');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrationCodes = async () => {
    try {
      setSubmitError(null);
      const codes = await adminAPI.getRegistrationCodes();
      console.log('Raw registration codes:', codes);

      if (!Array.isArray(codes)) {
        console.error('Expected array of codes, got:', typeof codes);
        setSubmitError('Invalid response format from server');
        setRegistrationCodes([]);
        return;
      }

      // Filter for unused faculty codes
      const availableCodes = codes.filter((code: RegistrationCode) => {
        // Basic validation
        if (!code || !code.code) {
          console.warn('Invalid code object:', code);
          return false;
        }

        // Check if it's a faculty code and is available
        const isFacultyCode = code.code.startsWith('FAC-') || code.type === 'faculty';
        const isAvailable = !code.used && code.active !== false;

        console.log('Processing code:', {
          code: code.code,
          type: code.type,
          isFacultyCode,
          isAvailable,
          used: code.used,
          active: code.active
        });

        return isFacultyCode && isAvailable;
      });

      console.log('Available faculty codes:', availableCodes);
      setRegistrationCodes(availableCodes);

      if (availableCodes.length === 0) {
        // Check if there are any faculty codes at all
        const facultyCodes = codes.filter((code: RegistrationCode) => 
          code?.code?.startsWith('FAC-') || code?.type === 'faculty'
        );

        console.log('All faculty codes:', facultyCodes);

        if (facultyCodes.length === 0) {
          setSubmitError('No faculty registration codes exist. Please generate new faculty codes.');
        } else if (facultyCodes.every((code: RegistrationCode) => code.used)) {
          setSubmitError('All faculty registration codes are in use. Please generate new codes.');
        } else {
          setSubmitError('No valid faculty registration codes found. Please generate new codes.');
        }
      }
    } catch (err: any) {
      console.error('Error fetching registration codes:', err);
      setSubmitError('Failed to fetch registration codes. Please try again.');
      setRegistrationCodes([]);
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([
        fetchFaculty(),
        fetchRegistrationCodes()
      ]);
    };
    
    init();
  }, []);

  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    return password;
  };

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitSuccess(false);
    setSubmitError(null);
    setGeneratedPassword('');
    
    const userId = user?.id || '';
    const universityName = user?.universityName || 'KLE BCA Hubli';
    
    try {
      // Validate inputs
      if (!facultyName.trim() || !facultyEmail || !facultyEmail.includes('@') || !selectedCode || !department || !employeeId) {
        setSubmitError('Please fill in all required fields');
        return;
      }

      const generatedPassword = generatePassword();

      console.log('Creating faculty with data:', {
        name: facultyName,
        email: facultyEmail,
        department,
        employeeId,
        registrationCode: selectedCode,
        createdBy: userId,
        universityName
      });

      const result = await adminAPI.addFaculty({
        name: facultyName,
        email: facultyEmail,
        password: generatedPassword,
        department: department,
        employeeId: employeeId,
        registrationCode: selectedCode,
        createdBy: userId,
        universityName
      });

      // Email functionality removed - we'll just continue with the success flow
      console.log('Faculty member created successfully');

      setSubmitSuccess(true);
      setFacultyName('');
      setFacultyEmail('');
      setDepartment('');
      setEmployeeId('');
      setSelectedCode('');
      setGeneratedPassword('');
      
      // Refresh faculty list and registration codes
      await fetchFaculty();
      await fetchRegistrationCodes();
      
      toast.success('Faculty member created successfully!');
    } catch (err: any) {
      console.error('Error creating faculty:', err);
      
      // Check for specific error messages
      if (err.response?.data?.message?.toLowerCase().includes('email already exists') ||
          err.response?.data?.message?.toLowerCase().includes('user already exists') ||
          err.response?.status === 409) {
        setSubmitError('A faculty member with this email already exists. Please use a different email address.');
        toast.error('Faculty member already exists with this email');
      } else {
        setSubmitError(err.response?.data?.message || 'Failed to create faculty member');
        toast.error(err.response?.data?.message || 'Failed to create faculty member');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const RetryButton = () => (
    <button
      onClick={() => fetchRegistrationCodes()}
      className="mt-2 text-sm px-3 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
    >
      Retry Loading Codes
    </button>
  );

  const renderStatusBadge = (status: string, registrationCompleted: boolean) => {
    let bgColor = '';
    let textColor = '';
    let text = status;

    if (!registrationCompleted) {
      bgColor = 'bg-yellow-100';
      textColor = 'text-yellow-800';
      text = 'Registration Pending';
    } else if (status === 'active') {
      bgColor = 'bg-green-100';
      textColor = 'text-green-800';
    } else if (status === 'inactive') {
      bgColor = 'bg-red-100';
      textColor = 'text-red-800';
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${bgColor} ${textColor}`}>
        {text}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardWrapper>
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </DashboardWrapper>
    );
  }

  if (error) {
    return (
      <DashboardWrapper>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6 text-gray-900">
            Faculty Members
          </h1>
          
          <div className="flex flex-col items-center justify-center p-12 rounded-lg bg-white">
            <IconUserOff 
              size={64} 
              className="text-red-500" 
            />
            <h2 className="mt-4 text-xl font-semibold text-red-500">
              Error Loading Faculty Members
            </h2>
            <p className="mt-2 text-center text-gray-500">
              {error}
            </p>
            <pre className="mt-4 text-xs text-left bg-gray-900 text-gray-300 p-4 rounded w-full max-w-2xl overflow-auto">
              {JSON.stringify({ 
                userRole: user?.role,
                isAuthenticated: !!user,
                error
              }, null, 2)}
            </pre>
          </div>
        </div>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper>
      <div className="p-6 max-w-7xl mx-auto justify-center">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Faculty Members
          </h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-300 bg-indigo-500 text-white hover:bg-indigo-600"
          >
            <IconPlus className="mr-2" size={18} />
            Create Faculty
          </button>
        </div>

        {/* Faculty List */}
        {facultyMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 rounded-lg bg-white">
            <IconUserOff 
              size={64} 
              className="text-gray-400" 
            />
            <h2 className="mt-4 text-xl font-semibold text-gray-700">
              No Faculty Members Found
            </h2>
            <p className="mt-2 text-center text-gray-500">
              No faculty members found for {user?.universityName || 'KLE BCA Hubli'}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-6 flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-300 bg-indigo-500 text-white hover:bg-indigo-600"
            >
              <IconPlus className="mr-2" size={18} />
              Create Faculty
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {facultyMembers.map((member) => (
              <div 
                key={member.id} 
                className="bg-white rounded-xl shadow-sm overflow-hidden border-2 border-slate-700"
              >
                <div className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 flex-shrink-0 bg-gray-300 rounded-full flex items-center justify-center">
                      {member.imageUrl ? (
                        <img
                          src={member.imageUrl}
                          alt={member.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <IconUser size={24} className="text-gray-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {member.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {member.position || 'Faculty'} · {member.employeeId || 'No ID'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center space-x-2">
                      <IconMail className="text-gray-500" size={18} />
                      <span className="text-sm text-gray-600">
                        {member.email}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <IconPhone className="text-gray-500" size={18} />
                      <span className="text-sm text-gray-600">
                        {member.phone || 'Not provided'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <IconBuilding className="text-gray-500" size={18} />
                      <span className="text-sm text-gray-600">
                        {member.department || 'Department not specified'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <IconUser className="text-gray-500" size={18} />
                      <span className="text-sm text-gray-600">
                        {member.universityName || user?.universityName || 'KLE BCA Hubli'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-5 pt-5 border-t border-gray-100 flex justify-between items-center">
                    {renderStatusBadge(member.status, member.registrationCompleted)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Create New Faculty Member
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="bg-white rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                  >
                    <IconX className="text-gray-500" />
                  </button>
                </div>
                
                <form onSubmit={handleCreateFaculty}>
                  <div className="p-4 sm:p-6 space-y-4">
                    <div>
                      <label htmlFor="faculty-name" className="block text-sm font-medium text-gray-700">
                        Faculty Name
                      </label>
                      <input
                        type="text"
                        id="faculty-name"
                        value={facultyName}
                        onChange={(e) => setFacultyName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="faculty-email" className="block text-sm font-medium text-gray-700">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="faculty-email"
                        value={facultyEmail}
                        onChange={(e) => setFacultyEmail(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                        Department
                      </label>
                      <select
                        id="department"
                        value={department}
                        onChange={handleDepartmentChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required
                      >
                        <option value="">Select Department</option>
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="employee-id" className="block text-sm font-medium text-gray-700">
                        Employee ID
                      </label>
                      <input
                        type="text"
                        id="employee-id"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="registration-code" className="block text-sm font-medium text-gray-700">
                        Registration Code
                      </label>
                      {registrationCodes.length > 0 ? (
                        <select
                          id="registration-code"
                          value={selectedCode}
                          onChange={(e) => setSelectedCode(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          required
                        >
                          <option value="">Select Registration Code</option>
                          {registrationCodes
                            .filter(code => !code.used && code.type === 'faculty')
                            .map((code) => (
                              <option key={code.code} value={code.code}>{code.code}</option>
                            ))}
                        </select>
                      ) : submitError ? (
                        <div className="mt-1">
                          <p className="text-sm text-red-600">
                            Failed to load registration codes. {submitError}
                          </p>
                          <RetryButton />
                        </div>
                      ) : (
                        <div className="mt-1">
                          <p className="text-sm text-yellow-600">
                            No unused faculty registration codes available. Please generate new codes.
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {submitError && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <p className="text-sm text-red-600">{submitError}</p>
                      </div>
                    )}
                    
                    {submitSuccess && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-3">
                        <p className="text-sm text-green-600">Faculty member created successfully!</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="px-4 py-3 bg-gray-100 sm:px-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="mr-2 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitLoading}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      {submitLoading ? 'Creating...' : 'Create Faculty'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardWrapper>
  );
};

export default FacultyPage; 