import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { IconUsers, IconBook, IconCalendar, IconChartBar } from '@tabler/icons-react';

const DashboardPage: React.FC = () => {
  const { isDarkMode } = useDarkMode();

  const stats = [
    {
      title: 'Total Students',
      value: '1,234',
      icon: IconUsers,
      change: '+12%',
      changeType: 'increase'
    },
    {
      title: 'Active Courses',
      value: '24',
      icon: IconBook,
      change: '+5%',
      changeType: 'increase'
    },
    {
      title: 'Upcoming Events',
      value: '8',
      icon: IconCalendar,
      change: '-2%',
      changeType: 'decrease'
    },
    {
      title: 'Average Performance',
      value: '87%',
      icon: IconChartBar,
      change: '+3%',
      changeType: 'increase'
    }
  ];

  return (
    <div className="p-6">
      <h1 className={`text-2xl font-bold mb-6 ${
        isDarkMode ? 'text-gray-100' : 'text-gray-900'
      }`}>
        Dashboard
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`p-6 rounded-lg shadow-sm transition-colors duration-300 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {stat.title}
                </p>
                <p className={`text-2xl font-semibold mt-1 ${
                  isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-full ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <stat.icon className={`h-6 w-6 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`} />
              </div>
            </div>
            <div className="mt-4">
              <span className={`text-sm ${
                stat.changeType === 'increase'
                  ? 'text-green-500'
                  : 'text-red-500'
              }`}>
                {stat.change}
              </span>
              <span className={`text-sm ml-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                from last month
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage; 