import config from "../config";

/**
 * API client for making authenticated requests to the backend
 */
class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private customHeaders: Record<string, string>;
  private token: string | null;
  private requestQueue: Map<string, Promise<any>>;
  private pendingRequests: Set<string>;
  private isRefreshing: boolean;
  private refreshSubscribers: Array<(token: string) => void>;

  constructor() {
    // Use the configured API URL
    this.baseUrl = config.API_URL;
    
    // Default headers
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // No custom headers by default
    this.customHeaders = {};
    
    // No token by default
    this.token = null;
    
    // Initialize request tracking
    this.requestQueue = new Map();
    this.pendingRequests = new Set();
    this.isRefreshing = false;
    this.refreshSubscribers = [];

    // Initialize token from localStorage
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      this.token = storedToken;
      console.log('[API] Token initialized from localStorage');
    }
  }

  /**
   * Set authentication token for subsequent requests
   */
  setToken(token: string | null): void {
    this.token = token;
    
    if (token) {
      console.log('[API] Authentication token set successfully');
      // Store token in localStorage
      localStorage.setItem('token', token);
    } else {
      console.log('[API] Authentication token cleared');
      // Remove token from localStorage
      localStorage.removeItem('token');
    }
  }

  /**
   * Subscribe to token refresh
   */
  private subscribeTokenRefresh(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  /**
   * Notify subscribers of token refresh
   */
  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.forEach(cb => cb(token));
    this.refreshSubscribers = [];
  }

  /**
   * Handle token refresh
   */
  private async refreshToken(): Promise<string> {
    try {
      this.isRefreshing = true;
      
      // Get stored user data
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        throw new Error('No user data found');
      }

      const user = JSON.parse(storedUser);
      
      // Call refresh token endpoint
      const response = await fetch(`${this.baseUrl}/api/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          role: user.role
        })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      const newToken = data.token;

      // Update token
      this.setToken(newToken);
      this.onTokenRefreshed(newToken);

      return newToken;
    } catch (error) {
      console.error('[API] Token refresh failed:', error);
      // Clear token and user data
      this.setToken(null);
      localStorage.removeItem('user');
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Set custom headers for subsequent requests
   */
  setCustomHeaders(headers: Record<string, string>): void {
    this.customHeaders = { ...headers };
  }

  /**
   * Clear any custom headers that were set
   */
  clearCustomHeaders(): void {
    this.customHeaders = {};
  }

  /**
   * Get authentication headers for requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...this.customHeaders,
    };
    
    // Add auth token if available
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
      console.log('[API] Using authentication token in request headers');
    } else {
      console.warn('[API] No authentication token available for request');
    }
    
    // Log headers for debugging (excluding Authorization details)
    const debugHeaders = { ...headers };
    if (debugHeaders.Authorization) {
      debugHeaders.Authorization = 'Bearer [REDACTED]';
    }
    console.log('[API] Request headers:', debugHeaders);
    
    return headers;
  }

  /**
   * Handle API response with error handling
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // Handle different response status codes
    if (response.status === 429) {
      throw new Error('RATE_LIMITED');
    }
    
    if (response.status === 401) {
      console.error('[API] Authentication failed: 401 Unauthorized', {
        url: response.url,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      // Try to refresh token if not already refreshing
      if (!this.isRefreshing) {
        try {
          const newToken = await this.refreshToken();
          // Retry the original request with new token
          const retryResponse = await fetch(response.url, {
            ...response,
            headers: {
              ...response.headers,
              Authorization: `Bearer ${newToken}`
            }
          });
          return this.handleResponse<T>(retryResponse);
        } catch (error) {
          // If refresh fails, clear auth state and throw error
          this.setToken(null);
          localStorage.removeItem('user');
          const authError = new Error('Session expired. Please login again.');
          authError.name = 'AuthError';
          throw authError;
        }
      }
      
      // If already refreshing, wait for refresh to complete
      return new Promise((resolve, reject) => {
        this.subscribeTokenRefresh((token: string) => {
          // Retry the original request with new token
          fetch(response.url, {
            ...response,
            headers: {
              ...response.headers,
              Authorization: `Bearer ${token}`
            }
          })
            .then(res => resolve(this.handleResponse<T>(res)))
            .catch(reject);
        });
      });
    }
    
    if (response.status === 403) {
      console.error('[API] Authorization failed: 403 Forbidden', {
        url: response.url
      });
      
      const forbiddenError = new Error('Forbidden - You do not have permission to access this resource');
      forbiddenError.name = 'ForbiddenError';
      throw forbiddenError;
    }
    
    // Handle JSON response
    try {
      const data = await response.json();
      
      // Log API errors with status code
      if (!response.ok) {
        console.error('API Error Response: ', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          data
        });
        
        // Extract error message from response or create default message
        const errorMessage = data.message || data.error || `Request failed with status ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }
      
      return data as T;
    } catch (error) {
      if (error instanceof SyntaxError) {
        // Handle non-JSON responses
        const text = await response.text();
        console.warn('[API] Response was not valid JSON:', text.substring(0, 150) + (text.length > 150 ? '...' : ''));
        
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
        }
        
        return { text } as unknown as T;
      }
      
      throw error;
    }
  }

  /**
   * Create a cache key for request deduplication
   */
  private createCacheKey(method: string, path: string, data?: any): string {
    if (data) {
      return `${method}-${path}-${JSON.stringify(data)}`;
    }
    return `${method}-${path}`;
  }

  /**
   * Make a GET request to the API with debouncing
   */
  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    
    // Add query parameters if provided
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Convert the value to string if it's not already (handles objects or numbers)
          const stringValue = typeof value === 'string' ? value : String(value);
          url.searchParams.append(key, stringValue);
        }
      });
    }

    const cacheKey = this.createCacheKey('GET', url.toString());
    
    // If this exact request is already in progress, return the existing promise
    if (this.requestQueue.has(cacheKey)) {
      console.log(`Reusing in-flight request for ${url.toString()}`);
      return this.requestQueue.get(cacheKey)!;
    }
    
    // Set up request with timeout and retry logic
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.apiTimeout);
    
    const executeRequest = async (retries = 2): Promise<T> => {
      try {
        // Verify authentication status for each request
        if (this.token) {
          console.log(`[API] Authenticated request to ${url.toString()}`);
        } else {
          console.warn(`[API] Unauthenticated request to ${url.toString()}`);
        }
        
        // Log if we have custom headers
        if (this.customHeaders && Object.keys(this.customHeaders).length > 0) {
          console.log(`[API] Custom headers for GET ${url.toString()}:`, this.customHeaders);
        }
        
        // Log complete request URL and credentials mode
        console.log(`[API] Making GET request to: ${url.toString()} with credentials: include`);
        
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: this.getHeaders(),
          signal: controller.signal,
          credentials: 'include' // Changed from 'same-origin' to 'include' for cross-origin auth
        });
        
        // Log response status for debugging
        console.log(`[API] Response status for ${url.toString()}: ${response.status} ${response.statusText}`);
        
        return await this.handleResponse<T>(response);
    } catch (error: any) {
        if (error.message === 'RATE_LIMITED' && retries > 0) {
          return executeRequest(retries - 1);
        }
      throw error;
      } finally {
        if (retries === 2) { // Only on the first try
          this.pendingRequests.delete(cacheKey);
          this.requestQueue.delete(cacheKey);
          clearTimeout(timeoutId);
        }
      }
    };

    // Store the request promise in the queue
    const requestPromise = executeRequest();
    this.requestQueue.set(cacheKey, requestPromise);
    this.pendingRequests.add(cacheKey);
    
    return requestPromise;
  }

  /**
   * Make a POST request to the API with debouncing
   */
  async post<T>(path: string, body: any): Promise<T> {
    const cacheKey = this.createCacheKey('POST', path, body);
    
    // If this exact request is already in progress, return the existing promise
    if (this.requestQueue.has(cacheKey)) {
      console.log(`Reusing in-flight request for POST ${path}`);
      return this.requestQueue.get(cacheKey)!;
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.apiTimeout);
    
    const executeRequest = async (retries = 2): Promise<T> => {
      try {
        // Log custom headers if they exist
        if (this.customHeaders && Object.keys(this.customHeaders).length > 0) {
          console.log(`[API] Custom headers for POST ${path}:`, this.customHeaders);
        }
        
        const response = await fetch(`${this.baseUrl}${path}`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
          signal: controller.signal,
          credentials: 'include' // Changed from 'same-origin' to 'include' for cross-origin auth
        });
        
        return await this.handleResponse<T>(response);
    } catch (error: any) {
        if (error.message === 'RATE_LIMITED' && retries > 0) {
          return executeRequest(retries - 1);
        }
      throw error;
      } finally {
        if (retries === 2) { // Only on the first try
          this.pendingRequests.delete(cacheKey);
          this.requestQueue.delete(cacheKey);
          clearTimeout(timeoutId);
        }
      }
    };
    
    // Store the request promise in the queue
    const requestPromise = executeRequest();
    this.requestQueue.set(cacheKey, requestPromise);
    this.pendingRequests.add(cacheKey);
    
    return requestPromise;
  }

  /**
   * Make a PUT request to the API
   */
  async put<T>(path: string, body: any): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.apiTimeout);
    
    const executeRequest = async (retries = 2): Promise<T> => {
      try {
        // Log custom headers if they exist
        if (this.customHeaders && Object.keys(this.customHeaders).length > 0) {
          console.log(`[API] Custom headers for PUT ${path}:`, this.customHeaders);
        }
        
        const response = await fetch(`${this.baseUrl}${path}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
          signal: controller.signal,
          credentials: 'include' // Changed from 'same-origin' to 'include' for cross-origin auth
        });
        
        return await this.handleResponse<T>(response);
    } catch (error: any) {
        if (error.message === 'RATE_LIMITED' && retries > 0) {
          return executeRequest(retries - 1);
        }
      throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    };
    
    return executeRequest();
  }

  /**
   * Make a DELETE request to the API
   */
  async delete<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.apiTimeout);
    
    const executeRequest = async (retries = 2): Promise<T> => {
      try {
        // Log custom headers if they exist
        if (this.customHeaders && Object.keys(this.customHeaders).length > 0) {
          console.log(`[API] Custom headers for DELETE ${path}:`, this.customHeaders);
        }
        
        const response = await fetch(`${this.baseUrl}${path}`, {
          method: 'DELETE',
          headers: this.getHeaders(),
          signal: controller.signal,
          credentials: 'include' // Changed from 'same-origin' to 'include' for cross-origin auth
        });
        
        return await this.handleResponse<T>(response);
      } catch (error: any) {
        if (error.message === 'RATE_LIMITED' && retries > 0) {
          return executeRequest(retries - 1);
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    };
    
    return executeRequest();
  }
}

// Create a singleton instance
const api = new ApiClient();

// Auth API wrapper
export const authAPI = {
  login: async (data: { 
    email: string; 
    password: string; 
    universityCode?: string;
  }) => {
    return api.post('/api/auth/login', data);
  },
  
  register: async (data: { 
    name: string; 
    email: string; 
    password: string; 
    universityCode: string; 
  }) => {
    return api.post('/api/auth/register', data);
  },
  
  adminLogin: async (data: { 
    email: string; 
    password: string;
  }) => {
    return api.post('/api/auth/admin/login', data);
  },
  
  verifyOTP: async (email: string, otp: string) => {
    return api.post('/api/auth/admin/verify-otp', { email, otp });
  },
  
  checkAdminEmail: async (email: string) => {
    return api.get('/api/auth/admin/check-email', { email });
  },
  
  checkEmailExists: async (email: string) => {
    return api.get('/api/auth/check-email', { email });
  },
  
  verifyStudentOTP: async (data: {
    email: string;
    otp: string;
    password: string;
    name: string;
    universityCode: string;
  }) => {
    return api.post('/api/auth/student/verify-otp', data);
  },
  
  // Admin access verification
  verifyAccessCode: async (accessCode: string) => {
    return api.post('/api/auth/admin/verify-access-code', { accessCode });
  },
  
  generateOTP: async (data: { 
    email: string;
    name: string;
    universityName: string;
    superAdminCode?: string;
  }) => {
    return api.post('/api/auth/admin/generate-otp', data);
  },
  
  adminVerifyOTP: async (data: {
    email: string;
    otp: string;
    password: string;
    name: string;
    universityName: string;
  }) => {
    return api.post('/api/auth/admin/verify-otp', data);
  }
};

// Response interfaces for type safety
interface FacultyResponse {
  success?: boolean;
  faculty?: any[];
  [key: string]: any;
}

interface StudentResponse {
  success?: boolean;
  students?: any[];
  [key: string]: any;
}

// Admin profile response interface
interface AdminProfileResponse {
  success: boolean;
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    permissions: string[];
  };
  message?: string;
}

// Response interfaces for classroom data
interface ClassroomResponse {
  success?: boolean;
  classrooms?: any[];
  [key: string]: any;
}

// Improved response interface for classroom occupancy
interface ClassroomOccupancyResponse {
  success: boolean;
  occupancyData: Array<{
    id: string;
    name: string;
    floor: number;
    capacity: number;
    status: string;
    occupiedBy: string | null;
    occupiedByYear?: string | null;
    occupiedBySemester?: number | null;
    occupiedByDivision?: string | null;
    timetableId?: string | null;
    unavailabilityInfo: any | null;
    occupancyPercentage: number;
  }>;
  [key: string]: any;
}

// Registration code response interface
interface RegistrationCodeResponse {
  success?: boolean;
  registrationCodes?: any[];
  codes?: any[];
  [key: string]: any;
}

// Class response interface
interface ClassResponse {
  success?: boolean;
  classes?: any[];
  data?: any[];
  [key: string]: any;
}

// Academic years response interface
interface AcademicYearsResponse {
  success: boolean;
  academicYears: string[];
  [key: string]: any;
}

// Admin API wrapper
export const adminAPI = {
  // Add getProfile method
  getProfile: async (): Promise<AdminProfileResponse> => {
    return api.get('/api/admin/auth/profile');
  },
  
  // Faculty management
  getFaculty: async () => {
    const response = await api.get<FacultyResponse>('/api/admin/faculty');
      // Handle different response formats
    if (response.faculty) return response.faculty;
    return response;
  },
  
  getFacultyMembers: async () => {
    const response = await api.get<FacultyResponse>('/api/admin/faculty');
    // Return the faculty array directly if it exists
    if (response.faculty && Array.isArray(response.faculty)) return response.faculty;
    if (Array.isArray(response)) return response;
      return [];
  },
  
  addFaculty: async (data: any) => {
    return api.post('/api/admin/faculty', data);
  },
  
  // Student management
  getStudents: async () => {
    const response = await api.get<StudentResponse>('/api/admin/students');
      // Handle different response formats
    if (response.students && Array.isArray(response.students)) return response.students;
    if (Array.isArray(response)) return response;
      return [];
  },
  
  // University management
  getUniversities: async () => {
    return api.get('/api/admin/universities');
  },
  
  // Classroom management
  getClassrooms: async () => {
    const response = await api.get<ClassroomResponse>('/api/admin/classrooms');
      // Handle different response formats
    if (response.success && response.classrooms && Array.isArray(response.classrooms)) {
      console.log("Returning classrooms array from response.classrooms");
      return response.classrooms;
      }
    if (response.data && Array.isArray(response.data)) {
      console.log("Returning classrooms array from response.data");
        return response.data;
      }
    if (Array.isArray(response)) {
      console.log("Returning classrooms direct array response");
      return response;
    }
    console.warn("Unexpected response format from classroom endpoint:", response);
    return [];
  },
  
  getClassroomOccupancy: async () => {
    const response = await api.get<ClassroomOccupancyResponse>('/api/admin/classrooms/occupancy');
    // Check if we got the expected structure and return the occupancyData array
    if (response.success && response.occupancyData && Array.isArray(response.occupancyData)) {
      return response.occupancyData;
    }
    // If the server returned data in a different format, try to handle it
    if (Array.isArray(response)) return response;
    
    // As a fallback, return an empty array rather than failing
    console.warn('Unexpected response format from classroom occupancy endpoint:', response);
      return [];
  },
  
  addClassroom: async (data: any) => {
    return api.post('/api/admin/classrooms', data);
  },
  
  // Add the missing createClassroom function as an alias for addClassroom
  createClassroom: async (data: any) => {
    return api.post('/api/admin/classrooms', data);
  },
  
  updateClassroom: async (id: string, data: any) => {
    return api.put(`/api/admin/classrooms/${id}`, data);
  },
  
  getClassroomById: async (id: string) => {
    console.log("API: getClassroomById called with ID:", id);
    try {
      const response = await api.get(`/api/admin/classrooms/${id}`);
      console.log("API: Raw classroom response:", JSON.stringify(response));
      
      // Handle different response formats
      if (response && typeof response === 'object') {
        // Define a type for classroom with required fields
        type ClassroomObject = {
          _id: string;
          name: string;
          floor: number;
          capacity: number;
          status: string;
        };

        // Check if response has required classroom fields directly
        const checkDirectClassroom = response as any;
        if (checkDirectClassroom._id && 
            checkDirectClassroom.name && 
            typeof checkDirectClassroom.floor !== 'undefined' && 
            typeof checkDirectClassroom.capacity !== 'undefined') {
          console.log("API: Found classroom object directly in response");
          return checkDirectClassroom as ClassroomObject;
        }
        
        // Check for response.classroom format
        const checkClassroomProp = response as { classroom?: any };
        if (checkClassroomProp.classroom && typeof checkClassroomProp.classroom === 'object') {
          console.log("API: Found classroom object in response.classroom");
          return checkClassroomProp.classroom as ClassroomObject;
        }
        
        // Check for response.data format
        const checkDataProp = response as { data?: any };
        if (checkDataProp.data && typeof checkDataProp.data === 'object') {
          console.log("API: Found classroom object in response.data");
          return checkDataProp.data as ClassroomObject;
        }
      }
      
      console.warn("API: Could not find classroom data in response:", response);
      return response;
    } catch (error) {
      console.error("API: Error in getClassroomById:", error);
      throw error;
    }
  },
  
  deleteClassroom: async (id: string) => {
    return api.delete(`/api/admin/classrooms/${id}`);
  },
  
  // Subject management
  getSubjects: async (queryParams?: any) => {
    return api.get('/api/admin/subjects', queryParams);
  },
  
  addSubject: async (data: any) => {
    return api.post('/api/admin/subjects', data);
  },
  
  // Add the missing createSubject function as an alias for addSubject
  createSubject: async (data: any) => {
    return api.post('/api/admin/subjects', data);
  },
  
  updateSubject: async (id: string, data: any) => {
    return api.put(`/api/admin/subjects/${id}`, data);
  },
  
  getSubjectById: async (id: string) => {
    return api.get(`/api/admin/subjects/${id}`);
  },
  
  // Add archiveSubject method
  archiveSubject: async (id: string) => {
    return api.put(`/api/admin/subjects/${id}`, { archived: true });
  },
  
  // Get academic years
  getAcademicYears: async () => {
    const response = await api.get<AcademicYearsResponse>('/api/admin/subjects/academic-years');
    if (response.success && Array.isArray(response.academicYears)) {
      return response.academicYears;
    }
    return [];
  },
  
  // Dashboard data
  getDashboardData: async () => {
    return api.get('/api/admin/dashboard');
  },
  
  getLatestRegistrations: async () => {
    return api.get('/api/admin/latest-registrations');
  },
  
  // Registration codes
  getRegistrationCodes: async () => {
    const response = await api.get<RegistrationCodeResponse>('/api/admin/auth/registration-codes');
    // Handle different response formats
    if (response.success && response.registrationCodes && Array.isArray(response.registrationCodes)) {
      return response.registrationCodes;
    }
    if (response.codes && Array.isArray(response.codes)) {
      return response.codes;
    }
    if (Array.isArray(response)) {
      return response;
    }
    console.warn("Unexpected response format from registration codes endpoint:", response);
    return [];
  },
  
  // Logs
  getLoginLogs: async () => {
    return api.get('/api/admin/logs/login');
  },
  
  getRegistrationLogs: async () => {
    return api.get('/api/admin/logs/registration');
  },
  
  // Classes
  getClasses: async () => {
    try {
      const response = await api.get<ClassResponse>('/api/admin/classes');
      // Handle different response formats
      if (response.success && response.classes && Array.isArray(response.classes)) {
        return response.classes;
      }
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      if (Array.isArray(response)) {
        return response;
      }
      console.warn("Unexpected response format from classes endpoint:", response);
      return [];
    } catch (error) {
      console.error("Error fetching classes:", error);
      return [];
    }
  },
  
  promoteStudents: async ({ year, semester }: { year: number; semester: number }) => {
    return api.post('/api/admin/students/promote', { year, semester });
  },
  
  undoPromotion: async ({ year, semester }: { year: number; semester: number }) => {
    return api.post('/api/admin/students/undo-promotion', { year, semester });
  },
};

// Registration codes API
export const codesAPI = {
  getCodes: async () => {
    return api.get('/api/admin/auth/registration-codes');
  },
  
  getAllCodes: async () => {
    return api.get('/api/admin/auth/registration-codes');
  },
  
  generateCode: async (data: 'student' | 'faculty') => {
    // Format the request with the type property expected by the backend
    const requestPayload = { type: data };
    return api.post('/api/admin/auth/registration-code', requestPayload);
  },
  
  deleteCode: async (id: string) => {
    return api.post('/api/admin/auth/registration-code/delete', { id });
  }
};

// University API
export const getUniversities = async () => {
  return api.get('/api/universities');
};

// Faculty API wrapper
export const facultyAPI = {
  // Faculty profile methods
  getProfile: async () => {
    return api.get('/api/faculty/profile');
  },
  
  updateProfile: async (data: any) => {
    return api.put('/api/faculty/profile', data);
  },
  
  // Faculty courses methods
  getCourses: async () => {
    return api.get('/api/faculty/courses');
  },
  
  getCourseDetails: async (courseId: string) => {
    return api.get(`/api/faculty/courses/${courseId}`);
  },
  
  // Faculty dashboard methods
  getDashboard: async () => {
    return api.get('/api/faculty/dashboard');
  },
  
  // Faculty students methods
  getStudents: async () => {
    return api.get('/api/faculty/students');
  },
  
  // Faculty classes methods
  getClasses: async () => {
    return api.get('/api/faculty/classes');
  },

  // Faculty timetable methods
  getTimetables: async (params?: any) => {
    return api.get('/api/faculty/timetables', params);
  },

  // Faculty subjects methods
  getSubjects: async (params?: any) => {
    return api.get('/api/faculty/subjects', params);
  },

  // Faculty list
  getFaculty: async (params?: any) => {
    return api.get('/api/faculty/faculty', params);
  },

  // Faculty course details method
  getCourseById: async (id: string) => {
    return api.get(`/api/faculty/courses/${id}`);
  },
};

// Faculty login method
export const facultyLogin = async (email: string, password: string, universityCode: string) => {
  return api.post('/api/auth/faculty/login', { email, password, universityCode });
};

// Student login method
export const studentLogin = async (email: string, password: string, universityCode: string) => {
  return api.post('/api/auth/student/login', { email, password, universityCode });
};

// Admin login method
export const adminLogin = async (email: string, password: string) => {
  return api.post('/api/admin/login', { email, password });
};

// Student Auth API wrapper
export const studentAuthAPI = {
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
    return api.post('/api/student/auth/verify-code', data);
  },
  
  verifyOtp: async (data: {
    email: string;
    otp: string;
  }) => {
    return api.post('/api/student/auth/verify-otp', data);
  },
  
  completeRegistration: async (data: {
    email: string;
    otp: string;
    password: string;
    name: string;
    registerNumber: string;
    universityCode: string;
    division: string;
    classYear: number;
    semester: number;
    phone: string;
  }) => {
    return api.post('/api/student/auth/complete-registration', data);
  }
};

// University code verification
export const verifyUniversityCode = async (universityCode: string) => {
  return api.get('/api/university/verify-code', { code: universityCode });
};

// Student API wrapper
export const studentAPI = {
  getCourses: async () => {
    return api.get('/api/student/courses');
  },
  
  getCourseDetails: async (courseId: string) => {
    return api.get(`/api/student/courses/${courseId}`);
  },
  
  getProfile: async () => {
    return api.get('/api/student/profile');
  },
  
  updateProfile: async (data: any) => {
    return api.put('/api/student/profile', data);
  },
  
  getDashboardData: async () => {
    return api.get('/api/student/dashboard');
  }
};

export default api;
