import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Agent types
export interface Agent {
  id: number;
  name: string;
  region: 'SG' | 'CN';
  apiKey: string;
  status: string;
  lastUsed: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentInput {
  name: string;
  region: 'SG' | 'CN';
  apiKey: string;
}

export interface UpdateAgentInput {
  name?: string;
  region?: 'SG' | 'CN';
  apiKey?: string;
  status?: string;
}

// Test History types
export interface TestHistory {
  id: number;
  agentId: number | null;
  agentName: string;
  testDate: string;
  totalQuestions: number;
  passedCount: number;
  failedCount: number;
  successRate: number;
  durationSeconds: number;
  avgResponseTime: number | null;
  executionMode: 'parallel' | 'sequential' | null;
  rpm: number | null;
  timeoutSeconds: number | null;
  retryCount: number | null;
  jsonData: any;
  createdAt: string;
  agent?: {
    id: number;
    name: string;
    region: string;
  };
}

// API functions

// Agents
export const agentsApi = {
  getAll: () => api.get<Agent[]>('/agents').then((res) => res.data),
  getOne: (id: number) => api.get<Agent>(`/agents/${id}`).then((res) => res.data),
  create: (data: CreateAgentInput) => api.post<Agent>('/agents', data).then((res) => res.data),
  update: (id: number, data: UpdateAgentInput) =>
    api.put<Agent>(`/agents/${id}`, data).then((res) => res.data),
  delete: (id: number) => api.delete(`/agents/${id}`).then((res) => res.data),
  test: (id: number) => api.post(`/agents/${id}/test`).then((res) => res.data),
};

// Tests
export const testsApi = {
  create: (formData: FormData) =>
    api.post('/tests', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((res) => res.data),
  getStatus: (id: string) => api.get(`/tests/${id}`).then((res) => res.data),
};

// History
export const historyApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    agentId?: number;
    minSuccessRate?: number;
    maxSuccessRate?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => api.get<{ data: TestHistory[]; pagination: any }>('/history', { params }).then((res) => res.data),
  getOne: (id: number) => api.get<TestHistory>(`/history/${id}`).then((res) => res.data),
  delete: (id: number) => api.delete(`/history/${id}`).then((res) => res.data),
  download: (id: number, format: 'excel' | 'markdown' | 'json') => {
    return api.get(`/history/${id}/download/${format}`, {
      responseType: 'blob',
    }).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const extension = format === 'markdown' ? 'md' : format === 'excel' ? 'xlsx' : 'json';
      link.setAttribute('download', `test_report_${id}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  },
};

