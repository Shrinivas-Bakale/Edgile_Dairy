import.meta.env.VITE_API_URL || 'http://localhost:5001';

const config = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
  isDevelopment: import.meta.env.DEV,
  
  // Default headers for API requests
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  
  // Function to handle API responses
  handleApiResponse: async (response: Response) => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        message: `Server returned ${response.status}: ${response.statusText}` 
      }));
      
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }
    
    return response.json();
  },
  
  // Timeout for API requests in milliseconds (30 seconds)
  apiTimeout: 30000
};

export default config;

// Export API base URL for other modules
export const API_BASE_URL = config.API_URL; 