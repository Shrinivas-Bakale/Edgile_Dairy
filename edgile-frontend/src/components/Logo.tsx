import React from 'react';
import { IconBrain } from '@tabler/icons-react';

interface LogoProps {
  collapsed?: boolean;
}

const Logo: React.FC<LogoProps> = ({ collapsed = false }) => {
  return (
    <div className="flex items-center">
      <IconBrain
        size={28}
        className="text-indigo-600 shrink-0"
        stroke={2}
      />
      {!collapsed && (
        <span className="ml-2 text-xl font-bold text-gray-800">
          Edgile
        </span>
      )}
    </div>
  );
};

export default Logo; 