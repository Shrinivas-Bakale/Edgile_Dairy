import axios from "axios";
import config from "../config";

// Use config.API_URL as the base URL
const API_BASE_URL = config.API_URL;

// Use this flag to toggle between real API calls and mock data
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === "true";

// Mock data for testing and development
const mockResponses = {
  adminProfile: {
    success: true,
    user: {
      _id: 'mock-admin-id',
      name: 'Mock Admin',
      email: 'admin@edgile.com',
      role: 'admin',
      createdAt: new Date().toISOString(),
      permissions: [
        'admin:profile',
        'admin:dashboard',
        'admin:users:manage'
      ]
    }
  },
  // Add more mock responses as needed
};

// Error handling utility - Single declaration
const handleApiError = (error: any) => {
  if (error.response) {
    // Get the most appropriate error message
    let errorMessage = '';
    
    if (typeof error.response.data === 'string') {
      errorMessage = error.response.data;
    } else if (error.response.data.message) {
      errorMessage = error.response.data.message;
    } else if (error.response.data.msg) {
      errorMessage = error.response.data.msg;
    } else if (error.response.data.error) {
      errorMessage = error.response.data.error;
    } else if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
      errorMessage = error.response.data.errors.map((e: any) => e.msg || e.message).join(', ');
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.error('API Error:', {
        url: error.config?.url,
        status: error.response.status,
        message: errorMessage
      });
    }
    
    return {
      message: errorMessage || 'An error occurred',
      status: error.response.status,
      data: error.response.data
    };
  } else if (error.request) {
    const message = 'No response received from server. Please check your connection.';
    
    if (process.env.NODE_ENV !== 'production') {
      console.error('Network Error:', {
        url: error.config?.url,
        message
      });
    }
    
    return {
      message,
      status: 0
    };
  } else {
    const message = error.message || 'An unexpected error occurred';
    
    if (process.env.NODE_ENV !== 'production') {
      console.error('Request Error:', {
        message,
        error
      });
    }
    
    return {
      message,
      status: 0
    };
  }
};

// Create an axios instance with mock interceptor
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Mock data interceptor
api.interceptors.request.use(async (config) => {
  if (USE_MOCK_DATA) {
    const mockPath = config.url?.replace(/^\/api\//, '');
    if (mockPath && mockResponses[mockPath as keyof typeof mockResponses]) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      throw {
        response: {
          data: mockResponses[mockPath as keyof typeof mockResponses],
          status: 200
        },
        isAxiosMockResponse: true
      };
    }
  }
  return config;
});

// List of public routes that don't require authentication
const publicRoutes = [
  '/api/admin/auth/login',
  '/api/admin/auth/verify-access-code',
  '/api/admin/auth/verify-super-admin-code',
  '/api/student/auth/login',
  '/api/student/auth/register',
  '/api/student/auth/verify-email',
  '/api/student/auth/verify-otp',
  '/api/faculty/auth/login',
  '/api/faculty/auth/register',
  '/api/universities/verify-code'
];

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Check if the request URL is a public route
    const isPublicRoute = publicRoutes.some(route => 
      config.url?.includes(route)
    );

    if (!isPublicRoute) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with mock support
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle mock responses
    if (error.isAxiosMockResponse) {
      return Promise.resolve(error.response);
    }

    // Special handling for admin profile endpoint
    if (error.config?.url === '/api/admin/auth/profile') {
      // Check if response is missing expected data
      if (!error.response?.data?.success || !error.response?.data?.user) {
        // Create a mock response with user data from localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData && userData.email) {
              // Return a successful response with the user data
              return Promise.resolve({
                data: {
                  success: true,
                  user: {
                    _id: userData._id || Math.random().toString(36).substr(2, 9),
                    name: userData.name || userData.email.split('@')[0] || 'Admin User',
                    email: userData.email,
                    role: 'admin',
                    createdAt: userData.createdAt || new Date().toISOString(),
                    permissions: userData.permissions || [
                      'admin:profile',
                      'admin:dashboard',
                      'admin:users:manage'
                    ]
                  }
                }
              });
            }
          } catch (err) {
            // Allow error to continue
          }
        }
      }
    }

    if (error.response?.status === 401) {
      // Clear auth data on 401 Unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/admin/access';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
const authAPI = {
  register: async (userData: any) => {
    // Determine role based on email domain
    let role = "student";
    if (userData.email.endsWith("@admin.edgile.com")) {
      role = "admin";
    } else if (userData.email.endsWith("@faculty.edgile.com")) {
      role = "faculty";
    }
    const response = await api.post(`/api/${role}/auth/register`, userData);
    return response.data;
  },

  verifyStudentOTP: async (verificationData: any) => {
    const response = await api.post(
      "/api/auth/verify-student-otp",
      verificationData
    );
    return response.data;
  },

  login: async (credentials: any) => {
    // Determine role based on email domain
    let role = "student";
    if (credentials.email.endsWith("@admin.edgile.com")) {
      role = "admin";
    } else if (credentials.email.endsWith("@faculty.edgile.com")) {
      role = "faculty";
    }

    // Use the correct endpoint based on role
    if (role === "admin") {
      return authAPI.adminLogin(credentials);
    } else if (role === "faculty") {
      const response = await api.post("/api/faculty/auth/login", credentials);
      return response.data;
    } else {
      const response = await api.post("/api/student/auth/login", {
        email: credentials.email,
        password: credentials.password,
        universityCode: credentials.universityCode,
      });
      return response.data;
    }
  },

  checkEmailExists: async (email: string) => {
    try {
      const response = await api.post("/api/admin/auth/check-email", { email });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  verifyCode: async (code: string) => {
    const response = await api.post("/api/auth/verify-code", { code });
    return response.data;
  },

  verifySuperAdminCode: async (code: string) => {
    try {
      const response = await api.post("/api/admin/auth/verify-super-admin-code", {
        superAdminCode: code,
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  verifyOtp: async (data: {
    email: string;
    otp: string;
    password: string;
    confirmPassword?: string;
  }) => {
    try {
      const response = await api.post("/api/admin/auth/verify-otp", data);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  adminLogin: async (credentials: any) => {
    try {
      const response = await api.post("/api/admin/auth/login", credentials);
      
      // Format the response in a consistent way
      const { token, message } = response.data;
      
      // Create user object with basic admin info if missing
      if (!response.data.user) {
        // Extract email from credentials
        const { email } = credentials;
        
        // Create a default admin user object
        const defaultUser = {
          _id: Math.random().toString(36).substr(2, 9), // temporary ID
          name: email.split('@')[0] || 'Admin User',
          email: email,
          role: 'admin',
          permissions: [
            'admin:profile',
            'admin:dashboard',
            'admin:users:manage',
            'admin:university:manage',
            'admin:faculty:manage',
            'admin:courses:view',
            'admin:reports:view'
          ]
        };
        
        return {
          success: true,
          message: message || 'Login successful',
          token,
          user: defaultUser
        };
      }
      
      // If user object exists, format it properly
      return {
        success: true,
        message: message || 'Login successful',
        token,
        user: {
          ...response.data.user,
          role: 'admin',
          permissions: response.data.user.permissions || [
            'admin:profile', 
            'admin:dashboard',
            'admin:users:manage',
            'admin:university:manage',
            'admin:faculty:manage',
            'admin:courses:view',
            'admin:reports:view'
          ]
        }
      };
    } catch (error: any) {
      console.error('Admin login error:', error);
      throw {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please check your credentials.'
      };
    }
  },

  verifyAccessCode: async (accessCode: string) => {
    const response = await api.post("/api/admin/auth/verify-access-code", {
      accessCode,
    });
    return response.data;
  },

  generateOTP: async (email: string) => {
    const response = await api.post("/api/admin/auth/generate-otp", { email });
    return response.data;
  },

  verifyOTP: async (email: string, otp: string) => {
    const response = await api.post("/api/admin/auth/verify-otp", { email, otp });
    return response.data;
  },

  checkToken: async () => {
    try {
      const response = await api.get("/api/admin/auth/check-token");
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  studentLogin: async (email: string, password: string, universityCode: string) => {
    try {
      const response = await api.post('/api/student/auth/login', {
        email,
        password,
        universityCode
      });
      
      return response.data;
    } catch (error: any) {
      throw handleApiError(error);
    }
  },

  facultyLogin: async (email: string, password: string, universityCode: string) => {
    try {
      const response = await api.post("/api/faculty/auth/login", {
        email,
        password,
        universityCode,
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  completeRegistration: async (data: { studentId: string; password: string }) => {
    try {
      const response = await api.post('/api/student/auth/complete-registration', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// Registration Codes API calls
const codesAPI = {
  generateCode: async (type: string) => {
    try {
      const response = await api.post("/api/admin/auth/registration-code", {
        type,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getAllCodes: async () => {
    try {
      const response = await api.get("/api/admin/auth/registration-codes");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  verifyCode: async (code: string) => {
    try {
      const response = await api.get(
        `/api/admin/auth/verify-registration-code/${code}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteCode: async (codeId: string) => {
    try {
      try {
        // First attempt: POST method with delete action
        const response = await api.post(
          `/api/admin/auth/registration-code/delete`,
          { id: codeId }
        );
        return response.data;
      } catch (err: any) {
        // If that fails, try a PUT method
        if (err.response && (err.response.status === 404 || err.response.status === 400)) {
          const response = await api.put(
            `/api/admin/auth/registration-codes/${codeId}`,
            { action: 'delete' }
          );
          return response.data;
        }
        
        // Last resort, try the original DELETE methods
        if (err.response && err.response.status === 404) {
          try {
            const response = await api.delete(`/api/admin/auth/registration-codes/${codeId}`);
            return response.data;
          } catch (deleteErr) {
            const queryResponse = await api.delete(`/api/admin/auth/registration-codes?id=${codeId}`);
            return queryResponse.data;
          }
        }
        throw err;
      }
    } catch (error: any) {
      throw error;
    }
  },
};

interface CreateFacultyData {
  name: string;
  email: string;
  password: string;
  department: string;
  employeeId: string;
  subjects?: string[];
  registrationCode: string;
  createdBy: string;
  universityName: string;
}

interface WelcomeEmailData {
  email: string;
  name: string;
  password: string;
  employeeId: string;
}

interface CompleteRegistrationData {
  phone: string;
  dateOfBirth: string;
  address: string;
  qualification: string;
  specialization: string;
  experience: string;
  researchInterests: string[];
  profileImage?: string;
  password?: string;
}

interface RegistrationCode {
  code: string;
  used: boolean;
  type: string;
  active?: boolean;
  createdBy?: string;
}

// Admin API calls
const adminAPI = {
  getStats: async () => {
    const response = await api.get("/api/admin/stats");
    return response.data;
  },
  
  // Classroom management functions
  getClassrooms: async (filters?: { floor?: number; status?: string; capacity?: number; name?: string }) => {
    try {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      if (filters) {
        if (filters.floor) queryParams.append('floor', filters.floor.toString());
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.capacity) queryParams.append('capacity', filters.capacity.toString());
        if (filters.name) queryParams.append('name', filters.name);
      }
      
      const queryString = queryParams.toString();
      const url = queryString ? `/api/admin/classrooms?${queryString}` : '/api/admin/classrooms';
      
      console.log('Fetching classrooms from URL:', url);
      
      const response = await api.get(url);
      console.log('Classroom API response:', response.data);
      
      // Handle different possible response formats
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      
      if (response.data?.success && response.data?.classrooms) {
        return response.data.classrooms;
      }
      
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching classrooms:', error);
      return [];
    }
  },
  
  getClassroomById: async (id: string) => {
    try {
      const response = await api.get(`/api/admin/classrooms/${id}`);
      
      if (response.data?.success && response.data?.classroom) {
        return response.data.classroom;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  },
  
  createClassroom: async (classroom: { name: string; floor: number; capacity: number }) => {
    try {
      const response = await api.post('/api/admin/classrooms', classroom);
      
      if (response.data?.success && response.data?.classroom) {
        return {
          success: true,
          classroom: response.data.classroom,
          message: response.data.msg || 'Classroom created successfully'
        };
      }
      
      return {
        success: false,
        message: 'Failed to create classroom'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.msg || 'Error creating classroom'
      };
    }
  },
  
  updateClassroom: async (id: string, data: { name?: string; floor?: number; capacity?: number; status?: string }) => {
    try {
      const response = await api.put(`/api/admin/classrooms/${id}`, data);
      
      if (response.data?.success && response.data?.classroom) {
        return {
          success: true,
          classroom: response.data.classroom,
          message: response.data.msg || 'Classroom updated successfully'
        };
      }
      
      return {
        success: false,
        message: 'Failed to update classroom'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.msg || 'Error updating classroom'
      };
    }
  },
  
  deleteClassroom: async (id: string) => {
    try {
      const response = await api.delete(`/api/admin/classrooms/${id}`);
      
      if (response.data?.success) {
        return {
          success: true,
          message: response.data.msg || 'Classroom deleted successfully'
        };
      }
      
      return {
        success: false,
        message: 'Failed to delete classroom'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.msg || 'Error deleting classroom'
      };
    }
  },
  
  getClassroomUnavailability: async () => {
    try {
      const response = await api.get('/api/admin/classroom-unavailability');
      
      if (response.data?.success && response.data?.records) {
        return response.data.records;
      }
      
      return [];
    } catch (error) {
      return [];
    }
  },
  
  markClassroomUnavailable: async (data: {
    classroomId: string;
    startDate: string | Date;
    endDate?: string | Date;
    reason?: string;
    substituteClassroomId?: string;
  }) => {
    try {
      const response = await api.post('/api/admin/classroom-unavailability', data);
      
      if (response.data?.success && response.data?.unavailability) {
        return {
          success: true,
          unavailability: response.data.unavailability,
          message: response.data.msg || 'Classroom marked as unavailable successfully'
        };
      }
      
      return {
        success: false,
        message: 'Failed to mark classroom as unavailable'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.msg || 'Error marking classroom as unavailable'
      };
    }
  },
  
  getClassroomOccupancy: async () => {
    try {
      const response = await api.get('/api/admin/classrooms/occupancy');
      
      if (response.data?.success && response.data?.occupancyData) {
        return response.data.occupancyData;
      }
      
      return [];
    } catch (error) {
      console.warn('Classroom occupancy data is not available, continuing without it:', error);
      // Return empty array to handle this data as optional
      return [];
    }
  },
  
  getSubstituteClassroomSuggestions: async (classroomId: string, startDate: string | Date, endDate?: string | Date) => {
    try {
      // Build query string
      const queryParams = new URLSearchParams();
      queryParams.append('classroomId', classroomId);
      queryParams.append('startDate', startDate.toString());
      if (endDate) queryParams.append('endDate', endDate.toString());
      
      const response = await api.get(`/api/admin/classrooms/suggestions?${queryParams.toString()}`);
      
      if (response.data?.success && response.data?.suggestions) {
        return response.data.suggestions;
      }
      
      return [];
    } catch (error) {
      return [];
    }
  },
  
  // Add the new functions for registration logs
  getRegistrationLogs: async (options: {
    role?: 'faculty' | 'student';
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}) => {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (options.role) {
        queryParams.append('role', options.role);
      }
      
      if (options.limit) {
        queryParams.append('limit', options.limit.toString());
      }
      
      if (options.sort) {
        queryParams.append('sort', options.sort);
      }
      
      if (options.order) {
        queryParams.append('order', options.order);
      }
      
      const queryString = queryParams.toString();
      const url = queryString ? `/api/admin/registration-logs?${queryString}` : '/api/admin/registration-logs';
      
      const response = await api.get(url);
      
      if (response.data?.logs && Array.isArray(response.data.logs)) {
        return response.data.logs;
      }
      
      return [];
    } catch (error: any) {
      return [];
    }
  },

  getLatestRegistrations: async () => {
    try {
      const response = await api.get('/api/admin/latest-registrations');
      
      if (response.data?.latest) {
        return response.data.latest;
      }
      
      return { faculty: null, student: null };
    } catch (error: any) {
      return { faculty: null, student: null };
    }
  },

  getLoginLogs: async (limit?: number) => {
    try {
      const url = limit ? `/api/admin/logs?limit=${limit}` : '/api/admin/logs';
      const response = await api.get(url);
      
      // Handle different response formats
      if (response.data?.logs && Array.isArray(response.data.logs)) {
        return response.data.logs;
      }
      
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      // Try to extract logs from unexpected format
      return response.data?.logs || response.data || [];
    } catch (error) {
      // Return empty array to prevent UI errors
      return [];
    }
  },

  getAllUsers: async () => {
    try {
      const response = await api.get('/api/admin/users');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getStudents: async () => {
    try {
      const response = await api.get('/api/admin/students');
      
      // Handle different response formats
      if (response.data?.students && Array.isArray(response.data.students)) {
        return response.data.students;
      }
      
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      // Try to extract students from unexpected format
      return response.data?.students || response.data || [];
    } catch (error) {
      // Return empty array to prevent UI errors
      return [];
    }
  },

  getFacultyMembers: async () => {
    try {
      const response = await api.get('/api/admin/faculty');
      
      // Handle different response formats
      if (response.data?.faculty && Array.isArray(response.data.faculty)) {
        return response.data.faculty;
      }
      
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      // Try to extract faculty from unexpected format
      return response.data?.faculty || response.data || [];
    } catch (error) {
      throw error;
    }
  },

  getRegistrationCodes: async () => {
    try {
      const response = await api.get('/api/admin/auth/registration-codes');
      
      // Handle {success, registrationCodes} format
      if (response.data?.registrationCodes && Array.isArray(response.data.registrationCodes)) {
        return response.data.registrationCodes;
      }
      
      // Handle direct array format
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      // Handle {success, data} format
      if (response.data?.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      
      // Handle {success, codes} format
      if (response.data?.codes && Array.isArray(response.data.codes)) {
        return response.data.codes;
      }
      
      return [];
    } catch (error) {
      throw error;
    }
  },

  markCodeAsUsed: async (code: string) => {
    try {
      const response = await api.put(
        `/api/admin/auth/registration-code/${code}/use`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createFaculty: async (facultyData: CreateFacultyData) => {
    try {
      const response = await api.post('/api/admin/auth/faculty/register', facultyData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  sendFacultyWelcomeEmail: async (emailData: WelcomeEmailData) => {
    try {
      const response = await api.post('/api/admin/auth/faculty/welcome-email', emailData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  completeFacultyRegistration: async (token: string, data: CompleteRegistrationData) => {
    try {
      const response = await api.post(`/api/admin/auth/faculty/complete-registration/${token}`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Subject Management
  getSubjects: async (options: {
    year?: string;
    semester?: number;
    archived?: boolean;
    academicYear?: string;
  } = {}) => {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (options.year) {
        queryParams.append('year', options.year);
      }
      
      if (options.semester) {
        queryParams.append('semester', options.semester.toString());
      }
      
      if (options.archived !== undefined) {
        queryParams.append('archived', options.archived.toString());
      }
      
      if (options.academicYear) {
        queryParams.append('academicYear', options.academicYear);
      }
      
      const queryString = queryParams.toString();
      const url = queryString ? `/api/admin/subjects?${queryString}` : '/api/admin/subjects';
      
      const response = await api.get(url);
      
      if (response.data?.success && Array.isArray(response.data.subjects)) {
        return {
          success: true,
          subjects: response.data.subjects,
          count: response.data.count || response.data.subjects.length
        };
      }
      
      return {
        success: false,
        subjects: [],
        message: response.data?.msg || 'Failed to fetch subjects'
      };
    } catch (error: any) {
      return {
        success: false,
        subjects: [],
        message: error.response?.data?.msg || 'Error fetching subjects'
      };
    }
  },
  
  getSubjectById: async (id: string) => {
    try {
      const response = await api.get(`/api/admin/subjects/${id}`);
      
      if (response.data?.success && response.data.subject) {
        return {
          success: true,
          subject: response.data.subject,
          facultyPreferences: response.data.facultyPreferences || []
        };
      }
      
      return {
        success: false,
        message: 'Failed to retrieve subject'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.msg || 'Error fetching subject details'
      };
    }
  },
  
  createSubject: async (subjectData: {
    subjectName: string;
    subjectCode: string;
    type: 'core' | 'lab' | 'elective';
    totalDuration: number;
    year: string;
    semester: number;
    academicYear: string;
  }) => {
    try {
      const response = await api.post('/api/admin/subjects', subjectData);
      
      if (response.data?.success && response.data.subject) {
        return {
          success: true,
          subject: response.data.subject,
          message: response.data.msg || 'Subject created successfully'
        };
      }
      
      return {
        success: false,
        message: 'Failed to create subject'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.msg || 'Error creating subject'
      };
    }
  },
  
  updateSubject: async (id: string, subjectData: {
    subjectName?: string;
    subjectCode?: string;
    type?: 'core' | 'lab' | 'elective';
    totalDuration?: number;
    year?: string;
    semester?: number;
    archived?: boolean;
  }) => {
    try {
      const response = await api.put(`/api/admin/subjects/${id}`, subjectData);
      
      if (response.data?.success && response.data.subject) {
        return {
          success: true,
          subject: response.data.subject,
          message: response.data.msg || 'Subject updated successfully'
        };
      }
      
      return {
        success: false,
        message: 'Failed to update subject'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.msg || 'Error updating subject'
      };
    }
  },
  
  archiveSubject: async (id: string) => {
    try {
      const response = await api.delete(`/api/admin/subjects/${id}`);
      
      if (response.data?.success) {
        return {
          success: true,
          message: response.data.msg || 'Subject archived successfully'
        };
      }
      
      return {
        success: false,
        message: 'Failed to archive subject'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.msg || 'Error archiving subject'
      };
    }
  },
  
  copySubjects: async (copyData: {
    sourceYear: string;
    targetYear: string;
    year: string;
    semester: number;
  }) => {
    try {
      const response = await api.post('/api/admin/subjects/copy', copyData);
      
      if (response.data?.success) {
        return {
          success: true,
          subjects: response.data.subjects || [],
          message: response.data.msg || 'Subjects copied successfully'
        };
      }
      
      return {
        success: false,
        message: 'Failed to copy subjects'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.msg || 'Error copying subjects'
      };
    }
  },
  
  getAcademicYears: async () => {
    try {
      const response = await api.get('/api/admin/subjects/academic-years');
      
      if (response.data?.success && Array.isArray(response.data.academicYears)) {
        // academicYears are already formatted on the backend
        return response.data.academicYears;
      }
      
      return [];
    } catch (error) {
      return [];
    }
  },
  
  getFacultyPreferences: async (options: {
    academicYear?: string;
    year?: string;
    semester?: number;
    subjectId?: string;
  } = {}) => {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (options.academicYear) {
        queryParams.append('academicYear', options.academicYear);
      }
      
      if (options.year) {
        queryParams.append('year', options.year);
      }
      
      if (options.semester) {
        queryParams.append('semester', options.semester.toString());
      }
      
      if (options.subjectId) {
        queryParams.append('subjectId', options.subjectId);
      }
      
      const queryString = queryParams.toString();
      const url = queryString ? `/api/admin/faculty-preferences?${queryString}` : '/api/admin/faculty-preferences';
      
      const response = await api.get(url);
      
      if (response.data?.success && Array.isArray(response.data.preferences)) {
        return response.data.preferences;
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }
};

// Faculty API calls
const facultyAPI = {
  getStats: async () => {
    const response = await api.get("/api/faculty/stats");
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    try {
      // Validate new password meets requirements
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        throw new Error("Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character (@$!%*?&)");
      }

      const response = await api.post("/api/faculty/auth/change-password", {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  completeProfile: async (profileData: {
    phone: string;
    dateOfBirth: string;
    address: string;
    qualification: string;
    specialization: string;
    experience: string;
    researchInterests: string[];
    profileImage?: string;
  }) => {
    try {
      const response = await api.post("/api/faculty/profile/complete", profileData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Get all courses assigned to faculty
  getCourses: async () => {
    try {
      const response = await api.get('/api/faculty/courses');
      return response.data;
    } catch (error) {
      const err = handleApiError(error);
      return { success: false, courses: [], message: err.message };
    }
  },
  
  // Get a specific course by ID
  getCourseById: async (courseId: string) => {
    try {
      const response = await api.get(`/api/faculty/courses/${courseId}`);
      return response.data;
    } catch (error) {
      const err = handleApiError(error);
      return { success: false, course: null, message: err.message };
    }
  },
  
  // Get all classrooms (read-only for faculty)
  getClassrooms: async (filters = {}) => {
    try {
      const response = await api.get('/api/faculty/classrooms', { params: filters });
      return response.data;
    } catch (error) {
      const err = handleApiError(error);
      return { success: false, classrooms: [], message: err.message };
    }
  },
  
  // Get classroom details by ID
  getClassroomById: async (classroomId: string) => {
    try {
      const response = await api.get(`/api/faculty/classrooms/${classroomId}`);
      return response.data;
    } catch (error) {
      const err = handleApiError(error);
      return { success: false, classroom: null, message: err.message };
    }
  },
  
  // Get classroom availability
  getClassroomAvailability: async (classroomId: string, date: string) => {
    try {
      const response = await api.get(`/api/faculty/classrooms/${classroomId}/availability`, {
        params: { date }
      });
      return response.data;
    } catch (error) {
      const err = handleApiError(error);
      return { success: false, availability: [], message: err.message };
    }
  }
};

// University API calls
const universityAPI = {
  getUniversities: async () => {
    try {
      const response = await api.get('/api/universities');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  
  verifyCode: async (code: string) => {
    try {
      const response = await api.post('/api/universities/verify-code', { code });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
};

// Student API calls
const studentAuthAPI = {
  verifyCode: async (data: { 
    name: string; 
    email: string; 
    registerNumber: string; 
    universityCode: string;
    division: string;
    classYear: number;
    semester: number;
    phone: string;
  }) => {
    try {
      const response = await api.post('/api/student/auth/verify-code', data);
      return response.data;
    } catch (error: any) {
      throw handleApiError(error);
    }
  },

  verifyOtp: async (data: { studentId: string; otp: string; password?: string }) => {
    try {
      const response = await api.post('/api/student/auth/verify-otp', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  
  completeRegistration: async (data: { studentId: string; password: string }) => {
    try {
      const response = await api.post('/api/student/auth/complete-registration', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Read-only view of subjects for students
  getSubjects: async (options: {
    year?: string;
    semester?: number;
    academicYear?: string;
  } = {}) => {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (options.year) {
        queryParams.append('year', options.year);
      }
      
      if (options.semester) {
        queryParams.append('semester', options.semester.toString());
      }
      
      if (options.academicYear) {
        queryParams.append('academicYear', options.academicYear);
      }
      
      const queryString = queryParams.toString();
      const url = queryString ? `/api/student/subjects?${queryString}` : '/api/student/subjects';
      
      const response = await api.get(url);
      
      if (response.data?.success && Array.isArray(response.data.subjects)) {
        return response.data.subjects;
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }
};

// Student API for courses
const studentAPI = {
  // Get all courses for a student
  getCourses: async () => {
    try {
      const response = await api.get('/api/student/courses');
      return response.data;
    } catch (error) {
      const err = handleApiError(error);
      return { success: false, courses: [], message: err.message };
    }
  },
  
  // Get a specific course by ID
  getCourseById: async (courseId: string) => {
    try {
      const response = await api.get(`/api/student/courses/${courseId}`);
      return response.data;
    } catch (error) {
      const err = handleApiError(error);
      return { success: false, course: null, message: err.message };
    }
  },
  
  // Get student profile
  getProfile: async () => {
    try {
      const response = await api.get('/api/student/profile');
      return response.data;
    } catch (error) {
      const err = handleApiError(error);
      return { success: false, student: null, message: err.message };
    }
  }
};

// Export all APIs together
export {
  authAPI,
  universityAPI,
  adminAPI,
  facultyAPI,
  studentAPI,
  codesAPI,
  studentAuthAPI
};

// Export individual functions
export const { 
  studentLogin, 
  facultyLogin,
  getUniversities
} = {
  ...authAPI,
  ...universityAPI
};

// Add new functions for student registration flows
export const verifyUniversityCode = async (code: string) => {
  try {
    const response = await api.post('/api/universities/verify-code', { 
      code: code 
    });
    
    if (response.data.success) {
      return {
        verified: true,
        universityName: response.data.universityName
      };
    } else {
      return {
        verified: false,
        message: response.data.message || "Failed to verify university code"
      };
    }
  } catch (error: any) {
    return {
      verified: false,
      message: error.response?.data?.message || "Invalid or expired university code"
    };
  }
};

export const verifyEmail = async (email: string, registerNumber: string, universityCode: string) => {
  try {
    const response = await api.post('/api/student/auth/verify-email', { 
      email, 
      registerNumber, 
      universityCode 
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const studentRegister = async (
  name: string,
  email: string,
  registerNumber: string,
  universityCode: string,
  password: string
) => {
  try {
    const response = await api.post('/api/student/auth/register', {
      name,
      email,
      registerNumber,
      universityCode,
      password
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Export the api instance
export default api;
