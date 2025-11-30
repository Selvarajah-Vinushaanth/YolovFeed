import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-700 to-blue-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading YOLOvFeed...</p>
          <p className="text-blue-100 text-sm mt-2">Authenticating your session</p>
        </div>
      </div>
    );
  }

  return currentUser ? <>{children}</> : <Navigate to="/auth" replace />;
};

export default ProtectedRoute;