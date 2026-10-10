/**
 * API Client for CampusCarbon AI
 * Supports automatic header injection for RBAC and campus data isolation.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

// Current session context state
let sessionState = {
  userId: 'sustainability-lead-01',
  role: 'admin', // admin, facility_manager, viewer
  campusId: 'green-tech-univ-01'
};

export const setSessionContext = (newContext) => {
  sessionState = { ...sessionState, ...newContext };
};

export const getSessionContext = () => sessionState;

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': sessionState.userId,
    'x-user-role': sessionState.role,
    'x-campus-id': sessionState.campusId,
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errMsg = `Request failed with status ${res.status}`;
      try {
        const errorData = await res.json();
        errMsg = errorData.detail || errMsg;
      } catch (e) {
        // use default status message
      }
      throw new Error(errMsg);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // System Health
  getHealth: () => request('/health'),

  // Campus & Elements
  getCampuses: () => request('/campus'),
  getCampusBodies: (campusId) => request(`/campus/bodies${campusId ? `?campus_id=${campusId}` : ''}`),
  getElements: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/campus/elements${qs ? `?${qs}` : ''}`);
  },
  getEmissionFactors: (category) => request(`/campus/emission-factors${category ? `?category=${category}` : ''}`),
  getElementActivity: (elementId) => request(`/campus/elements/${elementId}/activity`),

  // Recommendations
  getRecommendations: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/recommendations${qs ? `?${qs}` : ''}`);
  },
  generateRecommendations: (payload) => request('/recommendations/generate', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getRecommendation: (id) => request(`/recommendations/${id}`),
  approveRecommendation: (id) => request(`/recommendations/${id}/approve`, { method: 'POST' }),
  rejectRecommendation: (id, reason) => request(`/recommendations/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  }),
  refreshRecommendation: (id) => request(`/recommendations/${id}/refresh`, { method: 'POST' }),
  getRecommendationSummary: (campusId) => request(`/recommendations/summary${campusId ? `?campus_id=${campusId}` : ''}`),

  // Scenarios
  getScenarios: (campusId) => request(`/scenarios${campusId ? `?campus_id=${campusId}` : ''}`),
  getScenario: (id) => request(`/scenarios/${id}`),
  createScenario: (payload) => request('/scenarios', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  calculatePreview: (payload) => request('/scenarios/calculate-preview', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  compareScenarios: (scenarioIds) => request('/scenarios/compare', {
    method: 'POST',
    body: JSON.stringify({ scenario_ids: scenarioIds })
  }),

  // General Carbon Calculator (Component 1)
  calculateGeneralFootprint: (payload) => request('/calculator/general', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  // Interventions & Measurements
  getImplementations: (campusId) => request(`/interventions${campusId ? `?campus_id=${campusId}` : ''}`),
  recordImplementation: (payload) => request('/interventions/implementation', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  recordMeasurement: (interventionId, payload) => request(`/interventions/${interventionId}/measurements`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  compareOutcome: (interventionId) => request(`/interventions/${interventionId}/compare-outcome`)
};

