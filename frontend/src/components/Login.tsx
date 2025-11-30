import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, Camera, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface LoginProps {
  onToggleMode: () => void;
  isSignUp: boolean;
}

const Login: React.FC<LoginProps> = ({ onToggleMode, isSignUp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      if (!email) {
        toast.error('📧 Please enter your email address.');
      } else if (!password) {
        toast.error('🔒 Please enter your password.');
      }
      return;
    }

    if (isSignUp && !displayName) {
      toast.error('👤 Please enter your display name.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      // Error is already handled in AuthContext with toast
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      // Error is already handled in AuthContext with toast
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('📧 Please enter your email address first, then click "Forgot Password".');
      return;
    }
    
    try {
      await resetPassword(email);
    } catch (error) {
      // Error is already handled in AuthContext with toast
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-700 to-blue-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <div className="relative">
              <Camera className="h-8 w-8 text-blue-600" />
              <Sparkles className="h-4 w-4 text-purple-500 absolute -top-1 -right-1" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">YOLOvFeed</h1>
          <p className="text-blue-100 text-sm">AI-Powered Object Detection System</p>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-gray-600 text-sm">
              {isSignUp 
                ? 'Join the future of smart surveillance' 
                : 'Sign in to access your camera dashboard'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your full name"
                  required={isSignUp}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {isSignUp ? 'Creating Account...' : 'Signing In...'}
                </div>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-2">
            {!isSignUp && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <button
                  onClick={handleForgotPassword}
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors font-medium"
                >
                  🔑 Forgot your password?
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  Enter your email above, then click here to reset
                </p>
              </div>
            )}
            
            <p className="text-sm text-gray-600">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={onToggleMode}
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        </div>

        {/* Features Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center space-x-6 text-blue-100 text-sm">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              Real-time Detection
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
              AI Analytics
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
              Cloud Storage
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;