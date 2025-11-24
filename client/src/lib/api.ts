import axios from 'axios';

const API_BASE_URL = typeof window !== 'undefined' && import.meta.env?.VITE_API_URL 
  ? import.meta.env.VITE_API_URL 
  : '/api';

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
  modelName?: string;
  region: 'SG' | 'CN';
  apiKey: string;
  status: string;
  lastUsed: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentInput {
  name: string;
  modelName?: string;
  region: 'SG' | 'CN';
  apiKey: string;
}

export interface UpdateAgentInput {
  name?: string;
  modelName?: string;
  region?: 'SG' | 'CN';
  apiKey?: string;
  status?: string;
}

// Test History types
export interface TestHistory {
  id: number;
  agentId: number | null;
  agentName: string;
  modelName?: string;
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
    modelName?: string;
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
  getMultiple: (ids: number[]) => 
    Promise.all(ids.map(id => api.get<TestHistory>(`/history/${id}`).then((res) => res.data))),
  delete: (id: number) => api.delete(`/history/${id}`).then((res) => res.data),
  download: (id: number, format: 'excel' | 'markdown' | 'json') => {
    const url = `/api/download?id=${id}&format=${format}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `test_report_${id}.${format === 'markdown' ? 'md' : format === 'excel' ? 'xlsx' : 'json'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};

// Conversations
export interface Conversation {
  conversation_id: string;
  user_id: string;
  recent_chat_time: number;
  subject: string;
  conversation_type: string;
  message_count: number;
  cost_credit: number;
  bot_id: string;
}

export interface ConversationListResponse {
  list: Conversation[];
  total: number;
}

export interface Message {
  message_id: string;
  role: string;
  content?: string;
  text?: string;
  type?: string;
  created_at?: number;
  quality?: 'UNRESOLVED' | 'PARTIALLY_RESOLVED' | 'FULLY_RESOLVED'; // Quality tag if available
}

export interface MessagesResponse {
  list: Message[];
  total: number;
}

export const conversationsApi = {
  getList: (params: {
    agentId: number;
    page?: number;
    pageSize?: number;
    conversationType?: string;
    userId?: string;
    startTime?: number;
    endTime?: number;
  }) => api.get<ConversationListResponse>('/conversations', { params }).then((res) => res.data),
  getMessages: (data: {
    agentId: number;
    conversationId: string;
    page?: number;
    pageSize?: number;
  }) => api.post<MessagesResponse>('/conversations', data).then((res) => res.data),
};

// Quality Check
export interface QualityScores {
  UNRESOLVED: number;
  PARTIALLY_RESOLVED: number;
  FULLY_RESOLVED: number;
}

export interface QualityCheckResponse {
  success: boolean;
  scores: QualityScores;
  reason?: string;
  userIntention?: string;
  rawResult?: string;
}

export interface QualitySubmitResponse {
  success: boolean;
  affectCount: number;
}

export const qualityApi = {
  check: (data: {
    agentId: number;
    qualityAgentId: number;
    messages: Message[];
  }) => api.post<QualityCheckResponse>('/quality', {
    action: 'check',
    ...data
  }).then((res) => res.data),
  submit: (data: {
    agentId: number;
    answerId: string;
    quality: 'UNRESOLVED' | 'PARTIALLY_RESOLVED' | 'FULLY_RESOLVED';
  }) => api.post<QualitySubmitResponse>('/quality', {
    action: 'submit',
    ...data
  }).then((res) => res.data),
};

