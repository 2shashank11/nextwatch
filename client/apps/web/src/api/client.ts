import axios from 'axios';

// Ensure this matches the backend port
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  auth: {
    register: (data: any) => apiClient.post('/auth/register', data).then(r => r.data),
    login: (credentials: any) => apiClient.post('/auth/login', credentials).then(r => r.data),
    me: () => apiClient.get('/auth/me').then(r => r.data),
  },
  reports: {
    list: async (params?: any) => {
      const res = await apiClient.get('/reports', { params });
      return res.data;
    },
    get: async (id: string) => {
      const res = await apiClient.get(`/reports/${id}`);
      return res.data;
    },
    create: async (data: any) => {
      const res = await apiClient.post('/reports', data);
      return res.data;
    },
    vote: async (id: string, voteType: 'verified' | 'not_verified') => {
      const res = await apiClient.post(`/votes/${id}/vote`, { voteType });
      return res.data;
    }
  },
  users: {
    get: async (id: string) => {
      const res = await apiClient.get(`/users/${id}`);
      return res.data;
    },
    updatePreferences: async (id: string, data: { wantsDailyDigest: boolean }) => {
      const res = await apiClient.patch(`/users/${id}/preferences`, data);
      return res.data;
    }
  },
  digests: {
    list: async (params?: { zone?: string; limit?: number; offset?: number }) => {
      const res = await apiClient.get('/digests', { params });
      return res.data;
    }
  },
  circles: {
    search: async (q: string) => {
      const res = await apiClient.get('/circles/search', { params: { q } });
      return res.data;
    },
    updateMembers: async (safeCircleIds: string[]) => {
      const res = await apiClient.patch('/circles/members', { safeCircleIds });
      return res.data;
    },
    setStatus: async (data: { status: 'SAFE' | 'ALERT' | 'NEED_HELP', message?: string }) => {
      const res = await apiClient.post('/circles/status', data);
      return res.data;
    },
    getFeed: async () => {
      const res = await apiClient.get('/circles/feed');
      return res.data;
    }
  },
  stats: {
    get: async (params: { zone?: string; city?: string }) => {
      const res = await apiClient.get('/stats', { params });
      return res.data;
    }
  }
};
