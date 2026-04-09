import axios from 'axios';

// Support dynamic API URL:
// 1. Environment variable set at build time: VITE_API_URL
// 2. Runtime window config (injected by nginx)
// 3. Relative to current host (default for production)
const API_URL = 
  import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.__API_URL__) ||
  `${window.location.protocol}//${window.location.host}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
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
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;