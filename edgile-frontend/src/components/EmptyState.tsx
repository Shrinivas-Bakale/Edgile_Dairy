import React from 'react';
import { Button } from '@/components/ui';

interface EmptyStateProps {
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, message, action, secondaryAction }) => (
  <div className="text-center py-8">
    <h3 className="text-lg font-medium text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-500">{message}</p>
    <div className="mt-4 flex justify-center gap-2">
      {action && (
        <Button
          onClick={action.onClick}
          variant="outline"
        >
          {action.label}
        </Button>
      )}
      {secondaryAction && (
        <Button
          onClick={secondaryAction.onClick}
          variant="secondary"
        >
          {secondaryAction.label}
        </Button>
      )}
    </div>
  </div>
);

export default EmptyState; 