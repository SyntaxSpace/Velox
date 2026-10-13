import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  shopId?: string | null;
  firstLogin?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, refreshToken?: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  setAuth: (user, token, refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('velox_token', token);
      if (refreshToken) {
        localStorage.setItem('velox_refresh_token', refreshToken);
      }
    }
    set((state) => ({
      user,
      token,
      refreshToken: refreshToken || state.refreshToken,
      isAuthenticated: true,
    }));
  },
  clearAuth: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('velox_token');
      localStorage.removeItem('velox_refresh_token');
    }
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
  },
}));
