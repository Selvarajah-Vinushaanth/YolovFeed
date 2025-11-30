import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Camera, CameraStatus, DetectionResult, CameraStream, ObjectCount, CameraSettings } from '../types';
import { cameraAPI } from '../services/api';
import { useSocket } from './SocketContext';
import toast from 'react-hot-toast';

interface CameraContextType {
  cameras: Camera[];
  cameraStatuses: CameraStatus;
  detectionResults: { [cameraId: string]: DetectionResult };
  cameraStreams: { [cameraId: string]: string };
  objectCounts: { [cameraId: string]: ObjectCount };
  cameraSettings: { [cameraId: string]: CameraSettings };
  addCamera: (camera: { name: string; ip_address: string; port: number }) => Promise<void>;
  deleteCamera: (cameraId: string) => Promise<void>;
  startCamera: (cameraId: string) => Promise<void>;
  stopCamera: (cameraId: string) => Promise<void>;
  toggleDetection: (cameraId: string, enabled: boolean) => Promise<void>;
  updateCameraSettings: (cameraId: string, settings: CameraSettings) => Promise<void>;
  getCameraSettings: (cameraId: string) => Promise<CameraSettings>;
  refreshCameras: () => Promise<void>;
  isLoading: boolean;
  connectionStatus: boolean; // Add this to the context type
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export const useCamera = () => {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error('useCamera must be used within a CameraProvider');
  }
  return context;
};

interface CameraProviderProps {
  children: ReactNode;
}

export const CameraProvider: React.FC<CameraProviderProps> = ({ children }) => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [cameraStatuses, setCameraStatuses] = useState<CameraStatus>({});
  const [detectionResults, setDetectionResults] = useState<{ [cameraId: string]: DetectionResult }>({});
  const [cameraStreams, setCameraStreams] = useState<{ [cameraId: string]: string }>({});
  const [objectCounts, setObjectCounts] = useState<{ [cameraId: string]: ObjectCount }>({});
  const [cameraSettings, setCameraSettings] = useState<{ [cameraId: string]: CameraSettings }>({});
  const [isLoading, setIsLoading] = useState(true);

  const { ws, isConnected } = useSocket();

  // Add a new state to track the connection status for the dashboard
  const [connectionStatus, setConnectionStatus] = useState(isConnected);

  // Update the connection status whenever `isConnected` changes
  useEffect(() => {
    setConnectionStatus(isConnected);
  }, [isConnected]);

  // Load cameras on mount
  useEffect(() => {
    refreshCameras();
  }, []);

  // Setup socket listeners
  useEffect(() => {
    if (!ws || !isConnected) return;

    const handleSocketMessage = (data: any) => {
      try {
        const message = typeof data === 'string' ? JSON.parse(data) : data;

        switch (message.type) {
          case 'frame':
            setCameraStreams(prev => ({
              ...prev,
              [message.camera_id]: message.frame
            }));
            setCameraStatuses(prev => ({
              ...prev,
              [message.camera_id]: {
                ...prev[message.camera_id],
                isStreaming: true, // Ensure this is set to true when a frame is received
                lastSeen: message.timestamp || new Date().toISOString()
              }
            }));
            break;

          case 'detection':
            setDetectionResults(prev => ({
              ...prev,
              [message.camera_id]: message
            }));
            if (message.object_counts) {
              setObjectCounts(prev => ({
                ...prev,
                [message.camera_id]: message.object_counts
              }));
            }
            setCameraStatuses(prev => ({
              ...prev,
              [message.camera_id]: {
                ...prev[message.camera_id],
                isDetecting: true, // Ensure this is set to true when detection data is received
                lastSeen: message.timestamp || new Date().toISOString()
              }
            }));
            break;

          case 'detection_status':
            setCameraStatuses(prev => ({
              ...prev,
              [message.camera_id]: {
                ...prev[message.camera_id],
                isDetecting: message.enabled || false
              }
            }));
            break;

          case 'pong':
            // Handle pong response to ping - just acknowledge it's working
            console.log('Received pong, connection is alive');
            break;

          default:
            console.warn("Unknown message type:", message.type);
        }
      } catch (error) {
        console.error("Error handling socket message:", error);
      }
    };

    ws.onmessage = (event: MessageEvent) => {
      handleSocketMessage(event.data);
    };

    // Send periodic ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws && isConnected) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
    };
  }, [ws, isConnected]);

  const refreshCameras = async () => {
    try {
      setIsLoading(true);
      const cameraList = await cameraAPI.getCameras();
      setCameras(cameraList);
      
      // Initialize camera statuses
      const statuses: CameraStatus = {};
      cameraList.forEach(camera => {
        statuses[camera.id] = {
          isStreaming: false,
          isDetecting: false,
          lastSeen: camera.created_at
        };
      });
      setCameraStatuses(statuses);
    } catch (error) {
      console.error('Error fetching cameras:', error);
      toast.error('Failed to load cameras');
    } finally {
      setIsLoading(false);
    }
  };

  const addCamera = async (cameraData: { name: string; ip_address: string; port: number }) => {
    try {
      setIsLoading(true);
      const newCamera = await cameraAPI.addCamera(cameraData);
      setCameras(prev => [...prev, newCamera]);
      
      // Initialize status for new camera
      setCameraStatuses(prev => ({
        ...prev,
        [newCamera.id]: {
          isStreaming: false,
          isDetecting: false,
          lastSeen: newCamera.created_at
        }
      }));
      
      toast.success(`Camera "${newCamera.name}" added successfully`, { duration: 2000 });
    } catch (error) {
      console.error('Error adding camera:', error);
      toast.error('Failed to add camera. Please check the IP address and port.', { duration: 3000 });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCamera = async (cameraId: string) => {
    try {
      await cameraAPI.deleteCamera(cameraId);
      setCameras(prev => prev.filter(camera => camera.id !== cameraId));
      
      // Clean up camera data
      setCameraStatuses(prev => {
        const newStatuses = { ...prev };
        delete newStatuses[cameraId];
        return newStatuses;
      });
      
      setDetectionResults(prev => {
        const newResults = { ...prev };
        delete newResults[cameraId];
        return newResults;
      });
      
      setCameraStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[cameraId];
        return newStreams;
      });
      
      setObjectCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[cameraId];
        return newCounts;
      });
      
      toast.success('Camera deleted successfully', { duration: 2000 });
    } catch (error) {
      console.error('Error deleting camera:', error);
      toast.error('Failed to delete camera');
      throw error;
    }
  };

  const startCamera = async (cameraId: string) => {
    try {
      await cameraAPI.startCamera(cameraId);
      setCameraStatuses(prev => ({
        ...prev,
        [cameraId]: {
          ...prev[cameraId],
          isStreaming: true,
          error: undefined
        }
      }));
      toast.success('Camera started', { duration: 1500 });
    } catch (error) {
      console.error('Error starting camera:', error);
      setCameraStatuses(prev => ({
        ...prev,
        [cameraId]: {
          ...prev[cameraId],
          isStreaming: false,
          error: 'Failed to start camera'
        }
      }));
      toast.error('Failed to start camera');
      throw error;
    }
  };

  const stopCamera = async (cameraId: string) => {
    try {
      await cameraAPI.stopCamera(cameraId);
      setCameraStatuses(prev => ({
        ...prev,
        [cameraId]: {
          ...prev[cameraId],
          isStreaming: false,
          isDetecting: false,
          error: undefined
        }
      }));
      
      // Clear camera data
      setCameraStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[cameraId];
        return newStreams;
      });
      
      toast.success('Camera stopped', { duration: 1500 });
    } catch (error) {
      console.error('Error stopping camera:', error);
      toast.error('Failed to stop camera');
      throw error;
    }
  };

  const toggleDetection = async (cameraId: string, enabled: boolean) => {
    try {
      await cameraAPI.toggleDetection(cameraId, enabled);
      setCameraStatuses(prev => ({
        ...prev,
        [cameraId]: {
          ...prev[cameraId],
          isDetecting: enabled
        }
      }));
      
      if (!enabled) {
        // Clear detection results when disabling
        setDetectionResults(prev => {
          const newResults = { ...prev };
          delete newResults[cameraId];
          return newResults;
        });
        
        setObjectCounts(prev => {
          const newCounts = { ...prev };
          delete newCounts[cameraId];
          return newCounts;
        });
      }
      
      toast.success(`Detection ${enabled ? 'enabled' : 'disabled'}`, { duration: 1500 });
    } catch (error) {
      console.error('Error toggling detection:', error);
      toast.error('Failed to toggle detection');
      throw error;
    }
  };

  const updateCameraSettings = async (cameraId: string, settings: CameraSettings) => {
    try {
      await cameraAPI.updateCameraSettings(cameraId, settings);
      setCameraSettings(prev => ({
        ...prev,
        [cameraId]: settings
      }));
      toast.success('Camera settings updated', { duration: 1500 });
    } catch (error) {
      console.error('Error updating camera settings:', error);
      toast.error('Failed to update camera settings');
      throw error;
    }
  };

  const getCameraSettings = async (cameraId: string): Promise<CameraSettings> => {
    try {
      const settings = await cameraAPI.getCameraSettings(cameraId);
      setCameraSettings(prev => ({
        ...prev,
        [cameraId]: settings
      }));
      return settings;
    } catch (error) {
      console.error('Error getting camera settings:', error);
      toast.error('Failed to get camera settings');
      throw error;
    }
  };

  const value = {
    cameras,
    cameraStatuses,
    detectionResults, // Ensure this is included
    cameraStreams,
    objectCounts, // Ensure this is included
    cameraSettings,
    addCamera,
    deleteCamera,
    startCamera,
    stopCamera,
    toggleDetection,
    updateCameraSettings,
    getCameraSettings,
    refreshCameras,
    isLoading,
    connectionStatus,
  };

  return (
    <CameraContext.Provider value={value}>
      {children}
    </CameraContext.Provider>
  );
};