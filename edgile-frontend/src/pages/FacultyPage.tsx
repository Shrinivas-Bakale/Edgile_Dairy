import React, { useState, useEffect } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
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
  const { isDarkMode } = useDarkMode();
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
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Debug user object
      console.log('Current user:', user);
      
      // Check for user session with more detailed error
      if (!user) {
        setSubmitError('No user session found. Please log in again.');
        return;
      }

      // Use either id or _id from user object
      const userId = user.id || user._id;
      if (!userId) {
        console.error('User object missing id:', user);
        setSubmitError('Invalid user session. Please log in again.');
        return;
      }

      // Get university name from user profile
      const universityName = user.universityName || 'KLE BCA Hubli';

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

      const result = await adminAPI.createFaculty({
        name: facultyName,
        email: facultyEmail,
        password: generatedPassword,
        department: department,
        employeeId: employeeId,
        registrationCode: selectedCode,
        createdBy: userId,
        universityName
      });

      // Send welcome email
      await adminAPI.sendFacultyWelcomeEmail({
        email: facultyEmail,
        name: facultyName,
        password: generatedPassword,
        employeeId: employeeId
      });

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
      
      toast.success('Faculty member created successfully and welcome email sent!');
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
      className={`mt-2 text-sm px-3 py-1 rounded-md ${
        isDarkMode
          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      Retry Loading Codes
    </button>
  );

  const renderStatusBadge = (status: string, registrationCompleted: boolean) => {
    let bgColor = '';
    let textColor = '';
    let text = status;

    if (!registrationCompleted) {
      bgColor = isDarkMode ? 'bg-yellow-700' : 'bg-yellow-100';
      textColor = isDarkMode ? 'text-yellow-100' : 'text-yellow-800';
      text = 'Registration Pending';
    } else if (status === 'active') {
      bgColor = isDarkMode ? 'bg-green-700' : 'bg-green-100';
      textColor = isDarkMode ? 'text-green-100' : 'text-green-800';
    } else if (status === 'inactive') {
      bgColor = isDarkMode ? 'bg-red-700' : 'bg-red-100';
      textColor = isDarkMode ? 'text-red-100' : 'text-red-800';
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
          <h1 className={`text-2xl font-bold mb-6 ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>
            Faculty Members
          </h1>
          
          <div className={`flex flex-col items-center justify-center p-12 rounded-lg ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <IconUserOff 
              size={64} 
              className="text-red-500" 
            />
            <h2 className={`mt-4 text-xl font-semibold text-red-500`}>
              Error Loading Faculty Members
            </h2>
            <p className={`mt-2 text-center ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
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
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-2xl font-bold ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>
            Faculty Members
          </h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-300 ${
              isDarkMode
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-indigo-500 text-white hover:bg-indigo-600'
            }`}
          >
            <IconPlus className="mr-2" size={18} />
            Create Faculty
          </button>
        </div>

        {/* Faculty List */}
        {facultyMembers.length === 0 ? (
          <div className={`flex flex-col items-center justify-center p-12 rounded-lg ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <IconUserOff 
              size={64} 
              className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} 
            />
            <h2 className={`mt-4 text-xl font-semibold ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              No Faculty Members Found
            </h2>
            <p className={`mt-2 text-center ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              No faculty members found for {user?.universityName || 'KLE BCA Hubli'}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className={`mt-6 flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-300 ${
                isDarkMode
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600'
              }`}
            >
              <IconPlus className="mr-2" size={18} />
              Add First Faculty Member
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {facultyMembers.map((faculty) => (
              <div
                key={faculty.id}
                className={`p-6 rounded-lg shadow-md ${
                  isDarkMode ? 'bg-gray-800' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      {faculty.imageUrl ? (
                        <img
                          src={faculty.imageUrl}
                          alt={faculty.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <IconUser size={24} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                      )}
                    </div>
                    <div className="ml-4">
                      <h3 className={`font-semibold ${
                        isDarkMode ? 'text-gray-100' : 'text-gray-900'
                      }`}>
                        {faculty.name}
                      </h3>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {faculty.position}
                      </p>
                    </div>
                  </div>
                  {renderStatusBadge(faculty.status, faculty.registrationCompleted)}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center">
                    <IconMail size={18} className={`mr-2 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                    <span className={`text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {faculty.email}
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <IconBuilding size={18} className={`mr-2 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                    <span className={`text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {faculty.department}
                    </span>
                  </div>
                  
                  {faculty.phone && (
                    <div className="flex items-center">
                      <IconPhone size={18} className={`mr-2 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                      <span className={`text-sm ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {faculty.phone}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center">
                    <IconBuilding size={18} className={`mr-2 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                    <span className={`text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {faculty.universityName}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Faculty Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <div className="fixed inset-0 bg-black opacity-50" onClick={() => setIsModalOpen(false)}></div>
              <div className={`relative w-full max-w-md p-6 rounded-lg shadow-lg ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className={`text-xl font-bold ${
                    isDarkMode ? 'text-gray-100' : 'text-gray-900'
                  }`}>
                    Create Faculty Member
                  </h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className={`p-1 rounded-full hover:bg-opacity-10 ${
                      isDarkMode ? 'hover:bg-gray-400' : 'hover:bg-gray-500'
                    }`}
                  >
                    <IconX className={isDarkMode ? 'text-gray-300' : 'text-gray-500'} />
                  </button>
                </div>
                
                <form onSubmit={handleCreateFaculty} className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Faculty Name
                    </label>
                    <input
                      type="text"
                      value={facultyName}
                      onChange={(e) => setFacultyName(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Enter faculty name"
                      required
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={facultyEmail}
                      onChange={(e) => setFacultyEmail(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="faculty@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Employee ID
                    </label>
                    <input
                      type="text"
                      value={employeeId}
                      readOnly
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white cursor-not-allowed opacity-75' 
                          : 'bg-gray-100 border-gray-300 text-gray-900 cursor-not-allowed'
                      }`}
                      placeholder="Auto-generated based on department"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Registration Code
                    </label>
                    <select
                      value={selectedCode}
                      onChange={(e) => setSelectedCode(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      required
                    >
                      <option value="">Select a registration code</option>
                      {registrationCodes.map((code) => (
                        <option key={code.code} value={code.code}>
                          {code.code}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Department
                    </label>
                    <select
                      value={department}
                      onChange={handleDepartmentChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      required
                    >
                      <option value="">Select a department</option>
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      University
                    </label>
                    <input
                      type="text"
                      value={user?.universityName || 'KLE BCA Hubli'}
                      readOnly
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white cursor-not-allowed opacity-75' 
                          : 'bg-gray-100 border-gray-300 text-gray-900 cursor-not-allowed'
                      }`}
                    />
                  </div>

                  {submitError && (
                    <p className="mt-2 text-sm text-red-500">
                      {submitError}
                    </p>
                  )}

                  {submitSuccess && (
                    <p className="mt-2 text-sm text-green-500">
                      Faculty member created successfully!
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitLoading}
                    className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                      ${submitLoading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} 
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                  >
                    {submitLoading ? 'Creating...' : 'Create Faculty Member'}
                  </button>
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