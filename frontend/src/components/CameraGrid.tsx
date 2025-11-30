import React, { useState } from 'react';
import CameraCard from './CameraCard';
import CameraPreviewModal from './CameraPreviewModal';
import { Camera } from '../types';
import { useCamera } from '../contexts/CameraContext';

interface CameraGridProps {
  onShowAnalytics: (cameraId: string) => void;
}

const CameraGrid: React.FC<CameraGridProps> = ({ onShowAnalytics }) => {
  const { cameras } = useCamera();
  const [previewCamera, setPreviewCamera] = useState<Camera | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handlePreviewCamera = (camera: Camera) => {
    setPreviewCamera(camera);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewCamera(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {cameras.map((camera) => (
          <CameraCard
            key={camera.id}
            camera={camera}
            onShowAnalytics={() => onShowAnalytics(camera.id)}
            onPreview={() => handlePreviewCamera(camera)}
          />
        ))}
      </div>

      <CameraPreviewModal
        camera={previewCamera}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        enableObjectClick={true}
        enableSoundAlerts={true}
      />
    </>
  );
};

export default CameraGrid;