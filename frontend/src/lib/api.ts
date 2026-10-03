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
