import { HealthResponse, ReadinessResponse, SystemInfoResponse } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiNetworkError extends Error {
  constructor(message = 'Network error: Backend server is unreachable.') {
    super(message);
    this.name = 'ApiNetworkError';
  }
}

async function request<T>(endpoint: string, timeoutMs = 6000): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    // Both 200 and 503 from /ready are valid structured JSON payloads for readiness
    if (!response.ok && response.status !== 503) {
      throw new ApiError(
        response.status,
        data?.detail || data?.message || `Request failed with status ${response.status}`,
        data
      );
    }

    return data as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) {
      throw err;
    }

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiNetworkError(`Request timed out after ${timeoutMs}ms.`);
    }

    if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
      throw new ApiNetworkError('Backend API server is unreachable. Check if FastAPI is running.');
    }

    throw new ApiNetworkError(err instanceof Error ? err.message : 'Unknown communication error.');
  }
}

export const apiClient = {
  getBaseUrl: () => API_BASE_URL,
  getHealth: () => request<HealthResponse>('/health'),
  getReadiness: () => request<ReadinessResponse>('/ready'),
  getSystemInfo: () => request<SystemInfoResponse>('/info'),
};
