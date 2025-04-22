import React, { useEffect, useState } from 'react';
import DashboardWrapper from '../../components/DashboardWrapper';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI } from '../../utils/api';
import { Link, useNavigate } from 'react-router-dom';
import { useDarkMode } from '../../contexts/DarkModeContext';
import ClassroomDetailCard from '../../components/ClassroomDetailCard';
import {
  IconSearch,
  IconFilter,
  IconPlus,
  IconReload,
  IconBuildingSkyscraper,
  IconUser,
  IconLayoutGrid,
  IconLayoutList,
  IconChevronRight,
  IconChevronDown,
  IconArrowUp,
  IconArrowDown,
  IconClock,
  IconAlertCircle,
  IconAlertTriangle,
  IconPencil,
  IconTrash,
  IconDatabaseImport
} from '@tabler/icons-react';
import axios from 'axios';

// Define types
interface Classroom {
  _id: string;
  name: string;
  floor: number;
  capacity: number;
  status: 'available' | 'unavailable' | 'maintenance';
  createdAt?: string;
  updatedAt?: string;
}

interface ClassroomOccupancy {
  id: string;
  name: string;
  floor: number;
  capacity: number;
  status: 'available' | 'occupied' | 'unavailable';
  occupiedBy: string | null;
  unavailabilityInfo: {
    substituteClassroomId: string | null;
    substituteClassroomName: string | null;
    reason: string;
  } | null;
}

interface Filters {
  floor: string;
  status: string;
  capacity: string;
  search: string;
}

// Update the occupancy data interface to include occupiedBy
interface OccupancyData {
  occupancyPercentage: number;
  occupiedBy?: string | null;
}

interface OccupancyDataMap {
  [key: string]: OccupancyData;
}

const ClassroomsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();
  
  // State variables
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [filteredClassrooms, setFilteredClassrooms] = useState<Classroom[]>([]);
  const [occupancyData, setOccupancyData] = useState<OccupancyDataMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showRealTimeView, setShowRealTimeView] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    floor: '',
    status: '',
    capacity: '',
    search: ''
  });
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Load classrooms data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch classrooms data
        const data = await adminAPI.getClassrooms();
        setClassrooms(data);
        setFilteredClassrooms(data);
      } catch (err: any) {
        console.error('Error fetching classrooms:', err);
        setError(err.message || 'Failed to load classrooms');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  // Load occupancy data
  useEffect(() => {
    const fetchOccupancyData = async () => {
      try {
        const data = await adminAPI.getClassroomOccupancy();
        
        // Process data into a map indexed by classroom ID
        const occupancyMap: OccupancyDataMap = {};
        
        // Ensure we have valid data before trying to process
        if (Array.isArray(data) && data.length > 0) {
          data.forEach((item: any) => {
            // Make sure the item is valid and has an id
            if (item && typeof item === 'object' && item.id) {
              // Ensure occupancyPercentage is a number
              const percentage = typeof item.occupancyPercentage === 'number' 
                ? item.occupancyPercentage 
                : 0;
              
              occupancyMap[item.id] = {
                occupancyPercentage: percentage,
                occupiedBy: item.occupiedBy || null
              };
            }
          });
        }
        
        setOccupancyData(occupancyMap);
      } catch (error) {
        console.error('Error fetching occupancy data:', error);
        // Don't set a visible error for this, just log it
      }
    };
    
    fetchOccupancyData();
    
    // Optional: Set up interval for real-time updates
    if (showRealTimeView) {
      const interval = setInterval(fetchOccupancyData, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [showRealTimeView]);
  
  // Apply filters
  useEffect(() => {
    let filtered = [...classrooms];
    
    // Apply search filter
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase().trim();
      filtered = filtered.filter(
        classroom => classroom.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply floor filter
    if (filters.floor) {
      filtered = filtered.filter(
        classroom => classroom.floor === parseInt(filters.floor)
      );
    }
    
    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(
        classroom => classroom.status === filters.status
      );
    }
    
    // Apply capacity filter
    if (filters.capacity) {
      filtered = filtered.filter(
        classroom => classroom.capacity >= parseInt(filters.capacity)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField as keyof Classroom];
      let bValue: any = b[sortField as keyof Classroom];
      
      // Handle string comparisons
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    setFilteredClassrooms(filtered);
  }, [classrooms, filters, sortField, sortDirection]);
  
  // Handlers
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Refresh classroom data
      const data = await adminAPI.getClassrooms();
      setClassrooms(data);
      
      // Refresh occupancy data (optional)
      try {
        const occupancy = await adminAPI.getClassroomOccupancy();
        
        // Process occupancy data
        const occupancyMap: OccupancyDataMap = {};
        
        // Ensure we have valid data before trying to process
        if (Array.isArray(occupancy) && occupancy.length > 0) {
          occupancy.forEach((item: any) => {
            // Make sure the item is valid and has an id
            if (item && typeof item === 'object' && item.id) {
              // Ensure occupancyPercentage is a number
              const percentage = typeof item.occupancyPercentage === 'number' 
                ? item.occupancyPercentage 
                : 0;
              
              occupancyMap[item.id] = {
                occupancyPercentage: percentage,
                occupiedBy: item.occupiedBy || null
              };
            }
          });
        }
        
        setOccupancyData(occupancyMap);
      } catch (occupancyError) {
        console.warn('Error fetching occupancy data (optional):', occupancyError);
        // Don't set a visible error for this, just log it
        // This is optional data, so we can continue without it
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error refreshing data:', err);
      setError(err.message || 'Failed to refresh data');
      setLoading(false);
    }
  };
  
  const handleDeleteClassroom = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this classroom? This action cannot be undone.')) {
      try {
        const response = await adminAPI.deleteClassroom(id);
        
        if (response.success) {
          // Remove the classroom from the state
          setClassrooms(classrooms.filter(c => c._id !== id));
          setFilteredClassrooms(filteredClassrooms.filter(c => c._id !== id));
          
          // Show success message
          setError(null);
          // You could add a success state/toast here if needed
        } else {
          setError(response.message || 'Failed to delete the classroom');
        }
      } catch (error: any) {
        console.error('Error deleting classroom:', error);
        setError(error.message || 'An unexpected error occurred');
      }
    }
  };
  
  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Classroom Management
          </h1>
          
          <div className="flex items-center mt-4 sm:mt-0">
            <button
              onClick={() => navigate('/admin/classrooms/new')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center mr-3"
            >
              <IconPlus size={20} className="mr-1" />
              Add Classroom
            </button>
            
            {classrooms.length === 0 && (
              <button
                onClick={async () => {
                  try {
                    setLoading(true);
                    const token = localStorage.getItem('token');
                    const response = await axios.post(
                      'http://localhost:5000/api/admin/classrooms/create-test-data',
                      {},
                      {
                        headers: {
                          Authorization: `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                      }
                    );
                    
                    if (response.data?.success) {
                      setError(null);
                      // Refresh the classroom list
                      handleRefresh();
                    } else {
                      setError(response.data?.message || 'Failed to create test data');
                    }
                  } catch (err: any) {
                    console.error('Error creating test data:', err);
                    setError(err.response?.data?.message || err.message || 'Error creating test data');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center mr-3"
              >
                <IconDatabaseImport size={20} className="mr-1" />
                Create Test Data
              </button>
            )}
            
            <button
              onClick={handleRefresh}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 
                px-4 py-2 rounded-md flex items-center hover:bg-gray-300 dark:hover:bg-gray-600"
              disabled={loading}
            >
              <IconReload size={20} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full px-4 py-3 text-left flex justify-between items-center"
            >
              <div className="flex items-center">
                <IconFilter size={20} className="mr-2 text-gray-500 dark:text-gray-400" />
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Filters & View Options
                </span>
              </div>
              {showFilters ? (
                <IconChevronDown size={20} className="text-gray-500 dark:text-gray-400" />
              ) : (
                <IconChevronRight size={20} className="text-gray-500 dark:text-gray-400" />
              )}
            </button>
          </div>
          
          {showFilters && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search Box */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Search
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <IconSearch size={18} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="search"
                      value={filters.search}
                      onChange={handleFilterChange}
                      placeholder="Search by classroom name..."
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 
                        rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 
                        dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                
                {/* Floor Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Floor
                  </label>
                  <select
                    name="floor"
                    value={filters.floor}
                    onChange={handleFilterChange}
                    className="block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 
                      rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 
                      dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">All Floors</option>
                    {Array.from(new Set(classrooms.map(c => c.floor))).sort().map(floor => (
                      <option key={floor} value={floor}>
                        Floor {floor}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    className="block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 
                      rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 
                      dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">All Statuses</option>
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                    <option value="maintenance">Under Maintenance</option>
                  </select>
                </div>
                
                {/* Capacity Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min Capacity
                  </label>
                  <select
                    name="capacity"
                    value={filters.capacity}
                    onChange={handleFilterChange}
                    className="block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 
                      rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 
                      dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Any Capacity</option>
                    <option value="20">20+ students</option>
                    <option value="40">40+ students</option>
                    <option value="60">60+ students</option>
                    <option value="100">100+ students</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex flex-wrap justify-between items-center">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center px-3 py-2 rounded-md 
                      ${viewMode === 'grid' 
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                  >
                    <IconLayoutGrid size={20} className="mr-1" />
                    Grid
                  </button>
                  
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center px-3 py-2 rounded-md 
                      ${viewMode === 'list' 
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                  >
                    <IconLayoutList size={20} className="mr-1" />
                    List
                  </button>
                </div>
                
                <button
                  onClick={() => {
                    setFilters({
                      floor: '',
                      status: '',
                      capacity: '',
                      search: ''
                    });
                  }}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-md mb-6 flex items-center">
            <IconAlertCircle size={24} className="mr-2" />
            <span>{error}</span>
          </div>
        )}
        
        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        )}
        
        {/* No Results */}
        {!loading && filteredClassrooms.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No classrooms found matching your filters.
            </p>
            <button
              onClick={() => {
                setFilters({
                  floor: '',
                  status: '',
                  capacity: '',
                  search: ''
                });
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
            >
              Clear Filters
            </button>
          </div>
        )}
        
        {/* Classroom Grid View */}
        {!loading && filteredClassrooms.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClassrooms.map(classroom => (
              <ClassroomDetailCard
                key={classroom._id}
                classroom={{
                  ...classroom,
                  // Safely access optional occupancy data
                  occupancy: occupancyData[classroom._id]?.occupancyPercentage || 0,
                  occupiedBy: occupancyData[classroom._id]?.occupiedBy || null
                }}
                onDelete={handleDeleteClassroom}
              />
            ))}
          </div>
        )}
        
        {/* Classroom List View */}
        {!loading && filteredClassrooms.length > 0 && viewMode === 'list' && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Floor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Current Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredClassrooms.map(classroom => (
                  <tr key={classroom._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {classroom.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {classroom.floor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {classroom.capacity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        classroom.status === 'available' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : classroom.status === 'maintenance'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {classroom.status.charAt(0).toUpperCase() + classroom.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {occupancyData[classroom._id]?.occupiedBy ? (
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {occupancyData[classroom._id]?.occupiedBy}
                        </span>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">No class assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {classroom.status === 'available' && (
                          <Link
                            to={`/admin/classrooms/unavailable/${classroom._id}`}
                            className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                          >
                            <IconAlertTriangle size={18} />
                          </Link>
                        )}
                        <Link
                          to={`/admin/classrooms/edit/${classroom._id}`}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          <IconPencil size={18} />
                        </Link>
                        <button
                          onClick={() => handleDeleteClassroom(classroom._id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <IconTrash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardWrapper>
  );
};

export default ClassroomsPage; 