import React, { useEffect, useState, useCallback } from 'react';
import DashboardWrapper from '../../components/DashboardWrapper';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI } from '../../utils/api';
import { Link, useNavigate } from 'react-router-dom';
import ClassroomDetailCard from '../../components/ClassroomDetailCard';
import {
  IconSearch,
  IconFilter,
  IconPlus,
  IconRefresh,
  IconBuildingSkyscraper,
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
  IconTrash
} from '@tabler/icons-react';

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
  occupiedByYear?: string;
  occupiedBySemester?: number;
  occupiedByDivision?: string;
  timetableId?: string;
}

interface OccupancyDataMap {
  [key: string]: OccupancyData;
}

const ClassroomsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State variables
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [filteredClassrooms, setFilteredClassrooms] = useState<Classroom[]>([]);
  const [occupancyData, setOccupancyData] = useState<OccupancyDataMap>({});
  const [loading, setLoading] = useState(true);
  const [loadingOccupancy, setLoadingOccupancy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    floor: '',
    status: '',
    capacity: '',
    search: ''
  });
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Fetch occupancy data function - defined as useCallback so it can be used in effects/intervals
  const fetchOccupancyData = useCallback(async () => {
    try {
      setLoadingOccupancy(true);
      console.log('Fetching occupancy data...');
      const data = await adminAPI.getClassroomOccupancy();
      console.log('Occupancy data received:', data);
      
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
              occupiedBy: item.occupiedBy || null,
              occupiedByYear: item.occupiedByYear || null,
              occupiedBySemester: item.occupiedBySemester || null,
              occupiedByDivision: item.occupiedByDivision || null,
              timetableId: item.timetableId || null
            };
          }
        });
      }
      
      setOccupancyData(occupancyMap);
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Error fetching occupancy data:', error);
      // Initialize with empty object to prevent errors
      setOccupancyData({});
    } finally {
      setLoadingOccupancy(false);
    }
  }, []);
  
  // Load classrooms data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching classrooms data...');
        // Fetch classrooms data
        const data = await adminAPI.getClassrooms();
        console.log('Classrooms data received:', data);
        
        // Initialize with empty array if data is null or undefined
        setClassrooms(Array.isArray(data) ? data : []);
        setFilteredClassrooms(Array.isArray(data) ? data : []);
        
        // After getting classrooms, get the occupancy data
        await fetchOccupancyData();
      } catch (err: any) {
        console.error('Error fetching classrooms:', err);
        setError(err.message || 'Failed to load classrooms');
        // Initialize with empty arrays to prevent "is not iterable" errors
        setClassrooms([]);
        setFilteredClassrooms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fetchOccupancyData]);
  
  // Set up real-time updates - always enabled
  useEffect(() => {
    const interval = setInterval(fetchOccupancyData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [fetchOccupancyData]);
  
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
      setClassrooms(Array.isArray(data) ? data : []);
      
      // Refresh occupancy data as well
      await fetchOccupancyData();
      
      setError(null);
    } catch (err: any) {
      console.error('Error refreshing classrooms:', err);
      setError(err.message || 'Failed to refresh classroom data');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to determine class status and indicator color
  const getStatusData = (classroom: Classroom, occupancy?: OccupancyData) => {
    const occupancyInfo = occupancy || { occupancyPercentage: 0 };
    
    if (classroom.status === 'unavailable' || classroom.status === 'maintenance') {
      return {
        status: 'Unavailable',
        color: 'red',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
      };
    }
    
    if (occupancyInfo.occupiedBy) {
      return {
        status: 'Occupied',
        color: 'orange',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-800',
      };
    }
    
    return {
      status: 'Available',
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800'
    };
  };
  
  // Helper function to get unique floor numbers for the filter
  const getUniqueFloors = () => {
    const floors = [...new Set(classrooms.map(c => c.floor))];
    return floors.sort((a, b) => a - b);
  };

  // Helper function to format occupancy information
  const formatOccupancyInfo = (occupancy: OccupancyData | undefined) => {
    if (!occupancy?.occupiedBy) {
      return null;
    }
    
    // Extract just the primary class information without parenthetical data
    // This addresses the duplication problem with allocations like "First Year, Sem 1, Div A1 (First, Sem 1) - Div A1"
    let info = '';
    
    // Check if we have all the necessary data for showing a complete allocation
    if (occupancy.occupiedByYear && occupancy.occupiedBySemester) {
      info = `${occupancy.occupiedByYear} Year, Sem ${occupancy.occupiedBySemester}`;
      
      if (occupancy.occupiedByDivision) {
        info += `, Div ${occupancy.occupiedByDivision}`;
      }
    } else {
      // Fallback to whatever is available in occupiedBy
      info = occupancy.occupiedBy;
    }
    
    return info;
  };

  // Classroom deletion handler
  const handleDeleteClassroom = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this classroom?')) {
      return;
    }
    
    try {
      interface DeleteResponse {
        success: boolean;
        message?: string;
        msg?: string;
      }
      
      const response = await adminAPI.deleteClassroom(id);
      const deleteResponse = response as DeleteResponse;
      
      if (deleteResponse.success) {
        // Remove the classroom from the local state
        setClassrooms(classrooms.filter(c => c._id !== id));
        
        // Refresh occupancy data after deletion
        await fetchOccupancyData();
      } else {
        setError(deleteResponse.message || deleteResponse.msg || 'Failed to delete classroom');
      }
    } catch (err: any) {
      console.error('Error deleting classroom:', err);
      setError(err.message || 'An error occurred while deleting the classroom');
    }
  };
  
  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <IconBuildingSkyscraper size={28} className="mr-2 text-blue-600" />
            Classroom Management
          </h1>
          
          <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
            <Link 
              to="/admin/classrooms/add"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center shadow-sm transition-colors"
            >
              <IconPlus size={20} className="mr-1" />
              Add Classroom
            </Link>
            
            <button 
              className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-md flex items-center hover:bg-gray-50 transition-colors shadow-sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <IconFilter size={20} className="mr-1" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
              {showFilters ? 
                <IconChevronDown size={16} className="ml-1" /> : 
                <IconChevronRight size={16} className="ml-1" />
              }
            </button>
            
            <button
              className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors shadow-sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? 
                <><IconLayoutList size={20} className="mr-1" /> List View</> : 
                <><IconLayoutGrid size={20} className="mr-1" /> Grid View</>
              }
            </button>
            
            <button 
              className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-md transition-colors shadow-sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <IconRefresh size={20} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        
        {/* Last Refresh Time */}
        <div className="text-sm text-gray-500 mb-4">
          Last refreshed: {lastRefreshTime.toLocaleTimeString()}
          {loadingOccupancy && <span className="ml-2 text-blue-600">(Updating...)</span>}
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
            <IconAlertCircle size={20} className="mr-2 text-red-500" />
            {error}
          </div>
        )}
        
        {/* Filters */}
        {showFilters && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h2 className="text-lg font-medium mb-4 text-gray-700 flex items-center">
              <IconFilter size={20} className="mr-2 text-blue-600" />
              Filter Classrooms
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <div className="relative">
                  <input
                    id="search"
                    type="text"
                    name="search"
                    value={filters.search}
                    onChange={handleFilterChange}
                    placeholder="Search by name..."
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IconSearch size={18} className="text-gray-400" />
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="floor" className="block text-sm font-medium text-gray-700 mb-1">
                  Floor
                </label>
                <select
                  id="floor"
                  name="floor"
                  value={filters.floor}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Floors</option>
                  {getUniqueFloors().map(floor => (
                    <option key={floor} value={floor}>Floor {floor}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                  Min Capacity
                </label>
                <input
                  id="capacity"
                  type="number"
                  name="capacity"
                  value={filters.capacity}
                  onChange={handleFilterChange}
                  placeholder="Minimum capacity..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-center items-center my-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        {/* No Results Message */}
        {!loading && filteredClassrooms.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <IconBuildingSkyscraper size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-700 mb-2">No classrooms found</h3>
            <p className="text-gray-500 mb-4">
              {classrooms.length > 0 
                ? 'Try adjusting your filters to see more results.' 
                : 'Add your first classroom to get started.'}
            </p>
            {classrooms.length === 0 && (
              <Link
                to="/admin/classrooms/add"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                <IconPlus size={20} className="mr-1" />
                Add Classroom
              </Link>
            )}
          </div>
        )}
        
        {/* Grid View */}
        {!loading && filteredClassrooms.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredClassrooms.map(classroom => {
              const occupancy = occupancyData[classroom._id];
              const statusData = getStatusData(classroom, occupancy);
              const occupancyInfo = formatOccupancyInfo(occupancy);
              
              return (
                <div key={classroom._id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden relative">
                  {/* Add colored top border based on status */}
                  <div className={`h-1.5 w-full ${statusData.bgColor}`}></div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">{classroom.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusData.bgColor} ${statusData.textColor}`}>
                        {statusData.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-gray-600">
                        <span className="font-medium mr-2">Floor:</span> {classroom.floor}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <span className="font-medium mr-2">Capacity:</span> {classroom.capacity} students
                      </div>
                      
                      <div>
                        <p className="text-gray-700 font-medium mt-2">Current Allocation:</p>
                        {occupancyInfo ? (
                          <div className="text-sm bg-blue-50 border border-blue-100 rounded-md p-2 mt-1">
                            <p className="text-blue-800">{occupancyInfo}</p>
                          </div>
                        ) : (
                          <div className="text-sm bg-gray-50 border border-gray-100 rounded-md p-2 mt-1">
                            <p className="text-gray-500">-</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between mt-4 pt-4 border-t border-gray-200">
                      <Link
                        to={`/admin/classrooms/edit/${classroom._id}`}
                        className="inline-flex items-center px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded"
                      >
                        <IconPencil size={16} className="mr-1" />
                        Edit
                      </Link>
                      
                      <button
                        onClick={() => handleDeleteClassroom(classroom._id)}
                        className="inline-flex items-center px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded"
                      >
                        <IconTrash size={16} className="mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* List View */}
        {!loading && filteredClassrooms.length > 0 && viewMode === 'list' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Name
                        {sortField === 'name' && (
                          sortDirection === 'asc' 
                            ? <IconArrowUp size={14} className="ml-1" /> 
                            : <IconArrowDown size={14} className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('floor')}
                    >
                      <div className="flex items-center">
                        Floor
                        {sortField === 'floor' && (
                          sortDirection === 'asc' 
                            ? <IconArrowUp size={14} className="ml-1" /> 
                            : <IconArrowDown size={14} className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('capacity')}
                    >
                      <div className="flex items-center">
                        Capacity
                        {sortField === 'capacity' && (
                          sortDirection === 'asc' 
                            ? <IconArrowUp size={14} className="ml-1" /> 
                            : <IconArrowDown size={14} className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Current Allocation
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClassrooms.map(classroom => {
                    const occupancy = occupancyData[classroom._id];
                    const statusData = getStatusData(classroom, occupancy);
                    const occupancyInfo = formatOccupancyInfo(occupancy);
                    
                    return (
                      <tr key={classroom._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{classroom.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-700">Floor {classroom.floor}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-700">{classroom.capacity} students</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusData.bgColor} ${statusData.textColor}`}>
                            {statusData.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {occupancyInfo ? (
                            <div className="text-sm text-gray-700">{occupancyInfo}</div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <Link
                              to={`/admin/classrooms/edit/${classroom._id}`}
                              className="inline-flex items-center px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded"
                            >
                              <IconPencil size={16} className="mr-1" />
                              Edit
                            </Link>
                            
                            <button
                              onClick={() => handleDeleteClassroom(classroom._id)}
                              className="inline-flex items-center px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded"
                            >
                              <IconTrash size={16} className="mr-1" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardWrapper>
  );
};

export default ClassroomsPage; 