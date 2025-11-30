import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera } from 'lucide-react';
import { useCamera } from '../contexts/CameraContext';
import { Detection } from '../types';
import AudioManager from '../services/AudioManager';

interface InteractiveCameraStreamProps {
  cameraId: string;
  enableObjectClick?: boolean;
  enableSoundAlerts?: boolean;
  onObjectClick?: (detection: Detection) => void;
}

interface ClickableDetection extends Detection {
  id: string;
  screenX: number;
  screenY: number;
  screenWidth: number;
  screenHeight: number;
}

const InteractiveCameraStream: React.FC<InteractiveCameraStreamProps> = ({ 
  cameraId, 
  enableObjectClick = false,
  enableSoundAlerts = false,
  onObjectClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [clickableDetections, setClickableDetections] = useState<ClickableDetection[]>([]);
  const [lastSoundTime, setLastSoundTime] = useState<{ [key: string]: number }>({});
  const { cameraStreams, cameraStatuses, detectionResults } = useCamera();
  
  const currentStream = cameraStreams[cameraId];
  const status = cameraStatuses[cameraId];
  const detections = detectionResults[cameraId];

  // Sound cooldown to prevent spam (1 second per object type)
  const SOUND_COOLDOWN = 1000;

  const playDetectionSound = useCallback((objectType: string, confidence: number) => {
    if (!enableSoundAlerts || !objectType) return;
    
    const now = Date.now();
    const lastPlayTime = lastSoundTime[objectType] || 0;
    
    if (now - lastPlayTime > SOUND_COOLDOWN) {
      AudioManager.getInstance().playObjectDetectionSound(objectType, confidence || 0.5);
      setLastSoundTime(prev => ({ ...prev, [objectType]: now }));
    }
  }, [enableSoundAlerts, lastSoundTime]);

  const calculateScreenCoordinates = useCallback((detection: Detection, imageWidth: number, imageHeight: number) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !detection.bbox) return null;

    const containerRect = container.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    // Calculate scaling factors
    const scaleX = canvasRect.width / imageWidth;
    const scaleY = canvasRect.height / imageHeight;
    
    // Convert bbox to screen coordinates
    const screenX = detection.bbox.x1 * scaleX;
    const screenY = detection.bbox.y1 * scaleY;
    const screenWidth = detection.bbox.width * scaleX;
    const screenHeight = detection.bbox.height * scaleY;

    return {
      screenX: screenX + canvasRect.left - containerRect.left,
      screenY: screenY + canvasRect.top - containerRect.top,
      screenWidth,
      screenHeight
    };
  }, []);

  // Update clickable detections when detections change
  useEffect(() => {
    if (!enableObjectClick || !detections || !detections.detections) {
      setClickableDetections([]);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const clickableItems: ClickableDetection[] = [];
    
    detections.detections.forEach((detection, index) => {
      // Skip if essential detection data is missing
      if (!detection.bbox || !detection.class_name) return;
      
      const screenCoords = calculateScreenCoordinates(detection, canvas.width, canvas.height);
      
      if (screenCoords) {
        clickableItems.push({
          ...detection,
          id: `${cameraId}-${index}-${Date.now()}`,
          ...screenCoords
        });

        // Play sound for new detections
        if (enableSoundAlerts && detection.class_name) {
          playDetectionSound(detection.class_name, detection.confidence || 0.5);
        }
      }
    });

    setClickableDetections(clickableItems);
  }, [detections, enableObjectClick, enableSoundAlerts, calculateScreenCoordinates, cameraId, playDetectionSound]);

  const handleObjectClick = (detection: ClickableDetection) => {
    // Play click sound
    AudioManager.getInstance().playUISound('click');
    
    // Custom click handler
    if (onObjectClick) {
      onObjectClick(detection);
    }

    // Play object-specific sound with safety check
    if (detection.class_name) {
      AudioManager.getInstance().playObjectDetectionSound(detection.class_name, detection.confidence || 0.5);
    }
  };

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

      // Draw bounding boxes if enabled and detections exist
      if (enableObjectClick && detections && detections.detections) {
        drawBoundingBoxes(ctx, detections.detections);
      }
    };

    img.onerror = () => {
      console.error('Failed to load camera frame');
    };

    img.src = `data:image/jpeg;base64,${currentStream}`;
  }, [currentStream, detections, enableObjectClick]);

  const drawBoundingBoxes = (ctx: CanvasRenderingContext2D, detections: Detection[]) => {
    detections.forEach((detection, index) => {
      const { bbox, class_name, confidence } = detection;
      
      // Skip detection if essential data is missing
      if (!class_name || !bbox) return;
      
      // Choose color based on object type
      const colors: { [key: string]: string } = {
        'person': '#ff6b6b',
        'car': '#4ecdc4',
        'truck': '#45b7d1',
        'bus': '#96ceb4',
        'motorcycle': '#ffeaa7',
        'bicycle': '#fd79a8',
        'dog': '#fdcb6e',
        'cat': '#e17055',
        'bird': '#81ecec',
      };
      
      const color = colors[class_name.toLowerCase()] || '#74b9ff';
      
      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(bbox.x1, bbox.y1, bbox.width, bbox.height);
      
      // Draw filled background for label
      const confidenceValue = confidence || 0;
      const label = `${class_name} (${(confidenceValue * 100).toFixed(0)}%)`;
      ctx.font = '14px Arial';
      const textMetrics = ctx.measureText(label);
      const labelHeight = 20;
      
      ctx.fillStyle = color;
      ctx.fillRect(bbox.x1, bbox.y1 - labelHeight, textMetrics.width + 10, labelHeight);
      
      // Draw label text
      ctx.fillStyle = 'white';
      ctx.fillText(label, bbox.x1 + 5, bbox.y1 - 5);
      
      // Draw click indicator for interactive mode
      if (enableObjectClick) {
        // Draw small click icon
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(bbox.x1 + bbox.width - 15, bbox.y1 + 15, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = color;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🔊', bbox.x1 + bbox.width - 15, bbox.y1 + 19);
        ctx.textAlign = 'left';
      }
    });
  };

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

  return (
    <div ref={containerRef} className="relative w-full h-full bg-gray-900">
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain cursor-pointer"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
      
      {/* Clickable overlay for detections */}
      {enableObjectClick && (
        <div className="absolute inset-0 pointer-events-none">
          {clickableDetections.map((detection) => (
            <div
              key={detection.id}
              className="absolute pointer-events-auto cursor-pointer hover:bg-blue-500 hover:bg-opacity-20 transition-colors duration-200 border-2 border-transparent hover:border-blue-400 rounded"
              style={{
                left: detection.screenX,
                top: detection.screenY,
                width: detection.screenWidth,
                height: detection.screenHeight,
              }}
              onClick={() => handleObjectClick(detection)}
              title={`Click to hear ${detection.class_name || 'object'} sound (${((detection.confidence || 0) * 100).toFixed(0)}% confidence)`}
            />
          ))}
        </div>
      )}

      {/* Object count indicator */}
      {detections && detections.object_counts && Object.keys(detections.object_counts).length > 0 && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg">
          <div className="text-sm font-medium mb-1">
            {enableObjectClick ? 'Click objects for sounds' : 'Objects detected'}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(detections.object_counts).map(([className, count]) => (
              <span key={className} className="text-xs bg-blue-600 px-2 py-1 rounded">
                {className}: {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveCameraStream;