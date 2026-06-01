import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data: { email: string; name: string; password: string }) =>
    api.post('/api/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
};

// Documents API
export const documentsAPI = {
  parseResume: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/documents/parse-resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  parseJobDescription: (data: { text?: string; file?: File }) => {
    if (data.file) {
      const formData = new FormData();
      formData.append('file', data.file);
      return api.post('/api/documents/parse-job-description', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post('/api/documents/parse-job-description', { text: data.text });
  },
};

// Sessions API
export const sessionsAPI = {
  create: (data: any) => api.post('/api/sessions/create', data),
  get: (sessionId: string) => api.get(`/api/sessions/${sessionId}`),
  terminate: (sessionId: string, reason: string) =>
    api.post(`/api/sessions/${sessionId}/terminate`, { reason }),
  getCurrentQuestion: (sessionId: string) =>
    api.get(`/api/sessions/${sessionId}/current-question`),
  submitResponse: (sessionId: string, response: any) =>
    api.post(`/api/sessions/${sessionId}/submit-response`, { response }),
};

// Reports API
export const reportsAPI = {
  getReport: (sessionId: string) => api.get(`/api/sessions/${sessionId}/report`),
  getTrendReport: (candidateId: string) =>
    api.get(`/api/candidates/${candidateId}/trend-report`),
  getSessions: (candidateId: string) =>
    api.get(`/api/candidates/${candidateId}/sessions`),
};
