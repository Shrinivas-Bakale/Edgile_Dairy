import React from 'react';
import { Link } from 'react-router-dom';
import {
  IconPencil,
  IconTrash,
  IconAlertTriangle,
  IconBuildingSkyscraper,
  IconUser,
  IconCalendarEvent,
  IconUsers,
  IconInfoCircle
} from '@tabler/icons-react';
import { useDarkMode } from '../contexts/DarkModeContext';

interface ClassroomProps {
  classroom: {
    _id: string;
    name: string;
    floor: number;
    capacity: number;
    status: 'available' | 'unavailable' | 'maintenance';
    occupancy?: number;
    occupiedBy?: string | null;
    lastBooking?: string;
  };
  onDelete?: (id: string) => void;
  showActions?: boolean;
  isDetailView?: boolean;
}

const ClassroomDetailCard: React.FC<ClassroomProps> = ({ 
  classroom, 
  onDelete, 
  showActions = true,
  isDetailView = false
}) => {
  const { isDarkMode } = useDarkMode();
  
  // Get status badge color
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'unavailable':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'maintenance':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };
  
  return (
    <div className={`
      ${isDetailView ? 'w-full' : 'w-full sm:w-96'}
      bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden
      transition-all duration-300 hover:shadow-lg
      ${isDarkMode ? 'border border-gray-700' : 'border border-gray-100'}
    `}>
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {classroom.name}
          </h3>
          
          <span className={`
            px-2.5 py-0.5 text-xs font-medium rounded-full
            ${getStatusBadgeClass(classroom.status)}
          `}>
            {classroom.status.charAt(0).toUpperCase() + classroom.status.slice(1)}
          </span>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <IconBuildingSkyscraper size={18} className="mr-2 text-gray-500 dark:text-gray-400" />
            <span>Floor: {classroom.floor}</span>
          </div>
          
          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <IconUser size={18} className="mr-2 text-gray-500 dark:text-gray-400" />
            <span>Capacity: {classroom.capacity} students</span>
          </div>
          
          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <div className="mr-2 flex-shrink-0">
              <IconUsers size={18} className="text-gray-500 dark:text-gray-400" />
            </div>
            <span>
              Current occupancy: {classroom.occupiedBy ? (
                <span className="font-medium text-blue-600 dark:text-blue-400">{classroom.occupiedBy}</span>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">No class assigned</span>
              )}
            </span>
          </div>
          
          {classroom.lastBooking && (
            <div className="flex items-center text-gray-700 dark:text-gray-300">
              <IconCalendarEvent size={18} className="mr-2 text-gray-500 dark:text-gray-400" />
              <span>Last used: {classroom.lastBooking}</span>
            </div>
          )}
        </div>
        
        {showActions && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
            <div>
              {classroom.status === 'available' && (
                <Link
                  to={`/admin/classrooms/unavailable/${classroom._id}`}
                  className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded
                    text-yellow-700 bg-yellow-100 hover:bg-yellow-200
                    dark:text-yellow-200 dark:bg-yellow-900/50 dark:hover:bg-yellow-900
                    transition-colors duration-200 mr-2"
                >
                  <IconAlertTriangle size={14} className="mr-1" />
                  Mark Unavailable
                </Link>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Link
                to={`/admin/classrooms/edit/${classroom._id}`}
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded
                  text-indigo-700 bg-indigo-100 hover:bg-indigo-200
                  dark:text-indigo-200 dark:bg-indigo-900/50 dark:hover:bg-indigo-900
                  transition-colors duration-200"
              >
                <IconPencil size={14} className="mr-1" />
                Edit
              </Link>
              
              {onDelete && (
                <button
                  onClick={() => onDelete(classroom._id)}
                  className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded
                    text-red-700 bg-red-100 hover:bg-red-200
                    dark:text-red-200 dark:bg-red-900/50 dark:hover:bg-red-900
                    transition-colors duration-200"
                >
                  <IconTrash size={14} className="mr-1" />
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassroomDetailCard; 