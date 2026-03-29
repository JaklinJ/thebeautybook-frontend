import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';


// Your Render backend URL - replace with your actual Render service URL
const API_BASE_URL = 'https://beauty-book-backend.onrender.com/api';

console.log('🌐 API Base URL:', API_BASE_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
      console.error('🌐 Network Error: Could not connect to backend');
    }
    return Promise.reject(error);
  }
);

export default api;
