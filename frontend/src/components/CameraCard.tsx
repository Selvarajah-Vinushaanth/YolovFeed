import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  Eye, 
  EyeOff, 
  Trash2, 
  BarChart3, 
  Wifi, 
  WifiOff,
  Settings,
  AlertCircle,
  AlertTriangle,
  X
} from 'lucide-react';
import { Camera } from '../types';
import { useCamera } from '../contexts/CameraContext';
import CameraStream from './CameraStream';
import CameraSettingsModal from './CameraSettingsModal';

interface CameraCardProps {
  camera: Camera;
  onShowAnalytics: () => void;
  onPreview: () => void;
}

const CameraCard: React.FC<CameraCardProps> = ({ camera, onShowAnalytics, onPreview }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const {
    cameraStatuses,
    objectCounts,
    startCamera,
    stopCamera,
    deleteCamera,
    toggleDetection,
  } = useCamera();

  const status = cameraStatuses[camera.id] || {
    isStreaming: false,
    isDetecting: false,
    lastSeen: camera.created_at
  };

  const currentObjectCounts = objectCounts[camera.id] || {};
  const totalObjects = Object.values(currentObjectCounts).reduce((sum, count) => sum + count, 0);

  const handleStartCamera = async () => {
    try {
      await startCamera(camera.id);
    } catch (error) {
      console.error('Failed to start camera:', error);
    }
  };

  const handleStopCamera = async () => {
    try {
      await stopCamera(camera.id);
    } catch (error) {
      console.error('Failed to stop camera:', error);
    }
  };

  const handleToggleDetection = async () => {
    try {
      await toggleDetection(camera.id, !status.isDetecting);
    } catch (error) {
      console.error('Failed to toggle detection:', error);
    }
  };

  const handleDeleteCamera = async () => {
    try {
      setIsDeleting(true);
      await deleteCamera(camera.id);
    } catch (error) {
      console.error('Failed to delete camera:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200">
      {/* Camera Header */}
      <div className="bg-gray-50 px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{camera.name}</h3>
              <p className="text-sm text-gray-500">
                {camera.ip_address}:{camera.port}
              </p>
            </div>
          </div>
          
          {/* Status Indicators */}
          <div className="flex items-center space-x-2">
            {/* Connection Status */}
            {status.isStreaming ? (
              <div className="flex items-center space-x-1">
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-600 font-medium">LIVE</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-xs text-red-600 font-medium">OFFLINE</span>
              </div>
            )}
            
            {/* Detection Status */}
            {status.isDetecting && (
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-blue-600 font-medium">DETECTING</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Camera Stream */}
      <div 
        className="relative bg-gray-900 aspect-video cursor-pointer hover:bg-opacity-90 transition-all duration-200"
        onClick={onPreview || (() => {})}
        title="Click to preview in full screen"
      >
        <CameraStream cameraId={camera.id} />
        
        {/* Preview Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
          <div className="bg-white bg-opacity-20 rounded-full p-3">
            <Settings className="w-8 h-8 text-white" />
          </div>
        </div>
        
        {/* Error Overlay */}
        {status.error && (
          <div className="absolute inset-0 bg-red-900 bg-opacity-75 flex items-center justify-center">
            <div className="text-center text-white">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">{status.error}</p>
            </div>
          </div>
        )}
        
        {/* Object Count Overlay */}
        {status.isDetecting && totalObjects > 0 && (
          <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
            Objects: {totalObjects}
          </div>
        )}
      </div>

      {/* Object Detection Summary */}
      {status.isDetecting && Object.keys(currentObjectCounts).length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t">
          <div className="flex flex-wrap gap-2">
            {Object.entries(currentObjectCounts).map(([objectClass, count]) => (
              <span
                key={objectClass}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {objectClass}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Camera Controls */}
      <div className="px-4 py-3 bg-white border-t">
        <div className="flex items-center justify-between">
          {/* Primary Controls */}
          <div className="flex items-center space-x-2">
            {status.isStreaming ? (
              <button
                onClick={handleStopCamera}
                className="flex items-center space-x-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors duration-200"
              >
                <Square className="w-3 h-3" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={handleStartCamera}
                className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors duration-200"
              >
                <Play className="w-3 h-3" />
                <span>Start</span>
              </button>
            )}
            
            <button
              onClick={handleToggleDetection}
              disabled={!status.isStreaming}
              className={`flex items-center space-x-1 px-3 py-1 rounded text-sm transition-colors duration-200 ${
                status.isDetecting
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed'
              }`}
            >
              {status.isDetecting ? (
                <>
                  <EyeOff className="w-3 h-3" />
                  <span>Disable</span>
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" />
                  <span>Detect</span>
                </>
              )}
            </button>
          </div>

          {/* Secondary Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onShowAnalytics}
              className="p-1 text-gray-600 hover:text-blue-600 transition-colors duration-200"
              title="View Analytics"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            
            {/* Settings Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-1 text-gray-600 hover:text-purple-600 transition-colors duration-200"
              title="Camera Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="p-1 text-gray-600 hover:text-red-600 transition-colors duration-200 disabled:opacity-50"
              title="Delete Camera"
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Beautiful Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Camera</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={handleCancelDelete}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete camera <span className="font-semibold text-gray-900">"{camera.name}"</span>?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">This will permanently:</p>
                    <ul className="list-disc list-inside space-y-1 text-yellow-700">
                      <li>Remove the camera from your system</li>
                      <li>Delete all analytics and detection history</li>
                      <li>Stop any active streaming or detection</li>
                    </ul>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Camera: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{camera.ip_address}:{camera.port}</span>
              </p>
            </div>
            
            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 rounded-b-lg">
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCamera}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors flex items-center space-x-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Camera</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Camera Settings Modal */}
      <CameraSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        cameraId={camera.id}
        cameraName={camera.name}
      />
    </div>
  );
};

export default CameraCard;