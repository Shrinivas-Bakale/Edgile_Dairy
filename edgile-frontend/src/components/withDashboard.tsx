import React from 'react';
import DashboardWrapper from './DashboardWrapper';

// Higher-order component that wraps components with DashboardWrapper
export const withDashboard = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  const WithDashboard: React.FC<P> = (props) => {
    return (
      <DashboardWrapper>
        <Component {...props} />
      </DashboardWrapper>
    );
  };

  // Set display name for better debugging
  const displayName = Component.displayName || Component.name || 'Component';
  WithDashboard.displayName = `withDashboard(${displayName})`;

  return WithDashboard;
};

export default withDashboard; 