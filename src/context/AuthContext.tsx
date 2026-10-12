import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, NotificationItem } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  notifications: NotificationItem[];
  unreadNotifsCount: number;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: any) => Promise<any>;
  verifyEmail: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  switchAccountForDemo: (role: 'super_admin' | 'admin' | 'officer_hostel' | 'officer_it' | 'student') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const refreshUser = async () => {
    const token = localStorage.getItem('dmi_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.getMe();
      setUser(me);
    } catch (err) {
      console.warn('Failed to restore session:', err);
      localStorage.removeItem('dmi_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshNotifications = async () => {
    if (!user) return;
    try {
      const list = await api.getNotifications();
      setNotifications(list);
    } catch (err) {
      // Quiet fail for notifications
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  useEffect(() => {
    if (user) {
      refreshNotifications();
      const interval = setInterval(refreshNotifications, 20000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [user]);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    localStorage.setItem('dmi_token', res.token);
    setUser(res.user);
  };

  const register = async (payload: any) => {
    return await api.register(payload);
  };

  const verifyEmail = async (token: string) => {
    const res = await api.verifyEmail(token);
    localStorage.setItem('dmi_token', res.token);
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // Ignore
    }
    localStorage.removeItem('dmi_token');
    setUser(null);
  };

  const markNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (e) {
      // Ignore
    }
  };

  const switchAccountForDemo = async (
    role: 'super_admin' | 'admin' | 'officer_hostel' | 'officer_it' | 'student'
  ) => {
    setLoading(true);
    let email = '';
    let password = '';

    switch (role) {
      case 'super_admin':
        email = 'superadmin@dmice.ac.in';
        password = 'DmiAdmin@2026';
        break;
      case 'admin':
        email = 'admin@dmice.ac.in';
        password = 'DmiAdmin@2026';
        break;
      case 'officer_hostel':
        email = 'officer.hostel@dmice.ac.in';
        password = 'DmiOfficer@2026';
        break;
      case 'officer_it':
        email = 'officer.it@dmice.ac.in';
        password = 'DmiOfficer@2026';
        break;
      case 'student':
        email = 'student@dmice.ac.in';
        password = 'DmiStudent@2026';
        break;
    }

    try {
      await login(email, password);
    } finally {
      setLoading(false);
    }
  };

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        notifications,
        unreadNotifsCount,
        login,
        register,
        verifyEmail,
        logout,
        refreshUser,
        refreshNotifications,
        markNotificationRead,
        switchAccountForDemo
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
