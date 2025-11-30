import React, { useState, useEffect } from 'react';
import { X, BarChart3, TrendingUp, Eye, Calendar, Activity, AlertCircle, Clock, Zap } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';
import { useCamera } from '../contexts/CameraContext';
import { cameraAPI } from '../services/api';
import { AnalyticsData } from '../types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface AnalyticsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  cameraId: string | null;
}

interface HourlyAnalytics {
  hour: string;
  object_counts: { [key: string]: number };
  total: number;
}

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ isOpen, onClose, cameraId }) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyAnalytics[]>([]);
  const [timeRange, setTimeRange] = useState(24); // hours
  const [isLoading, setIsLoading] = useState(false);

  const { cameras, objectCounts } = useCamera();

  const currentCamera = cameraId ? cameras.find(c => c.id === cameraId) : null;
  const currentObjectCounts = cameraId ? objectCounts[cameraId] || {} : {};

  useEffect(() => {
    if (isOpen && cameraId) {
      loadAnalyticsData();
    }
  }, [isOpen, cameraId, timeRange]);

  const loadAnalyticsData = async () => {
    if (!cameraId) return;

    try {
      setIsLoading(true);
      console.log(`Loading analytics for camera ${cameraId} for ${timeRange} hours`);
      
      // Fetch regular analytics data
      const data = await cameraAPI.getAnalytics(cameraId, timeRange);
      console.log('Analytics data received:', data);
      setAnalyticsData(data || []);
      
      // Fetch hourly analytics data
      try {
        const hourlyData = await cameraAPI.getHourlyAnalytics(cameraId, timeRange);
        console.log('Hourly analytics data received:', hourlyData);
        setHourlyData(hourlyData || []);
      } catch (hourlyError) {
        console.warn('Failed to fetch hourly analytics:', hourlyError);
        setHourlyData([]);
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      setAnalyticsData([]);
      setHourlyData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate key metrics from real backend data
  console.log('Processing analytics data:', analyticsData.length, 'records');
  console.log('Processing hourly data:', hourlyData.length, 'records');
  
  const totalDetections = analyticsData.reduce((sum, item) => {
    if (item && item.object_counts && typeof item.object_counts === 'object') {
      const itemTotal = Object.values(item.object_counts).reduce((s, c) => s + (Number(c) || 0), 0);
      return sum + itemTotal;
    }
    return sum;
  }, 0);

  const uniqueObjectTypes = new Set(
    analyticsData
      .filter(item => item && item.object_counts && typeof item.object_counts === 'object')
      .flatMap(item => Object.keys(item.object_counts || {}))
      .filter(key => key && key.length > 0)
  ).size;

  const peakDetectionTime = analyticsData.length > 0 ? analyticsData.reduce((max, item) => {
    if (item && item.object_counts && typeof item.object_counts === 'object') {
      const itemTotal = Object.values(item.object_counts).reduce((s, c) => s + (Number(c) || 0), 0);
      const maxTotal = max && max.object_counts ? Object.values(max.object_counts).reduce((s, c) => s + (Number(c) || 0), 0) : 0;
      return itemTotal > maxTotal ? item : max;
    }
    return max;
  }, analyticsData[0]) : null;

  const averageDetectionsPerHour = totalDetections > 0 && timeRange > 0 ? (totalDetections / timeRange).toFixed(1) : '0';
  
  // Current live detections from WebSocket
  const currentLiveTotal = Object.values(currentObjectCounts).reduce((sum, count) => sum + (Number(count) || 0), 0);

  // Chart data functions using real backend data
  const getObjectTypesData = () => {
    const objectTypes: { [key: string]: number } = {};

    // Process real analytics data from backend
    analyticsData.forEach(item => {
      if (item && item.object_counts && typeof item.object_counts === 'object') {
        Object.entries(item.object_counts).forEach(([type, count]) => {
          if (type && typeof type === 'string' && type.length > 0) {
            objectTypes[type] = (objectTypes[type] || 0) + (Number(count) || 0);
          }
        });
      }
    });

    console.log('Processed object types from backend data:', objectTypes);

    const labels = Object.keys(objectTypes).filter(key => objectTypes[key] > 0);
    const data = labels.map(label => objectTypes[label]);
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];

    if (labels.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          label: 'No Detections Yet',
          data: [1],
          backgroundColor: ['#E5E7EB'],
          borderColor: ['#9CA3AF'],
          borderWidth: 1,
        }],
      };
    }

    return {
      labels,
      datasets: [{
        label: 'Detection Count',
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length),
        borderWidth: 1,
      }],
    };
  };

  const getTimelineData = () => {
    console.log('Processing timeline data from backend:', analyticsData.length, 'records');
    
    if (!analyticsData || analyticsData.length === 0) {
      return {
        labels: ['No Data Available'],
        datasets: [{
          label: 'No Analytics Data Yet',
          data: [0],
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
        }],
      };
    }

    const timeline: { [key: string]: number } = {};
    const timePoints: string[] = [];

    analyticsData.forEach(item => {
      if (item && item.timestamp && item.object_counts && typeof item.object_counts === 'object') {
        try {
          const date = new Date(item.timestamp);
          if (!isNaN(date.getTime())) {
            const timeLabel = timeRange <= 6 
              ? `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
              : `${date.getHours().toString().padStart(2, '0')}:00`;
            
            const totalCount = Object.values(item.object_counts).reduce((sum, count) => sum + (Number(count) || 0), 0);
            timeline[timeLabel] = (timeline[timeLabel] || 0) + totalCount;
            
            if (!timePoints.includes(timeLabel)) {
              timePoints.push(timeLabel);
            }
          }
        } catch (error) {
          console.warn('Invalid timestamp:', item.timestamp, error);
        }
      }
    });

    console.log('Processed timeline data:', timeline);

    const labels = timePoints.sort((a, b) => {
      const [aHourStr, aMinStr = '00'] = a.split(':');
      const [bHourStr, bMinStr = '00'] = b.split(':');
      
      const aHour = parseInt(aHourStr, 10) || 0;
      const aMin = parseInt(aMinStr, 10) || 0;
      const bHour = parseInt(bHourStr, 10) || 0;
      const bMin = parseInt(bMinStr, 10) || 0;
      
      return (aHour * 60 + aMin) - (bHour * 60 + bMin);
    });
    
    const data = labels.map(label => timeline[label] || 0);

    if (labels.length === 0 || data.every(d => d === 0)) {
      return {
        labels: ['No Activity'],
        datasets: [{
          label: 'No Detections in Time Range',
          data: [0],
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
        }],
      };
    }

    return {
      labels,
      datasets: [{
        label: 'Objects Detected',
        data,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      }],
    };
  };

  const getCurrentStatsData = () => {
    console.log('Current object counts from WebSocket:', currentObjectCounts);
    
    if (!currentObjectCounts || Object.keys(currentObjectCounts).length === 0) {
      return {
        labels: ['No Live Detections'],
        datasets: [{
          data: [1],
          backgroundColor: ['#E5E7EB'],
          borderColor: ['#9CA3AF'],
          borderWidth: 2,
        }],
      };
    }

    const validEntries = Object.entries(currentObjectCounts).filter(([_, count]) => (Number(count) || 0) > 0);
    const labels = validEntries.map(([type, _]) => type);
    const data = validEntries.map(([_, count]) => Number(count) || 0);
    
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];

    if (labels.length === 0) {
      return {
        labels: ['No Live Detections'],
        datasets: [{
          data: [1],
          backgroundColor: ['#E5E7EB'],
          borderColor: ['#9CA3AF'],
          borderWidth: 2,
        }],
      };
    }

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length),
        borderWidth: 2,
      }],
    };
  };

  const getHourlyTrendData = () => {
    console.log('Generating hourly trend from real backend data:', hourlyData);
    
    if (!hourlyData || hourlyData.length === 0) {
      // Fallback to processing analytics data if hourly data not available
      const hourlyFallback: { [key: number]: number } = {};
      
      analyticsData.forEach(item => {
        if (item && item.timestamp && item.object_counts) {
          try {
            const date = new Date(item.timestamp);
            if (!isNaN(date.getTime())) {
              const hour = date.getHours();
              const totalCount = Object.values(item.object_counts).reduce((sum, count) => sum + (Number(count) || 0), 0);
              hourlyFallback[hour] = (hourlyFallback[hour] || 0) + totalCount;
            }
          } catch (error) {
            console.warn('Invalid timestamp for hourly trend:', item.timestamp);
          }
        }
      });
      
      const labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
      const data = labels.map((_, index) => hourlyFallback[index] || 0);
      
      return {
        labels,
        datasets: [{
          label: 'Detections by Hour',
          data,
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
          borderColor: '#22C55E',
          borderWidth: 2,
        }],
      };
    }
    
    // Use real hourly analytics data from backend
    const hourlyMap: { [key: string]: number } = {};
    hourlyData.forEach(item => {
      if (item && item.hour && typeof item.total === 'number') {
        try {
          const date = new Date(item.hour);
          if (!isNaN(date.getTime())) {
            const hourKey = `${date.getHours().toString().padStart(2, '0')}:00`;
            hourlyMap[hourKey] = (hourlyMap[hourKey] || 0) + item.total;
          }
        } catch (error) {
          console.warn('Invalid hour format in hourly data:', item.hour);
        }
      }
    });
    
    const labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    const data = labels.map(label => hourlyMap[label] || 0);
    
    return {
      labels,
      datasets: [{
        label: 'Detections by Hour',
        data,
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        borderColor: '#22C55E',
        borderWidth: 2,
      }],
    };
  };

  const getTopObjectsData = () => {
    const objectTypes: { [key: string]: number } = {};

    analyticsData.forEach(item => {
      if (item && item.object_counts && typeof item.object_counts === 'object') {
        Object.entries(item.object_counts).forEach(([type, count]) => {
          if (type && typeof type === 'string' && type.length > 0) {
            objectTypes[type] = (objectTypes[type] || 0) + (Number(count) || 0);
          }
        });
      }
    });

    console.log('Top objects data from backend:', objectTypes);

    const sorted = Object.entries(objectTypes)
      .filter(([_, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    if (sorted.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          label: 'No Objects Detected Yet',
          data: [1],
          backgroundColor: ['#E5E7EB'],
          borderColor: ['#9CA3AF'],
          borderWidth: 1,
        }],
      };
    }

    const labels = sorted.map(([type]) => type);
    const data = sorted.map(([, count]) => count);

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];

    return {
      labels,
      datasets: [{
        label: 'Top 5 Objects',
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length),
        borderWidth: 1,
      }],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
    },
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Camera Analytics Dashboard</h2>
                {currentCamera && (
                  <p className="text-sm text-gray-500">{currentCamera.name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Last Hour</option>
                <option value={6}>Last 6 Hours</option>
                <option value={24}>Last 24 Hours</option>
                <option value={168}>Last Week</option>
              </select>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading analytics...</p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Total Detections</p>
                    <p className="text-3xl font-bold">{totalDetections}</p>
                  </div>
                  <Eye className="w-8 h-8 text-blue-200 opacity-50" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Unique Objects</p>
                    <p className="text-3xl font-bold">{uniqueObjectTypes}</p>
                  </div>
                  <Activity className="w-8 h-8 text-green-200 opacity-50" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Current Live</p>
                    <p className="text-3xl font-bold">
                      {currentLiveTotal}
                    </p>
                  </div>
                  <Zap className="w-8 h-8 text-purple-200 opacity-50" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm">Avg Per Hour</p>
                    <p className="text-3xl font-bold">{averageDetectionsPerHour}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-orange-200 opacity-50" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm">Time Range</p>
                    <p className="text-3xl font-bold">{timeRange}h</p>
                  </div>
                  <Clock className="w-8 h-8 text-red-200 opacity-50" />
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Detection by Object Type */}
              <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                  Detection by Object Type
                </h3>
                <div style={{ height: '300px' }}>
                  <Bar data={getObjectTypesData()} options={chartOptions} />
                </div>
              </div>

              {/* Detection Timeline */}
              <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                  Detection Timeline
                </h3>
                <div style={{ height: '300px' }}>
                  <Line data={getTimelineData()} options={chartOptions} />
                </div>
              </div>

              {/* Current Distribution */}
              <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Eye className="w-5 h-5 mr-2 text-purple-600" />
                  Current Distribution
                </h3>
                <div style={{ height: '300px' }}>
                  <Doughnut data={getCurrentStatsData()} options={doughnutOptions} />
                </div>
              </div>

              {/* Hourly Trend */}
              <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-orange-600" />
                  Hourly Activity Pattern
                </h3>
                <div style={{ height: '300px' }}>
                  <Bar data={getHourlyTrendData()} options={chartOptions} />
                </div>
              </div>

              {/* Top Objects */}
              <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-red-600" />
                  Top 5 Detected Objects
                </h3>
                <div style={{ height: '300px' }}>
                  <Pie data={getTopObjectsData()} options={doughnutOptions} />
                </div>
              </div>

              {/* Detection Statistics Table */}
              <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
                    Recent Detection Statistics
                  </div>
                  <div className="text-sm text-gray-500">
                    {analyticsData.length > 0 ? `${analyticsData.length} records` : 'No data'}
                  </div>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Detection Time</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Objects Detected</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.length > 0 ? (
                        (() => {
                          // First, filter valid items
                          const validItems = analyticsData.filter(item => 
                            item && item.object_counts && typeof item.object_counts === 'object' &&
                            Object.values(item.object_counts).some(count => (Number(count) || 0) > 0)
                          );

                          // Group by minute and keep only the latest record from each minute
                          const minuteGroups = new Map();
                          
                          validItems.forEach(item => {
                            try {
                              const date = new Date(item.timestamp);
                              if (!isNaN(date.getTime())) {
                                // Create minute key (YYYY-MM-DD HH:MM)
                                const minuteKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                                
                                // Keep only the latest record for this minute
                                const existing = minuteGroups.get(minuteKey);
                                if (!existing || date.getTime() > new Date(existing.timestamp).getTime()) {
                                  minuteGroups.set(minuteKey, item);
                                }
                              }
                            } catch (error) {
                              console.warn('Invalid timestamp:', item.timestamp);
                            }
                          });

                          // Convert to array, sort by timestamp descending, and take top 10
                          return Array.from(minuteGroups.values())
                            .sort((a, b) => {
                              try {
                                const dateA = new Date(a.timestamp).getTime();
                                const dateB = new Date(b.timestamp).getTime();
                                return dateB - dateA; // Newest first
                              } catch {
                                return 0;
                              }
                            })
                            .slice(0, 10)
                            .map((item, index) => {
                              const totalCount: number = Object.values(item.object_counts as { [key: string]: number }).reduce((sum: number, count: number) => sum + (Number(count) || 0), 0);
                              return (
                                <tr key={`${item.timestamp}-${index}`} className="border-b hover:bg-gray-50">
                                  <td className="py-3 px-4">
                                    {(() => {
                                      try {
                                        const date = new Date(item.timestamp);
                                        return isNaN(date.getTime()) 
                                          ? 'Invalid' 
                                          : date.toLocaleString(); // Show both date and time for clarity
                                      } catch {
                                        return 'Invalid';
                                      }
                                    })()}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex flex-wrap gap-1">
                                      {Object.entries(item.object_counts)
                                        .filter(([, count]) => (Number(count) || 0) > 0)
                                        .map(([type, count]) => (
                                          <span
                                            key={type}
                                            className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-medium"
                                          >
                                            {type}: {Number(count) || 0}
                                          </span>
                                        ))
                                      }
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-right font-bold text-gray-900">{totalCount}</td>
                                </tr>
                              );
                            });
                        })()
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-gray-500">
                            No detection data available yet. Start camera detection to see statistics.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPanel;
