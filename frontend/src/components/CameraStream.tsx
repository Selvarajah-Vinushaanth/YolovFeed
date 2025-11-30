import React, { useEffect, useRef } from 'react';
import { Camera } from 'lucide-react';
import { useCamera } from '../contexts/CameraContext';

interface CameraStreamProps {
  cameraId: string;
}

const CameraStream: React.FC<CameraStreamProps> = ({ cameraId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { cameraStreams, cameraStatuses } = useCamera();
  
  const currentStream = cameraStreams[cameraId];
  const status = cameraStatuses[cameraId];

  useEffect(() => {
    if (!canvasRef.current || !currentStream) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Clear canvas and draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };

    img.onerror = () => {
      console.error('Failed to load camera frame');
    };

    // Convert base64 to image
    img.src = `data:image/jpeg;base64,${currentStream}`;
  }, [currentStream]);

  if (!status?.isStreaming) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400">
        <div className="text-center">
          <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Camera Offline</p>
          <p className="text-sm mt-2">Click "Start" to begin streaming</p>
        </div>
      </div>
    );
  }

  if (!currentStream) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium">Connecting...</p>
          <p className="text-sm mt-2">Waiting for video stream</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover"
        style={{ imageRendering: 'auto' }}
      />
      
      {/* Live indicator */}
      <div className="absolute top-2 right-2 flex items-center space-x-1 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span>LIVE</span>
      </div>
      
      {/* FPS Counter (optional) */}
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
        Camera {cameraId}
      </div>
    </div>
  );
};

export default CameraStream;