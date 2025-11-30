import React, { useEffect, useState } from 'react';
import { Plus, BarChart3, Settings, Activity, AlertTriangle, TrendingUp, Clock, Eye, Camera, Wifi, WifiOff, MessageCircle, Zap } from 'lucide-react';
import CameraGrid from './CameraGrid';
// import InteractiveDashboard from './InteractiveDashboard';
import AddCameraModal from './AddCameraModal';
import AnalyticsPanel from './AnalyticsPanel';
import ChatAssistant from './ChatAssistant';
import { useCamera } from '../contexts/CameraContext';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
import { useSocket } from '../contexts/SocketContext';

const Dashboard: React.FC = () => {
  const [isAddCameraModalOpen, setIsAddCameraModalOpen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showChatAssistant, setShowChatAssistant] = useState(false);
  const [showInteractiveMode, setShowInteractiveMode] = useState(false);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [detectionTrend, setDetectionTrend] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  
  const { cameras, isLoading, cameraStatuses, objectCounts, detectionResults } = useCamera();
  const { isConnected } = useSocket();

  // Calculate real-time statistics
  const totalDetections = Object.values(objectCounts).reduce(
    (sum, counts) => sum + Object.values(counts).reduce((s, c) => s + c, 0), 0
  );
  
  const detectingCameras = Object.keys(objectCounts).filter(
    cameraId => Object.values(objectCounts[cameraId]).some(count => count > 0)
  ).length;
  
  const uniqueObjectTypes = new Set(
    Object.values(objectCounts).flatMap(counts => Object.keys(counts))
  ).size;
  
  const activeCameras = cameras.filter(camera => camera.is_active).length;

  const handleAddCamera = () => {
    setIsAddCameraModalOpen(true);
  };

  // const handleShowAnalytics = (cameraId: number) => {
  //   setSelectedCameraId(cameraId);
  //   setShowAnalytics(true);
  // };

  const handleShowAnalytics = (cameraId: string) => {
    setSelectedCameraId(cameraId);
    setShowAnalytics(true);
  };

  useEffect(() => {
    // Prepare data for object distribution chart
    const aggregatedCounts: { [key: string]: number } = {};
    Object.values(objectCounts).forEach((counts) => {
      Object.entries(counts).forEach(([object, count]) => {
        aggregatedCounts[object] = (aggregatedCounts[object] || 0) + count;
      });
    });

    setChartData({
      labels: Object.keys(aggregatedCounts),
      datasets: [
        {
          label: 'Object Distribution',
          data: Object.values(aggregatedCounts),
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40',
          ],
        },
      ],
    });
  }, [objectCounts]);

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Camera Dashboard</h2>
          <p className="text-gray-600 mt-2">
            Manage your cameras and monitor object detection in real-time
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* <button
            onClick={() => setShowInteractiveMode(true)}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
          >
            <Zap className="w-5 h-5" />
            <span>Interactive Mode</span>
          </button> */}
          
          <button
            onClick={() => setShowChatAssistant(true)}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
          >
            <MessageCircle className="w-5 h-5" />
            <span>AI Assistant</span>
          </button>
          <button
            onClick={handleAddCamera}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
          >
            <Plus className="w-5 h-5" />
            <span>Add Camera</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Cameras</p>
              <p className="text-3xl font-bold">{cameras.length}</p>
              <p className="text-xs text-blue-200 mt-1">
                {activeCameras} active
              </p>
            </div>
            <div className="bg-blue-400 bg-opacity-30 p-3 rounded-full">
              <Camera className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Live Detections</p>
              <p className="text-3xl font-bold">{totalDetections}</p>
              <p className="text-xs text-green-200 mt-1">
                {detectingCameras} cameras detecting
              </p>
            </div>
            <div className="bg-green-400 bg-opacity-30 p-3 rounded-full">
              <Eye className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Object Types</p>
              <p className="text-3xl font-bold">{uniqueObjectTypes}</p>
              <p className="text-xs text-purple-200 mt-1">
                {Object.keys(objectCounts).length} sources
              </p>
            </div>
            <div className="bg-purple-400 bg-opacity-30 p-3 rounded-full">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Active Streams</p>
              <p className="text-3xl font-bold">{activeCameras}</p>
              <p className="text-xs text-orange-200 mt-1">
                {cameras.length - activeCameras} offline
              </p>
            </div>
            <div className="bg-orange-400 bg-opacity-30 p-3 rounded-full">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-r rounded-lg shadow-lg p-6 text-white ${
          isConnected 
            ? 'from-teal-500 to-teal-600' 
            : 'from-red-500 to-red-600'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${
                isConnected ? 'text-teal-100' : 'text-red-100'
              }`}>
                Connection
              </p>
              <p className="text-3xl font-bold">
                {isConnected ? 'LIVE' : 'OFF'}
              </p>
              <p className={`text-xs mt-1 ${
                isConnected ? 'text-teal-200' : 'text-red-200'
              }`}>
                {isConnected ? 'Real-time data' : 'Disconnected'}
              </p>
            </div>
            <div className={`bg-opacity-30 p-3 rounded-full ${
              isConnected ? 'bg-teal-400' : 'bg-red-400'
            }`}>
              {isConnected ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
            </div>
          </div>
        </div>
      </div>

      {/* Camera Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading cameras...</p>
          </div>
        </div>
      ) : cameras.length === 0 ? (
        <div className="text-center py-16">
          <Settings className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No cameras</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first IP camera.
          </p>
          <div className="mt-6">
            <button
              onClick={handleAddCamera}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Camera
            </button>
          </div>
        </div>
      ) : (
        <CameraGrid onShowAnalytics={handleShowAnalytics} />
      )}

      {/* Analytics Dashboard */}
      {cameras.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Object Distribution Chart */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
              Object Distribution
            </h3>
            {chartData && chartData.labels && chartData.labels.length > 0 ? (
              <div style={{ height: '250px' }}>
                <Doughnut data={chartData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom' as const,
                      labels: { boxWidth: 12 }
                    }
                  }
                }} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-500">
                <div className="text-center">
                  <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No objects detected yet</p>
                </div>
              </div>
            )}
          </div>

          {/* Camera Status Overview */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-green-600" />
              Camera Status
            </h3>
            <div className="space-y-3">
              {cameras.length > 0 ? (
                cameras.map((camera, index) => {
                  const hasDetections = objectCounts[camera.id] && 
                    Object.values(objectCounts[camera.id]).some(count => count > 0);
                  const totalObjects = objectCounts[camera.id] 
                    ? Object.values(objectCounts[camera.id]).reduce((sum, count) => sum + count, 0)
                    : 0;
                  
                  return (
                    <div key={camera.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          camera.is_active 
                            ? (hasDetections ? 'bg-green-500 animate-pulse' : 'bg-yellow-500') 
                            : 'bg-red-500'
                        }`}></div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{camera.name}</p>
                          <p className="text-xs text-gray-500">
                            {camera.is_active 
                              ? (hasDetections ? `${totalObjects} objects` : 'No objects')
                              : 'Offline'
                            }
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleShowAnalytics(camera.id)}
                        className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                      >
                        <BarChart3 className="w-3 h-3" />
                        <span>Analytics</span>
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-gray-500 py-4">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No cameras added</p>
                </div>
              )}
            </div>
          </div>

          {/* Real-time Activity Feed */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-purple-600" />
              Real-time Activity
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(detectionResults).length > 0 ? (
                Object.entries(detectionResults)
                  .sort(([, a], [, b]) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .slice(0, 10)
                  .map(([cameraId, result]) => {
                    const camera = cameras.find(c => c.id === cameraId);
                    const timeAgo = new Date(result.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    
                    return (
                      <div key={`${cameraId}-${result.timestamp}`} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">
                              {camera?.name || `Camera ${cameraId}`}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(result.object_counts || {}).map(([object, count]) => (
                                <span key={object} className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                  {object}: {count}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 ml-2">{timeAgo}</span>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                  <p className="text-xs mt-1">Activity will appear when objects are detected</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Camera Modal */}
      <AddCameraModal
        isOpen={isAddCameraModalOpen}
        onClose={() => setIsAddCameraModalOpen(false)}
      />

      {/* Interactive Dashboard */}
      {showInteractiveMode && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="w-6 h-6 text-purple-600" />
                Interactive Object Detection
              </h2>
              <button
                onClick={() => setShowInteractiveMode(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to Dashboard
              </button>
            </div>
            <div className="flex-1">
              {/* <InteractiveDashboard /> */}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Panel */}
      <AnalyticsPanel
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        cameraId={selectedCameraId}
      />

      {/* Chat Assistant */}
      {showChatAssistant && (
        <ChatAssistant
          cameras={cameras}
          selectedCameraId={selectedCameraId || undefined}
          onClose={() => setShowChatAssistant(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;