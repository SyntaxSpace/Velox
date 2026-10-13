import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor to attach auth or guest token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('velox_token');
    const guestSession = localStorage.getItem('velox_guest_session');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (guestSession) {
      config.headers.Authorization = `Bearer ${guestSession}`;
      config.headers['x-guest-session'] = guestSession;
    }
  }
  return config;
});

// Response interceptor to automatically refresh expired access tokens
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401 for requests other than auth endpoints and not already retried
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (typeof window === 'undefined') {
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem('velox_refresh_token');
      if (!refreshToken) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
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
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = res.data?.data || {};

        if (!accessToken) {
          throw new Error('No access token returned from refresh endpoint');
        }

        localStorage.setItem('velox_token', accessToken);
        if (newRefreshToken) {
          localStorage.setItem('velox_refresh_token', newRefreshToken);
        }

        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('velox_token');
        localStorage.removeItem('velox_refresh_token');

        // Gracefully redirect to login if on a protected route
        if (
          window.location.pathname.startsWith('/shop-owner') &&
          !window.location.pathname.includes('/login')
        ) {
          window.location.href = '/shop-owner/login';
        } else if (
          window.location.pathname.startsWith('/partner') &&
          !window.location.pathname.includes('/login')
        ) {
          window.location.href = '/partner/login';
        }

        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
