import React, { useState, useEffect } from 'react';
import { X, Settings, Volume2, VolumeX, Eye, EyeOff, Save } from 'lucide-react';
import { CameraSettings } from '../types';
import { cameraAPI } from '../services/api';
import toast from 'react-hot-toast';

interface CameraSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cameraId: string;
  cameraName: string;
}

const availableObjects = [
  { name: 'person', label: 'Person', icon: '👤', description: 'Detect people' },
  { name: 'car', label: 'Car', icon: '🚗', description: 'Detect cars' },
  { name: 'truck', label: 'Truck', icon: '🚚', description: 'Detect trucks' },
  { name: 'bus', label: 'Bus', icon: '🚌', description: 'Detect buses' },
  { name: 'motorcycle', label: 'Motorcycle', icon: '🏍️', description: 'Detect motorcycles' },
  { name: 'bicycle', label: 'Bicycle', icon: '🚲', description: 'Detect bicycles' },
  { name: 'dog', label: 'Dog', icon: '🐶', description: 'Detect dogs' },
  { name: 'cat', label: 'Cat', icon: '🐱', description: 'Detect cats' },
  { name: 'bird', label: 'Bird', icon: '🐦', description: 'Detect birds' },
  { name: 'horse', label: 'Horse', icon: '🐴', description: 'Detect horses' },
  { name: 'sheep', label: 'Sheep', icon: '🐑', description: 'Detect sheep' },
  { name: 'cow', label: 'Cow', icon: '🐄', description: 'Detect cows' },
  { name: 'bottle', label: 'Bottle', icon: '🍼', description: 'Detect bottles' },
  { name: 'chair', label: 'Chair', icon: '🪑', description: 'Detect chairs' },
  { name: 'dining table', label: 'Table', icon: '🪑', description: 'Detect tables' },
  { name: 'laptop', label: 'Laptop', icon: '💻', description: 'Detect laptops' },
  { name: 'cell phone', label: 'Phone', icon: '📱', description: 'Detect phones' },
  { name: 'book', label: 'Book', icon: '📚', description: 'Detect books' }
];

export const CameraSettingsModal: React.FC<CameraSettingsModalProps> = ({
  isOpen,
  onClose,
  cameraId,
  cameraName
}) => {
  const [settings, setSettings] = useState<CameraSettings>({
    enabled_objects: ['person', 'car', 'truck', 'bus', 'motorcycle', 'bicycle'],
    detection_threshold: 0.5,
    show_bounding_boxes: true,
    play_sound_alerts: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && cameraId) {
      loadCameraSettings();
    }
  }, [isOpen, cameraId]);

  const loadCameraSettings = async () => {
    try {
      setIsLoading(true);
      const cameraSettings = await cameraAPI.getCameraSettings(cameraId);
      setSettings(cameraSettings);
    } catch (error) {
      console.error('Error loading camera settings:', error);
      toast.error('Failed to load camera settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await cameraAPI.updateCameraSettings(cameraId, settings);
      toast.success('Camera settings saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving camera settings:', error);
      toast.error('Failed to save camera settings');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleObject = (objectName: string) => {
    setSettings(prev => ({
      ...prev,
      enabled_objects: prev.enabled_objects.includes(objectName)
        ? prev.enabled_objects.filter(obj => obj !== objectName)
        : [...prev.enabled_objects, objectName]
    }));
  };

  const selectAllObjects = () => {
    setSettings(prev => ({
      ...prev,
      enabled_objects: availableObjects.map(obj => obj.name)
    }));
  };

  const clearAllObjects = () => {
    setSettings(prev => ({
      ...prev,
      enabled_objects: []
    }));
  };

  const selectCommonObjects = () => {
    setSettings(prev => ({
      ...prev,
      enabled_objects: ['person', 'car', 'truck', 'bus', 'motorcycle', 'bicycle']
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Camera Detection Settings
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure object detection for {cameraName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* General Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  General Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Detection Threshold */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Detection Threshold: {Math.round(settings.detection_threshold * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.1"
                      value={settings.detection_threshold}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        detection_threshold: parseFloat(e.target.value)
                      }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low (10%)</span>
                      <span>High (90%)</span>
                    </div>
                  </div>

                  {/* Visual Settings */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Show Bounding Boxes
                      </span>
                      <button
                        onClick={() => setSettings(prev => ({
                          ...prev,
                          show_bounding_boxes: !prev.show_bounding_boxes
                        }))}
                        className={`flex items-center gap-2 px-3 py-1 rounded-md ${
                          settings.show_bounding_boxes
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {settings.show_bounding_boxes ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        {settings.show_bounding_boxes ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Sound Alerts(coming soon)
                      </span>
                      <button
                        onClick={() => setSettings(prev => ({
                          ...prev,
                          play_sound_alerts: !prev.play_sound_alerts
                        }))}
                        className={`flex items-center gap-2 px-3 py-1 rounded-md ${
                          settings.play_sound_alerts
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {settings.play_sound_alerts ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        {settings.play_sound_alerts ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Object Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Object Detection Filter
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={selectCommonObjects}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                    >
                      Common Objects
                    </button>
                    <button
                      onClick={selectAllObjects}
                      className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearAllObjects}
                      className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Selected: {settings.enabled_objects.length} of {availableObjects.length} objects
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(settings.enabled_objects.length / availableObjects.length) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {availableObjects.map((object) => (
                    <button
                      key={object.name}
                      onClick={() => toggleObject(object.name)}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 ${
                        settings.enabled_objects.includes(object.name)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                      title={object.description}
                    >
                      <span className="text-lg">{object.icon}</span>
                      <div className="text-left">
                        <div className="text-sm font-medium">{object.label}</div>
                        {settings.enabled_objects.includes(object.name) && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {settings.enabled_objects.length === 0 && (
              <span className="text-orange-600">⚠️ No objects selected - detection will be disabled</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraSettingsModal;