import React, { useState, useEffect } from 'react';
import { X, Play, Pause, Eye, EyeOff, Maximize2, Minimize2, Settings } from 'lucide-react';
import { Camera } from '../types';
import { useCamera } from '../contexts/CameraContext';
import InteractiveCameraStream from './InteractiveCameraStream';

interface CameraPreviewModalProps {
  camera: Camera | null;
  isOpen: boolean;
  onClose: () => void;
  enableObjectClick?: boolean;
  enableSoundAlerts?: boolean;
}

const CameraPreviewModal: React.FC<CameraPreviewModalProps> = ({
  camera,
  isOpen,
  onClose,
  enableObjectClick = false,
  enableSoundAlerts = false
}) => {
  const { cameraStatuses, objectCounts, startCamera, stopCamera, toggleDetection } = useCamera();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || !camera) return;

      const currentStatus = cameraStatuses[camera.id] || { isStreaming: false, isDetecting: false };

      switch (event.key) {
        case 'Escape':
          if (isFullscreen) {
            setIsFullscreen(false);
          } else {
            onClose();
          }
          break;
        case 'f':
        case 'F':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setIsFullscreen(!isFullscreen);
          }
          break;
        case ' ':
          event.preventDefault();
          if (currentStatus.isStreaming) {
            stopCamera(camera.id);
          } else {
            startCamera(camera.id);
          }
          break;
        case 'd':
        case 'D':
          if (currentStatus.isStreaming) {
            toggleDetection(camera.id, !currentStatus.isDetecting);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, camera, isFullscreen, onClose, cameraStatuses, startCamera, stopCamera, toggleDetection]);

  if (!isOpen || !camera) return null;

  const status = cameraStatuses[camera.id] || { isStreaming: false, isDetecting: false };
  const currentObjectCounts = objectCounts[camera.id] || {};
  const totalObjects = Object.values(currentObjectCounts).reduce((sum, count) => sum + count, 0);

  const handleStartStop = async () => {
    try {
      if (status.isStreaming) {
        await stopCamera(camera.id);
      } else {
        await startCamera(camera.id);
      }
    } catch (error) {
      console.error('Error controlling camera:', error);
    }
  };

  const handleToggleDetection = async () => {
    try {
      await toggleDetection(camera.id, !status.isDetecting);
    } catch (error) {
      console.error('Error toggling detection:', error);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (isFullscreen) {
        setIsFullscreen(false);
      } else {
        onClose();
      }
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isFullscreen ? 'bg-black' : 'bg-black bg-opacity-75 backdrop-blur-sm p-4'
      }`}
      onClick={handleOverlayClick}
    >
      <div 
        className={`relative transition-all duration-300 ${
          isFullscreen 
            ? 'w-full h-full' 
            : 'w-full max-w-6xl h-5/6 bg-white rounded-2xl shadow-2xl overflow-hidden'
        }`}
      >
        {/* Header */}
        {!isFullscreen && (
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{camera.name}</h2>
                <p className="text-sm text-gray-500">{camera.ip_address}:{camera.port}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowInstructions(!showInstructions)}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm hover:bg-blue-200 transition-colors"
                >
                  {showInstructions ? 'Hide Guide' : 'Show Guide'}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions Panel */}
        {!isFullscreen && showInstructions && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  Camera Controls
                </h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <div className="flex items-center space-x-2">
                    <kbd className="px-2 py-1 bg-blue-200 rounded text-xs">Space</kbd>
                    <span>Start/Stop camera streaming</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <kbd className="px-2 py-1 bg-blue-200 rounded text-xs">D</kbd>
                    <span>Toggle object detection</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <kbd className="px-2 py-1 bg-blue-200 rounded text-xs">Ctrl+F</kbd>
                    <span>Enter/Exit fullscreen mode</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <kbd className="px-2 py-1 bg-blue-200 rounded text-xs">Esc</kbd>
                    <span>Close preview or exit fullscreen</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                  <Eye className="w-4 h-4 mr-2" />
                  Interactive Features
                </h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-600 font-medium">🎯</span>
                    <span>Click on detected objects to hear unique sounds</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-600 font-medium">🔊</span>
                    <span>Audio feedback based on object type and confidence</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-600 font-medium">📊</span>
                    <span>Real-time object detection and counting</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-600 font-medium">⚡</span>
                    <span>Live status indicators and detection results</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Camera Stream */}
        <div className={`relative ${isFullscreen ? 'h-full' : 'flex-1 bg-gray-900'}`}>
          <div className="w-full h-full">
            <InteractiveCameraStream 
              cameraId={camera.id}
              enableObjectClick={enableObjectClick}
              enableSoundAlerts={enableSoundAlerts}
              onObjectClick={(detection) => {
                console.log('Object clicked:', detection);
              }}
            />
          </div>

          {/* Status Indicators - Always Visible */}
          <div className="absolute top-4 left-4 flex flex-col space-y-2 z-40">
            {/* Streaming Status */}
            <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${
              status.isStreaming 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-600 text-white'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                status.isStreaming ? 'bg-white animate-pulse' : 'bg-gray-300'
              }`}></div>
              {status.isStreaming ? 'LIVE' : 'OFFLINE'}
            </div>
            
            {/* Detection Status */}
            <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${
              status.isDetecting 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-600 text-white'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                status.isDetecting ? 'bg-white animate-pulse' : 'bg-gray-300'
              }`}></div>
              {status.isDetecting ? 'DETECTING' : 'DETECTION OFF'}
            </div>
            
            {/* Object Count */}
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              totalObjects > 0 
                ? 'bg-purple-500 text-white' 
                : 'bg-gray-600 text-white'
            }`}>
              Objects: {totalObjects}
            </div>
          </div>

          {/* Object Detection Panel - Always Visible */}
          <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white p-3 rounded-lg min-w-48 z-40">
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <Eye className="w-4 h-4 mr-2" />
              Detection Results
            </h4>
            {status.isDetecting && Object.keys(currentObjectCounts).length > 0 ? (
              <div className="space-y-1">
                {Object.entries(currentObjectCounts).map(([objectClass, count]) => (
                  <div key={objectClass} className="flex justify-between text-xs">
                    <span className="capitalize">{objectClass}:</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            ) : status.isDetecting ? (
              <div className="text-xs text-gray-300">
                🔍 Scanning for objects...
              </div>
            ) : status.isStreaming ? (
              <div className="text-xs text-gray-300">
                ⏸️ Detection disabled
                <br />Click "Start Detection" to begin
              </div>
            ) : (
              <div className="text-xs text-gray-300">
                📹 Camera offline
                <br />Click "Start Camera" first
              </div>
            )}
          </div>

          {/* Controls Overlay - Enhanced and Always Visible */}
          <div className="absolute bottom-4 left-4 right-4 z-50">
            <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-lg p-4 shadow-2xl">
              <div className="flex items-center justify-between">
                {/* Left Controls */}
                <div className="flex space-x-3">
                  <button
                    onClick={handleStartStop}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                      status.isStreaming
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {status.isStreaming ? (
                      <>
                        <Pause className="w-4 h-4" />
                        <span>Stop Camera</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Start Camera</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleToggleDetection}
                    disabled={!status.isStreaming}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                      status.isDetecting
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : status.isStreaming 
                          ? 'bg-blue-500 hover:bg-blue-600 text-white'
                          : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {status.isDetecting ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        <span>Stop Detection</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>Start Detection</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right Controls */}
                <div className="flex space-x-2">
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors"
                    title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen (Ctrl+F)'}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-5 h-5" />
                    ) : (
                      <Maximize2 className="w-5 h-5" />
                    )}
                  </button>

                  {isFullscreen && (
                    <button
                      onClick={onClose}
                      className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors"
                      title="Close (Esc)"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Status Bar */}
              <div className="mt-3 pt-3 border-t border-white border-opacity-20">
                <div className="flex items-center justify-between text-sm text-white">
                  <div className="flex items-center space-x-4">
                    <span className={status.isStreaming ? 'text-green-300' : 'text-red-300'}>
                      📹 {status.isStreaming ? 'Streaming' : 'Offline'}
                    </span>
                    <span className={status.isDetecting ? 'text-blue-300' : 'text-gray-300'}>
                      🤖 {status.isDetecting ? 'AI Active' : 'AI Inactive'}
                    </span>
                    {enableObjectClick && status.isDetecting && (
                      <span className="text-yellow-300">🔊 Click objects for sounds</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-300">
                    Resolution: {status.isStreaming ? '640x480' : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        {!isFullscreen && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="space-y-3">
              {/* Status Row */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      status.isStreaming ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    }`}></div>
                    <span className={status.isStreaming ? 'text-green-600 font-medium' : 'text-gray-600'}>
                      {status.isStreaming ? 'Streaming' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      status.isDetecting ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
                    }`}></div>
                    <span className={status.isDetecting ? 'text-blue-600 font-medium' : 'text-gray-600'}>
                      Detection {status.isDetecting ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {status.isDetecting && totalObjects > 0 && (
                    <span className="text-purple-600 font-medium">
                      Objects: {totalObjects}
                    </span>
                  )}
                  <span className="text-gray-600">
                    Resolution: {status.isStreaming ? '640x480' : 'N/A'}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Camera ID: {camera.id}
                </div>
              </div>
              
              {/* Quick Actions Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {!status.isStreaming ? (
                    <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                      💡 Click "Start Camera" to begin streaming
                    </span>
                  ) : !status.isDetecting ? (
                    <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      🎯 Enable detection to see interactive objects
                    </span>
                  ) : enableObjectClick ? (
                    <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                      🔊 Click objects in the stream to hear sounds!
                    </span>
                  ) : (
                    <span className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
                      👁️ Object detection is running
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>Shortcuts:</span>
                  <div className="flex space-x-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-200 rounded">Space</kbd>
                    <kbd className="px-1.5 py-0.5 bg-gray-200 rounded">D</kbd>
                    <kbd className="px-1.5 py-0.5 bg-gray-200 rounded">Ctrl+F</kbd>
                    <kbd className="px-1.5 py-0.5 bg-gray-200 rounded">Esc</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraPreviewModal;