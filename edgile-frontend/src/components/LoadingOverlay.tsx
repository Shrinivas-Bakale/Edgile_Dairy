import React from 'react';
import Loading from './Loading';

interface LoadingOverlayProps {
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = 'Loading...' }) => (
  <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
    <div className="text-center">
      <Loading size="lg" />
      <p className="mt-2 text-gray-600">{message}</p>
    </div>
  </div>
);

export default LoadingOverlay; 