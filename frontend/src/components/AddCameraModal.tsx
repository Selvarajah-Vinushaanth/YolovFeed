import React, { useState } from 'react';
import { X, Plus, AlertCircle, Smartphone } from 'lucide-react';
import { useCamera } from '../contexts/CameraContext';

interface AddCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddCameraModal: React.FC<AddCameraModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    ip_address: '',
    port: 8080,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { addCamera } = useCamera();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name.trim() || !formData.ip_address.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Validate IP address format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(formData.ip_address)) {
      setError('Please enter a valid IP address');
      return;
    }
    
    // Validate port
    if (formData.port < 1 || formData.port > 65535) {
      setError('Port must be between 1 and 65535');
      return;
    }

    try {
      setIsSubmitting(true);
      await addCamera(formData);
      
      // Reset form and close modal
      setFormData({ name: '', ip_address: '', port: 8080 });
      onClose();
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        setError('The request timed out. Please try again.');
      } else if (error.response && error.response.data && error.response.data.detail) {
        setError(`Error: ${error.response.data.detail}`);
      } else {
        setError('Failed to add camera. Please check the connection details.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Add New Camera</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Setup Instructions */}
        <div className="p-6 bg-blue-50 border-b">
          <div className="flex items-start space-x-3">
            <Smartphone className="w-6 h-6 text-blue-600 mt-1" />
            <div>
              <h3 className="font-medium text-blue-900 mb-2">IP Webcam Setup</h3>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Install "IP Webcam" app on your phone</li>
                <li>2. Start the server in the app</li>
                <li>3. Note the IP address shown (e.g., 192.168.1.100)</li>
                <li>4. Enter the details below</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Camera Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Camera Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Front Door, Living Room"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* IP Address */}
            <div>
              <label htmlFor="ip_address" className="block text-sm font-medium text-gray-700 mb-2">
                IP Address *
              </label>
              <input
                type="text"
                id="ip_address"
                name="ip_address"
                value={formData.ip_address}
                onChange={handleInputChange}
                placeholder="192.168.1.100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                The IP address shown in the IP Webcam app
              </p>
            </div>

            {/* Port */}
            <div>
              <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-2">
                Port
              </label>
              <input
                type="number"
                id="port"
                name="port"
                value={formData.port}
                onChange={handleInputChange}
                min="1"
                max="65535"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default port is 8080 (usually doesn't need to be changed)
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add Camera</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Tips */}
        <div className="px-6 pb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Tips:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Make sure your phone and computer are on the same network</li>
              <li>• Keep the IP Webcam app running in the foreground</li>
              <li>• Test the connection before saving</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCameraModal;