import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setAccessToken, setOnUnauthorized } from '../services/api';

export interface UserProfile {
  id: string;
  nik: string;
  fullName: string;
  email: string;
  role: string;
  permissions: string[];
  isTempPassword?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  needsPasswordChange: boolean;
  login: (identifier: string, password: string) => Promise<UserProfile>;
  register: (nik: string, fullName: string, email: string) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const needsPasswordChange = !!user?.isTempPassword;

  // Initialize session via refresh endpoint if cookie exists
  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
      setAccessTokenState(null);
      setAccessToken(null);
    });

    const initAuth = async () => {
      try {
        const res = await api.post('/api/v1/auth/refresh', {}, { skipAuth: true });
        if (res?.accessToken && res?.user) {
          setAccessToken(res.accessToken);
          setAccessTokenState(res.accessToken);
          setUser(res.user);
        }
      } catch (err) {
        // No active session cookie, ignore
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (identifier: string, password: string): Promise<UserProfile> => {
    const res = await api.post('/api/v1/auth/login', { identifier, password }, { skipAuth: true });
    setAccessToken(res.accessToken);
    setAccessTokenState(res.accessToken);
    setUser(res.user);
    return res.user;
  };

  const register = async (nik: string, fullName: string, email: string) => {
    const res = await api.post('/api/v1/auth/register', { nik, fullName, email }, { skipAuth: true });
    return res;
  };

  const logout = async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } catch {
      // Ignore network failure on logout
    } finally {
      setAccessToken(null);
      setAccessTokenState(null);
      setUser(null);
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    await api.post('/api/v1/auth/change-password', { oldPassword, newPassword });
    if (user) {
      setUser({ ...user, isTempPassword: false });
    }
  };

  const forgotPassword = async (email: string) => {
    await api.post('/api/v1/auth/forgot-password', { email }, { skipAuth: true });
  };

  const resetPassword = async (token: string, newPassword: string) => {
    await api.post('/api/v1/auth/reset-password', { token, newPassword }, { skipAuth: true });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        needsPasswordChange,
        login,
        register,
        logout,
        changePassword,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
