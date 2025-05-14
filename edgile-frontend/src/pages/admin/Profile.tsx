import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import DashboardWrapper from '../../components/DashboardWrapper';
import { adminAPI } from '../../utils/api';

interface AdminProfile {
  name: string;
  email: string;
  role: string;
  createdAt: string;
  permissions: string[];
}

const AdminProfile: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = () => {
    // Clear all admin-specific session data
    sessionStorage.removeItem('adminAccessVerified');
    sessionStorage.removeItem('adminEmail');
    
    // Perform complete logout
    logout();
    
    // Redirect to admin access verification page
    window.location.href = '/admin/access';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First try to get user from localStorage as fallback
        const storedUser = localStorage.getItem('user');
        
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData && userData.email) {
              // Set profile with fallback data
              setProfile({
                name: userData.name || 'Admin User',
                email: userData.email,
                role: userData.role || 'admin',
                createdAt: userData.createdAt || new Date().toISOString(),
                permissions: userData.permissions || []
              });
              
              // If we successfully loaded from localStorage, clear any error
              setError(null);
            }
          } catch (err) {
            // Handle parsing error silently, but continue with API fetch
          }
        }
        
        // Check if token exists
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
          if (!profile) { // Only set error if we don't already have a profile
            setError('Authentication token missing. Please login again.');
          }
          return;
        }
        
        // Fetch profile data using adminAPI helper
        try {
          const response = await adminAPI.getProfile();
          
          if (!response || !response.user) {
            if (!profile) { // Only set error if we don't already have a profile
              setError('No data received from server');
            }
            return;
          }

          const userData = response.user;
          
          // Validate profile data structure before setting state
          if (userData && userData.email) {
            setProfile({
              name: userData.name || 'Admin User',
              email: userData.email,
              role: userData.role || 'admin',
              createdAt: userData.createdAt || new Date().toISOString(),
              permissions: userData.permissions || []
            });
            setError(null);
          } else {
            // Don't show error if we already have a profile from localStorage
            if (!profile) {
              setError('Invalid profile data structure');
            }
          }
        } catch (apiError: any) {
          console.error('API Error:', apiError);
          // Only set error if we don't already have profile from localStorage
          if (!profile) {
            setError(apiError.message || 'Error fetching profile data');
          }
        }
      } catch (error: any) {
        // Only set error if we don't already have profile from localStorage
        if (!profile) {
          setError(error.message || 'An error occurred while loading profile');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardWrapper>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </DashboardWrapper>
    );
  }

  if (error) {
    return (
      <DashboardWrapper>
        <div className="flex items-center justify-center min-h-screen flex-col">
          <div className="text-red-500 mb-4">{error}</div>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-indigo-600 text-white rounded"
          >
            Go to Login
          </button>
        </div>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Admin Profile</h2>
          {profile && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Name</label>
                  <p className="mt-1 text-lg text-gray-800">{profile.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Email</label>
                  <p className="mt-1 text-lg text-gray-800">{profile.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Role</label>
                  <p className="mt-1 text-lg text-gray-800 capitalize">{profile.role}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Member Since</label>
                  <p className="mt-1 text-lg text-gray-800">
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Permissions</label>
                  <div className="mt-1">
                    {profile.permissions && profile.permissions.length > 0 ? (
                      <ul className="list-disc list-inside">
                        {profile.permissions.map((permission, index) => (
                          <li key={index} className="text-gray-800 capitalize">
                            {permission.replace(/_/g, ' ').toLowerCase()}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">No specific permissions assigned</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Actions</h3>
                <div className="space-x-4">
                  <button
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                    onClick={() => {/* TODO: Implement password change */}}
                  >
                    Change Password
                  </button>
                  <button
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardWrapper>
  );
};

export default AdminProfile; 