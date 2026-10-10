import { SystemInfo } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new ApiError(response.status, errorBody || response.statusText);
  }

  return response.json();
}

export const apiClient = {
  getSystemInfo: (): Promise<SystemInfo> => request<SystemInfo>('/info'),
  checkHealth: (): Promise<{ status: string }> => request<{ status: string }>('/health'),
};
