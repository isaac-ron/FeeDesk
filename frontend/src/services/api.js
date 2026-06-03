import axios from 'axios';

// Support dynamic API URL:
// 1. Environment variable set at build time: VITE_API_URL
// 2. Runtime window config (injected by nginx)
// 3. Relative to current host (default for production)
const RAW_API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.__API_URL__) ||
  `${window.location.protocol}//${window.location.host}/api`;

// Every backend route is mounted under `/api`. Normalize the configured base so
// the app works whether VITE_API_URL is set as "https://host/api" or just the
// origin "https://host" — strip trailing slashes and guarantee a single `/api`
// suffix. Prevents the "Not Found - /auth/login" 404 from a missing prefix.
const API_URL = (() => {
  const base = String(RAW_API_URL).replace(/\/+$/, '');
  return /\/api$/i.test(base) ? base : `${base}/api`;
})();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // send httpOnly cookies (refresh token)
});

// Add access token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Handle 401 responses: attempt token refresh, then retry the original request.
// If refresh fails, redirect to login.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401, and not on the refresh endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        // Queue this request until the ongoing refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newToken = data.token;
        localStorage.setItem('token', newToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
