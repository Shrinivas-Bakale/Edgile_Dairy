import React from 'react';

interface LoadingSpinnerProps {
  size?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 12 }) => {
  return (
    <div className="flex items-center justify-center">
      <div 
        className="animate-spin rounded-full border-b-2 border-indigo-600"
        style={{ width: `${size}px`, height: `${size}px` }}
      ></div>
    </div>
  );
};

export default LoadingSpinner; 