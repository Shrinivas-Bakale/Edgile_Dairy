import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../utils/api";
import DashboardWrapper from "../../components/DashboardWrapper";
import { authAPI } from "../../utils/api";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../../utils/api";

interface AdminProfile {
  name: string;
  email: string;
  role: string;
  createdAt?: string;
  permissions?: string[];
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facultyCount, setFacultyCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [latestFaculty, setLatestFaculty] = useState<any>(null);
  const [latestStudent, setLatestStudent] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First try to get user from localStorage as fallback
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData && userData.email) {
              // Set basic profile data from localStorage
              setProfile({
                name: userData.name || 'Admin User',
                email: userData.email,
                role: 'admin',
                createdAt: userData.createdAt || new Date().toISOString(),
                permissions: userData.permissions || []
              });
              setError(null); // Clear any previous errors
            }
          } catch (err) {
            // Continue with API fetch if localStorage parsing fails
          }
        }

        // Check if token exists
        const storedToken = localStorage.getItem("token");
        
        if (!storedToken) {
          if (!profile) { // Only set error if we don't have a profile
            setError("Authentication token missing. Please login again.");
            logout(); // Force logout if token is missing
          }
          return;
        }

        // Try to fetch other stats even if profile already loaded
        // Fetch faculty count
        try {
          const facultyData = await adminAPI.getFacultyMembers();
          setFacultyCount(Array.isArray(facultyData) ? facultyData.length : 0);
        } catch (error) {
          // Handle silently, non-critical information
        }

        // Fetch student count
        try {
          const studentData = await adminAPI.getStudents();
          setStudentCount(Array.isArray(studentData) ? studentData.length : 0);
        } catch (error) {
          // Handle silently, non-critical information
        }

        // Fetch latest registrations
        try {
          const latestRegistrations = await adminAPI.getLatestRegistrations();
          if (latestRegistrations) {
            if (latestRegistrations.faculty) {
              setLatestFaculty(latestRegistrations.faculty);
            }
            if (latestRegistrations.student) {
              setLatestStudent(latestRegistrations.student);
            }
          }
        } catch (error) {
          // Handle silently, non-critical information
        }

        // If we already have a profile from localStorage, skip API fetch
        if (profile) {
          return;
        }

        // If token is valid, proceed to fetch profile from API
        try {
          const response = await api.get("/api/admin/auth/profile");

          if (response.data?.success && response.data?.user) {
            const userData = response.data.user;
            
            // Validate profile data structure before setting state
            if (userData && userData.email) {
              setProfile({
                name: userData.name || 'Admin User',
                email: userData.email,
                role: userData.role || "admin",
                createdAt: userData.createdAt || new Date().toISOString(),
                permissions: userData.permissions || []
              });
              setError(null);
            } else {
              // Don't show error if we already have a profile from localStorage
              if (!profile) {
                setError("Missing required profile data");
              }
            }
          } else {
            // Don't show error if we already have a profile from localStorage
            if (!profile) {
              setError("Could not retrieve profile data. Please try again later.");
            }
          }
        } catch (profileErr: any) {
          // Only set error if we don't already have a profile
          if (!profile) {
            // Handle authentication errors
            if (profileErr.response?.status === 401) {
              setError("Your session has expired. Please login again.");
              // Force logout on auth error
              logout();
            } else {
              setError(
                "Failed to fetch profile data: " +
                  (profileErr.response?.data?.message || profileErr.message)
              );
            }
          }
        }
      } catch (err: any) {
        // Only set error if we don't already have a profile
        if (!profile) {
          setError("An unexpected error occurred.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [logout]);

  const handleNavigation = (path: string) => {
    navigate(path, { replace: false });
  };

  const handleSecureLogout = () => {
    // Clear all admin-specific session data
    sessionStorage.removeItem('adminAccessVerified');
    sessionStorage.removeItem('adminEmail');
    
    // Perform complete logout
    logout();
    
    // Redirect to admin access verification page
    window.location.href = '/admin/access';
  };

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
            onClick={handleSecureLogout}
            className="px-4 py-2 bg-indigo-600 text-white rounded"
          >
            Go to Login
          </button>
        </div>
      </DashboardWrapper>
    );
  }

  // This function formats date in a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-8">
        {/* <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Admin Profile</h2>
          {profile && (
            <div className="space-y-4">
              <div>
                <label className="text-gray-600">Name</label>
                <p className="text-gray-800 font-medium">{profile.name}</p>
              </div>
              <div>
                <label className="text-gray-600">Email</label>
                <p className="text-gray-800 font-medium">{profile.email}</p>
              </div>
              <div>
                <label className="text-gray-600">University</label>
                <p className="text-gray-800 font-medium">{profile.university}</p>
              </div>
              <div>
                <label className="text-gray-600">Role</label>
                <p className="text-gray-800 font-medium">{profile.role}</p>
              </div>
              <div>
                <label className="text-gray-600">Member Since</label>
                <p className="text-gray-800 font-medium">
                  {new Date(profile.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div> */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-4">
              <button
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                onClick={() => handleNavigation("/admin/faculty")}
              >
                Manage Faculty
              </button>
              <button
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                onClick={() => handleNavigation("/admin/students")}
              >
                Manage Students
              </button>
              <button
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                onClick={() => handleNavigation("/admin/classrooms")}
              >
                Manage Classrooms
              </button>
              <button
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                onClick={() => handleNavigation("/admin/subjects")}
              >
                Manage Subjects
              </button>
              <button
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                onClick={() => handleNavigation("/admin/timetable")}
              >
                Timetable Management
              </button>
              <button
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                onClick={() => handleNavigation("/admin/registration-codes")}
              >
                Registration Codes
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              System Status
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-gray-600">Total Faculty</label>
                <p className="text-2xl font-bold text-indigo-600">
                  {facultyCount || 0}
                </p>
              </div>
              <div>
                <label className="text-gray-600">Total Students</label>
                <p className="text-2xl font-bold text-indigo-600">
                  {studentCount || 0}
                </p>
              </div>
              <div>
                <label className="text-gray-600">System Health</label>
                <p className="text-green-500 font-medium">Healthy</p>
              </div>
            </div>
          </div>

          {/* Latest Registrations */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                Latest Registrations
              </h3>
              <button
                onClick={() => handleNavigation("/admin/registration-logs")}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                View All
              </button>
            </div>
            <div className="space-y-4">
              {/* Latest Faculty Registration */}
              <div className="p-3 bg-blue-50 rounded-md">
                <div className="font-medium text-blue-800">
                  Latest Faculty Registration
                </div>
                {latestFaculty ? (
                  <div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="font-medium">
                        {latestFaculty.userName}
                      </span>
                      <span className="text-gray-600">
                        {latestFaculty.employeeId}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {latestFaculty.department} •{" "}
                      {formatDate(latestFaculty.createdAt)}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 mt-1">
                    No recent faculty registrations
                  </div>
                )}
              </div>

              {/* Latest Student Registration */}
              <div className="p-3 bg-green-50 rounded-md">
                <div className="font-medium text-green-800">
                  Latest Student Registration
                </div>
                {latestStudent ? (
                  <div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="font-medium">
                        {latestStudent.userName}
                      </span>
                      <span className="text-gray-600">
                        {latestStudent.registerNumber}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Year {latestStudent.year}, Semester{" "}
                      {latestStudent.semester}, Division{" "}
                      {latestStudent.division}
                      <div className="mt-1">
                        {formatDate(latestStudent.createdAt)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 mt-1">
                    No recent student registrations
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardWrapper>
  );
};

export default AdminDashboard;
