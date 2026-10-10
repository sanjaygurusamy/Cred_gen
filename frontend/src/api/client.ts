import {
  HealthResponse,
  ReadinessResponse,
  SystemInfoResponse,
  Organization,
  Campus,
  CampusBlock,
  BlockListResponse,
  CategoryStat,
  BlockCreatePayload,
  BlockUpdatePayload,
} from '../types';

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

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, timeoutMs = 7000 } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    };

    if (body !== undefined && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    // 200 or 503 from /ready are valid structured payloads
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
  
  // Phase 1 System Diagnostics
  getHealth: () => request<HealthResponse>('/health'),
  getReadiness: () => request<ReadinessResponse>('/ready'),
  getSystemInfo: () => request<SystemInfoResponse>('/info'),

  // Phase 2 Organization & Campus Management
  getOrganizations: () => request<Organization[]>('/v1/organizations'),
  
  getCampuses: (organizationId?: string) =>
    request<Campus[]>('/v1/campuses', { params: { organization_id: organizationId } }),
    
  getCampusById: (campusId: string) =>
    request<Campus>(`/v1/campuses/${campusId}`),

  seedInventory: () =>
    request<{
      status: string;
      organization: { id: string; name: string; code: string };
      campus: { id: string; name: string; code: string; location: string };
      blocks_specification_count: number;
      blocks_created: number;
      blocks_existing: number;
      total_campus_blocks: number;
      category_counts: Record<string, number>;
    }>('/v1/campuses/seed', { method: 'POST' }),

  // Phase 2 Blocks & Facility Inventory
  getBlocks: (params?: { campus_id?: string; category?: string; search?: string; is_active?: boolean }) =>
    request<BlockListResponse>('/v1/blocks', { params }),

  getBlockById: (blockId: string) =>
    request<CampusBlock>(`/v1/blocks/${blockId}`),

  createBlock: (payload: BlockCreatePayload) =>
    request<CampusBlock>('/v1/blocks', { method: 'POST', body: payload }),

  updateBlock: (blockId: string, payload: BlockUpdatePayload) =>
    request<CampusBlock>(`/v1/blocks/${blockId}`, { method: 'PUT', body: payload }),

  deleteBlock: (blockId: string) =>
    request<{ message: string }>(`/v1/blocks/${blockId}`, { method: 'DELETE' }),

  getBlockCategories: (campusId?: string) =>
    request<CategoryStat[]>('/v1/blocks/categories', { params: { campus_id: campusId } }),
};
