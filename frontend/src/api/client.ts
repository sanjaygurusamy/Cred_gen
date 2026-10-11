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
  ActivityDefinition,
  BlockActivitiesSummary,
  BlockActivityAssignment,
  DailyActivityRecord,
  DailyRecordCreatePayload,
  DailyRecordUpdatePayload,
  DailyRecordListResponse,
  DailyRecordHistorySummary,
  ElectricityBaseline,
  ElectricityBaselineCreatePayload,
  ElectricityBaselineRevisionPayload,
  DailyEstimateCalculateRequest,
  DailyEstimatePreviewResponse,
  DailyElectricityEstimate,
  DailyElectricityEstimateCreatePayload,
  ActualElectricityRecord,
  ActualElectricityRecordCreatePayload,
  ElectricityComparisonResponse,
  EmissionFactor,
  EmissionFactorListResponse,
  CarbonCalculationRequest,
  CarbonCalculationResponse,
  CarbonCalculationListResponse,
  CarbonRecalculateRequest,
  DashboardMetricsResponse,
  CategoryEmissionsResponse,
  BlockEmissionsResponse,
  TrendsResponse,
  BlockDetailAnalyticsResponse,
  DataQualityResponse,
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
  
  // Phase 1: System Diagnostics
  getHealth: () => request<HealthResponse>('/health'),
  getReadiness: () => request<ReadinessResponse>('/ready'),
  getSystemInfo: () => request<SystemInfoResponse>('/info'),

  // Phase 2: Organization & Campus Management
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

  // Phase 2: Blocks & Facility Inventory
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

  // Phase 3: Activity Catalogue & Block Assignments
  getActivities: (params?: { category?: string; search?: string; is_enabled?: boolean }) =>
    request<ActivityDefinition[]>('/v1/activities', { params }),

  getActivityById: (activityId: string) =>
    request<ActivityDefinition>(`/v1/activities/${activityId}`),

  seedPhase3Catalogue: () =>
    request<{
      status: string;
      activities_created: number;
      activities_existing: number;
      total_activities: number;
      assignments_created: number;
      assignments_existing: number;
      total_assignments: number;
    }>('/v1/activities/seed', { method: 'POST' }),

  getBlockActivities: (blockId: string) =>
    request<BlockActivitiesSummary>(`/v1/blocks/${blockId}/activities`),

  assignBlockActivity: (
    blockId: string,
    payload: { activity_id: string; is_enabled?: boolean; custom_unit?: string; notes?: string }
  ) =>
    request<BlockActivityAssignment>(`/v1/blocks/${blockId}/activities`, {
      method: 'POST',
      body: payload,
    }),

  removeBlockActivity: (blockId: string, activityId: string) =>
    request<{ message: string }>(`/v1/blocks/${blockId}/activities/${activityId}`, {
      method: 'DELETE',
    }),

  // Phase 3: Daily Activity Records
  getActivityRecords: (params?: {
    block_id?: string;
    activity_id?: string;
    start_date?: string;
    end_date?: string;
    data_status?: string;
    is_transfer?: boolean;
    limit?: number;
    offset?: number;
  }) => request<DailyRecordListResponse>('/v1/activity-records', { params }),

  getActivityRecordById: (recordId: string) =>
    request<DailyActivityRecord>(`/v1/activity-records/${recordId}`),

  createActivityRecord: (payload: DailyRecordCreatePayload) =>
    request<DailyActivityRecord>('/v1/activity-records', {
      method: 'POST',
      body: payload,
    }),

  updateActivityRecord: (recordId: string, payload: DailyRecordUpdatePayload) =>
    request<DailyActivityRecord>(`/v1/activity-records/${recordId}`, {
      method: 'PUT',
      body: payload,
    }),

  deleteActivityRecord: (recordId: string) =>
    request<{ message: string }>(`/v1/activity-records/${recordId}`, {
      method: 'DELETE',
    }),

  getActivityHistory: (
    blockId: string,
    activity_id: string,
    params?: { start_date?: string; end_date?: string }
  ) =>
    request<DailyRecordHistorySummary>(
      `/v1/activity-records/history/${blockId}/${activity_id}`,
      { params }
    ),

  // Phase 4: Electricity Baselines & Estimates
  getFacilityTypes: () =>
    request<{ categories: Record<string, any[]> }>('/v1/electricity/facility-types'),

  getBaselines: (params?: { block_id?: string; is_active?: boolean }) =>
    request<ElectricityBaseline[]>('/v1/electricity/baselines', { params }),

  getBaselineForBlock: (blockId: string, asOfDate?: string) =>
    request<ElectricityBaseline>(`/v1/electricity/baselines/block/${blockId}`, {
      params: asOfDate ? { as_of_date: asOfDate } : undefined,
    }),

  getBaselineVersionsForBlock: (blockId: string) =>
    request<ElectricityBaseline[]>(`/v1/electricity/baselines/block/${blockId}/versions`),

  getBaselineById: (baselineId: string) =>
    request<ElectricityBaseline>(`/v1/electricity/baselines/${baselineId}`),

  createBaseline: (payload: ElectricityBaselineCreatePayload) =>
    request<ElectricityBaseline>('/v1/electricity/baselines', {
      method: 'POST',
      body: payload,
    }),

  reviseBaseline: (baselineId: string, payload: ElectricityBaselineRevisionPayload) =>
    request<ElectricityBaseline>(`/v1/electricity/baselines/${baselineId}/revise`, {
      method: 'POST',
      body: payload,
    }),

  seedBaselines: () =>
    request<{ created_baselines: number; created_items: number; skipped_blocks: number }>(
      '/v1/electricity/baselines/seed',
      { method: 'POST' }
    ),

  calculateDailyEstimatePreview: (payload: DailyEstimateCalculateRequest) =>
    request<DailyEstimatePreviewResponse>('/v1/electricity/estimates/calculate', {
      method: 'POST',
      body: payload,
    }),

  createDailyEstimate: (payload: DailyElectricityEstimateCreatePayload) =>
    request<DailyElectricityEstimate>('/v1/electricity/estimates', {
      method: 'POST',
      body: payload,
    }),

  getDailyEstimates: (params?: {
    block_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }) =>
    request<DailyElectricityEstimate[]>('/v1/electricity/estimates', { params }),

  getDailyEstimateByDate: (blockId: string, reportingDate: string) =>
    request<DailyElectricityEstimate>(`/v1/electricity/estimates/block/${blockId}/date/${reportingDate}`),

  recordActualElectricity: (payload: ActualElectricityRecordCreatePayload) =>
    request<ActualElectricityRecord>('/v1/electricity/actual', {
      method: 'POST',
      body: payload,
    }),

  getElectricityComparison: (params: {
    block_id: string;
    start_date: string;
    end_date: string;
  }) =>
    request<ElectricityComparisonResponse>('/v1/electricity/comparison', { params }),

  // Phase 5: Carbon Calculation Engine & Emission Factors
  getEmissionFactors: (params?: {
    category?: string;
    scope?: string;
    status?: string;
    is_active?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }) => request<EmissionFactorListResponse>('/v1/carbon/factors', { params }),

  getEmissionFactorById: (factorId: string) =>
    request<EmissionFactor>(`/v1/carbon/factors/${factorId}`),

  seedEmissionFactors: () =>
    request<{
      status: string;
      message: string;
      created_factors: number;
      updated_factors: number;
      total_canonical: number;
    }>('/v1/carbon/factors/seed', { method: 'POST' }),

  calculateCarbon: (payload: CarbonCalculationRequest) =>
    request<CarbonCalculationResponse>('/v1/carbon/calculate', {
      method: 'POST',
      body: payload,
    }),

  getCarbonCalculations: (params?: {
    block_id?: string;
    start_date?: string;
    end_date?: string;
    scope?: string;
    activity_category?: string;
    include_superseded?: boolean;
    limit?: number;
    offset?: number;
  }) => request<CarbonCalculationListResponse>('/v1/carbon/calculations', { params }),

  getCarbonCalculationById: (calcId: string) =>
    request<CarbonCalculationResponse>(`/v1/carbon/calculations/${calcId}`),

  recalculateCarbon: (calcId: string, payload?: CarbonRecalculateRequest) =>
    request<CarbonCalculationResponse>(`/v1/carbon/calculations/${calcId}/recalculate`, {
      method: 'POST',
      body: payload || {},
    }),

  // Phase 6: Campus Carbon Dashboard & Reporting Engine
  getDashboardMetrics: (params?: {
    start_date?: string;
    end_date?: string;
    campus_id?: string;
    block_id?: string;
  }) => request<DashboardMetricsResponse>('/v1/reporting/dashboard', { params }),

  getEmissionsByCategory: (params?: {
    start_date?: string;
    end_date?: string;
    block_id?: string;
  }) => request<CategoryEmissionsResponse>('/v1/reporting/by-category', { params }),

  getEmissionsByBlock: (params?: {
    start_date?: string;
    end_date?: string;
    category?: string;
  }) => request<BlockEmissionsResponse>('/v1/reporting/by-block', { params }),

  getEmissionsTrends: (params?: {
    start_date?: string;
    end_date?: string;
    block_id?: string;
    group_by?: 'day' | 'month';
  }) => request<TrendsResponse>('/v1/reporting/trends', { params }),

  getBlockDetailAnalytics: (blockId: string, params?: {
    start_date?: string;
    end_date?: string;
  }) => request<BlockDetailAnalyticsResponse>(`/v1/reporting/block/${blockId}`, { params }),

  getDataQuality: (params?: {
    start_date?: string;
    end_date?: string;
  }) => request<DataQualityResponse>('/v1/reporting/data-quality', { params }),

  downloadCsvReport: async (params?: { start_date?: string; end_date?: string; block_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    if (params?.block_id) query.set('block_id', params.block_id);
    const qStr = query.toString();
    const url = `${API_BASE_URL}/v1/reporting/export/csv${qStr ? `?${qStr}` : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to download CSV report');
    }
    const blob = await response.blob();
    const filename = `campuscarbon_audit_${params?.start_date || 'all'}_${params?.end_date || 'all'}.csv`;
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  downloadPdfReport: async (params?: { start_date?: string; end_date?: string; block_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    if (params?.block_id) query.set('block_id', params.block_id);
    const qStr = query.toString();
    const url = `${API_BASE_URL}/v1/reporting/export/pdf${qStr ? `?${qStr}` : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new ApiError(response.status, 'Failed to download PDF executive report');
    }
    const blob = await response.blob();
    const filename = `campuscarbon_executive_report_${params?.start_date || 'all'}_${params?.end_date || 'all'}.pdf`;
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};

