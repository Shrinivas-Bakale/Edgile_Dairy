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
    occupiedByYear?: string;
    occupiedBySemester?: number;
    occupiedByDivision?: string;
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
  
  // Get status badge color
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'unavailable':
        return 'bg-red-100 text-red-800';
      case 'maintenance':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className={`
      ${isDetailView ? 'w-full' : 'w-full sm:w-96'}
      bg-white rounded-lg shadow-md overflow-hidden
      transition-all duration-300 hover:shadow-lg
      border border-gray-100
    `}>
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
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
          <div className="flex items-center text-gray-700">
            <IconBuildingSkyscraper size={18} className="mr-2 text-gray-500" />
            <span>Floor: {classroom.floor}</span>
          </div>
          
          <div className="flex items-center text-gray-700">
            <IconUser size={18} className="mr-2 text-gray-500" />
            <span>Capacity: {classroom.capacity} students</span>
          </div>
          
          <div className="flex items-center text-gray-700">
            <div className="mr-2 flex-shrink-0">
              <IconUsers size={18} className="text-gray-500" />
            </div>
            <span>
              Current occupancy: {classroom.occupiedBy ? (
                <span className="font-medium text-blue-600">
                  {classroom.occupiedBy}
                  {(classroom.occupiedByYear || classroom.occupiedBySemester || classroom.occupiedByDivision) && (
                    <div className="mt-1 text-sm text-gray-600">
                      <span className="inline-flex items-center bg-blue-100 text-blue-800 rounded-md px-2 py-1 text-xs">
                        {classroom.occupiedByYear && `${classroom.occupiedByYear} Year`}
                        {classroom.occupiedBySemester && `, Sem ${classroom.occupiedBySemester}`}
                        {classroom.occupiedByDivision && `, Div ${classroom.occupiedByDivision}`}
                      </span>
                    </div>
                  )}
                </span>
              ) : (
                <span className="text-gray-500">No class assigned</span>
              )}
            </span>
          </div>
          
          {classroom.lastBooking && (
            <div className="flex items-center text-gray-700">
              <IconCalendarEvent size={18} className="mr-2 text-gray-500" />
              <span>Last used: {classroom.lastBooking}</span>
            </div>
          )}
        </div>
        
        {showActions && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
            <div>
              {classroom.status === 'available' && (
                <Link
                  to={`/admin/classrooms/unavailable/${classroom._id}`}
                  className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded
                    text-yellow-700 bg-yellow-100 hover:bg-yellow-200
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