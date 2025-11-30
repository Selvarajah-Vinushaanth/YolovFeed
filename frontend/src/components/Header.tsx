import React, { useState, useEffect, useRef } from 'react';
import { Camera, Activity, Wifi, WifiOff, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { useCamera } from '../contexts/CameraContext';
import { useAuth } from '../contexts/AuthContext';
// import AudioControls from './AudioControls';

const Header: React.FC = () => {
  const { isConnected } = useSocket();
  const { cameraStatuses } = useCamera();
  const { currentUser, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Determine if any camera is live (streaming or detecting)
  const isLive = Object.values(cameraStatuses).some(
    (status) => status.isStreaming || status.isDetecting
  );

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setShowUserMenu(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="bg-white shadow-lg border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Camera className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">YOLO Vision</h1>
                <p className="text-sm text-gray-500">Real-time Object Detection Dashboard</p>
              </div>
            </div>
          </div>

          {/* Status Indicators and User Menu */}
          <div className="flex items-center space-x-6">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <Wifi className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-green-600 font-medium">Connected</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-red-600 font-medium">Disconnected</span>
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                </>
              )}
            </div>

            {/* Live Indicator */}
            <div
              className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
                isLive ? 'bg-green-100' : 'bg-gray-200'
              }`}
            >
              <Activity className={`w-4 h-4 ${isLive ? 'text-green-600' : 'text-gray-500'}`} />
              <span
                className={`text-sm font-medium ${
                  isLive ? 'text-green-600' : 'text-gray-500'
                }`}
              >
                {isLive ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>

            {/* Audio Controls */}
            {/* <AudioControls /> */}

            {/* User Profile Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                  {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : currentUser?.email?.[0].toUpperCase() || 'U'}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium text-gray-900">
                    {currentUser?.displayName || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate max-w-32">
                    {currentUser?.email}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {currentUser?.displayName || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {currentUser?.email}
                    </p>
                  </div>
                  
                  {/* <div className="py-1">
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                      <User className="w-4 h-4 mr-3 text-gray-500" />
                      Profile Settings
                    </button>
                    <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                      <Settings className="w-4 h-4 mr-3 text-gray-500" />
                      Preferences
                    </button>
                  </div> */}

                  <div className="border-t border-gray-100 pt-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3 text-red-500" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;