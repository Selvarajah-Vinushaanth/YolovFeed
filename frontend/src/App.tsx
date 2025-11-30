import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { SocketProvider } from './contexts/SocketContext';
import { CameraProvider } from './contexts/CameraContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import './App.css';

function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!loading && currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, loading, navigate]);

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-700 to-blue-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render login if user is authenticated (redirect will handle navigation)
  if (currentUser) {
    return null;
  }
  
  return (
    <>
      <Login 
        onToggleMode={() => setIsSignUp(!isSignUp)} 
        isSignUp={isSignUp} 
      />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <SocketProvider>
                  <CameraProvider>
                    <Header />
                    <main className="container mx-auto px-4 py-6">
                      <Dashboard />
                    </main>
                  </CameraProvider>
                </SocketProvider>
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster 
            position="top-center"
            toastOptions={{
              duration: 2500, // Shorter default duration
              style: {
                background: '#333',
                color: '#fff',
                borderRadius: '10px',
                fontSize: '14px',
              },
              success: {
                duration: 2000, // Even shorter for success messages
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 3500, // Slightly longer for errors so users can read them
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;