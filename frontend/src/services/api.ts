import axios from 'axios';
import { Camera, AddCameraForm, AnalyticsData, ChatMessage, ChatResponse } from '../types';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { auth } from '../config/firebase';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increase timeout to 30 seconds
});

// Request interceptor for authentication
api.interceptors.request.use(
  async (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    
    // Add authentication token to requests
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized errors
      console.error('Authentication error - redirecting to login');
      // You could dispatch a logout action here or redirect to login
    }
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const cameraAPI = {
  // Get all cameras
  getCameras: async (): Promise<Camera[]> => {
    const response = await api.get('/cameras');
    return response.data;
  },

  // Add a new camera
  addCamera: async (camera: AddCameraForm): Promise<Camera> => {
    const response = await api.post('/cameras', camera);
    return response.data;
  },

  // Delete a camera
  deleteCamera: async (cameraId: string): Promise<void> => {
    await api.delete(`/cameras/${cameraId}`);
  },

  // Start camera streaming
  startCamera: async (cameraId: string): Promise<void> => {
    await api.post(`/cameras/${cameraId}/start`);
  },

  // Stop camera streaming
  stopCamera: async (cameraId: string): Promise<void> => {
    await api.post(`/cameras/${cameraId}/stop`);
  },

  // Toggle object detection
  toggleDetection: async (cameraId: string, enabled: boolean): Promise<void> => {
    await api.post(`/cameras/${cameraId}/detection/${enabled}`);
  },

  // Get analytics for a camera
  getAnalytics: async (cameraId: string, hours: number = 24): Promise<AnalyticsData[]> => {
    const response = await api.get(`/analytics/${cameraId}?hours=${hours}`);
    return response.data;
  },

  // Get hourly analytics for a camera
  getHourlyAnalytics: async (cameraId: string, hours: number = 24): Promise<any[]> => {
    const response = await api.get(`/analytics/${cameraId}/hourly?hours=${hours}`);
    return response.data;
  },

  // Health check
  healthCheck: async (): Promise<any> => {
    const response = await api.get('/health');
    return response.data;
  },

  // Chat with AI assistant
  chatWithAssistant: async (message: ChatMessage): Promise<ChatResponse> => {
    const response = await api.post('/chat', message);
    return response.data;
  }
};

export const historyApi = {

  fetchChatHistory: async (cameraId: string) => {
  try {
    const response = await api.get(`/chat/history/${cameraId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching chat history:', error);
    throw error;
  }
},

clearChatHistory : async (cameraId: string) => {
  try {
    const response = await api.delete(`/chat/history/${cameraId}`);
    return response.data;
  } catch (error) {
    console.error('Error clearing chat history:', error);
    throw error;
  }
}
  
}




export default api;