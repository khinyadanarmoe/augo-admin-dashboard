import React from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface WithAdminAuthProps {
  // Add any additional props here
}

export function withAdminAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  const WithAdminAuthComponent = (props: P & WithAdminAuthProps) => {
    const { isAuthenticated, isLoading } = useAdminAuth();

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null; // Hook handles redirect
    }

    return <WrappedComponent {...props} />;
  };

  WithAdminAuthComponent.displayName = `withAdminAuth(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithAdminAuthComponent;
}