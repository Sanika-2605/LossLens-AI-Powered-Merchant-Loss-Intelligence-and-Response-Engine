import type { Stats, Payment, EventItem } from '../types';
export type { Stats, Payment, EventItem };

const API_BASE_URL = typeof window !== 'undefined' && (window.location.port === '5173' || window.location.port === '3000')
  ? 'http://localhost:8001/api'
  : '/api';

export const fetchStats = async (): Promise<Stats> => {
  const res = await fetch(`${API_BASE_URL}/stats`);
  return res.json();
};

export const fetchPayments = async (page = 1, limit = 20, filters: any = {}): Promise<{ total: number; data: Payment[] }> => {
  const offset = (page - 1) * limit;
  const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
  if (filters.status) params.append('status', filters.status);
  if (filters.payment_method) params.append('payment_method', filters.payment_method);
  
  const res = await fetch(`${API_BASE_URL}/payments?${params.toString()}`);
  return res.json();
};

export const fetchEvents = async (page = 1, limit = 50): Promise<{ total: number; data: EventItem[] }> => {
  const offset = (page - 1) * limit;
  const res = await fetch(`${API_BASE_URL}/events?limit=${limit}&offset=${offset}`);
  return res.json();
};

export const fetchGraphSummary = async () => {
  const res = await fetch(`${API_BASE_URL}/graph/summary`);
  return res.json();
};

export const fetchEntityGraph = async (entityType: string, entityId: string) => {
  const res = await fetch(`${API_BASE_URL}/graph/entities/${entityType}/${entityId}`);
  return res.json();
};

// ---------------------------------------------------------------------------
// New Graph Intelligence APIs
// ---------------------------------------------------------------------------

/** Full graph as React Flow-compatible nodes/edges. */
export const fetchGraphData = async (limit = 500) => {
  const res = await fetch(`${API_BASE_URL}/graph?limit=${limit}`);
  return res.json();
};

/** Full entity analysis with all graph metrics. */
export const fetchEntityAnalysis = async (entityType: string, entityId: string) => {
  const res = await fetch(`${API_BASE_URL}/graph/entities/${entityType}/${entityId}`);
  if (!res.ok) {
    throw new Error(`Entity not found: ${res.status}`);
  }
  return res.json();
};

/** Neighbors with depth and optional entity_type filter. */
export const fetchEntityNeighbors = async (
  entityType: string,
  entityId: string,
  depth: number = 1,
  filterType?: string
) => {
  const params = new URLSearchParams({ depth: depth.toString() });
  if (filterType) params.append('entity_type', filterType);
  const res = await fetch(
    `${API_BASE_URL}/graph/entities/${entityType}/${entityId}/neighbors?${params.toString()}`
  );
  return res.json();
};

/** Refresh the in-memory graph cache from current Supabase data. */
export const refreshGraph = async () => {
  const res = await fetch(`${API_BASE_URL}/graph/refresh`, { method: 'POST' });
  return res.json();
};

// ---------------------------------------------------------------------------
// AI/ML Discovery Engine APIs
// ---------------------------------------------------------------------------

/** Trigger the pattern discovery pipeline. */
export const triggerPatternDiscovery = async () => {
  const res = await fetch(`${API_BASE_URL}/discovery/discover`, { method: 'POST' });
  if (!res.ok) {
    throw new Error(`Failed to trigger discovery: ${res.status}`);
  }
  return res.json();
};

/** Fetch all discovered patterns. */
export const fetchDiscoveredPatterns = async () => {
  const res = await fetch(`${API_BASE_URL}/discovery/patterns`);
  if (!res.ok) {
    throw new Error(`Failed to fetch patterns: ${res.status}`);
  }
  return res.json();
};

/** Fetch details of a specific pattern. */
export const fetchPatternDetails = async (patternId: string) => {
  const res = await fetch(`${API_BASE_URL}/discovery/patterns/${patternId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch pattern details: ${res.status}`);
  }
  return res.json();
};

// ---------------------------------------------------------------------------
// Explainable Investigation & Decision Intelligence APIs
// ---------------------------------------------------------------------------

export const fetchInvestigation = async (patternId: string) => {
  const res = await fetch(`${API_BASE_URL}/investigation/${patternId}`);
  if (!res.ok) throw new Error(`Failed to fetch investigation: ${res.status}`);
  return res.json();
};

export const fetchInvestigationEvidence = async (patternId: string) => {
  const res = await fetch(`${API_BASE_URL}/investigation/${patternId}/evidence`);
  if (!res.ok) throw new Error(`Failed to fetch evidence: ${res.status}`);
  return res.json();
};

export const fetchInvestigationExplanation = async (patternId: string) => {
  const res = await fetch(`${API_BASE_URL}/investigation/${patternId}/explanation`);
  if (!res.ok) throw new Error(`Failed to fetch explanation: ${res.status}`);
  return res.json();
};

export const fetchInvestigationForecast = async (patternId: string) => {
  const res = await fetch(`${API_BASE_URL}/investigation/${patternId}/forecast`);
  if (!res.ok) throw new Error(`Failed to fetch forecast: ${res.status}`);
  return res.json();
};

export const fetchInvestigationSimulation = async (patternId: string) => {
  const res = await fetch(`${API_BASE_URL}/investigation/${patternId}/simulation`);
  if (!res.ok) throw new Error(`Failed to fetch simulation: ${res.status}`);
  return res.json();
};

export const fetchInvestigationDecision = async (patternId: string) => {
  const res = await fetch(`${API_BASE_URL}/investigation/${patternId}/decision`);
  if (!res.ok) throw new Error(`Failed to fetch decision: ${res.status}`);
  return res.json();
};

export const fetchInvestigationHypotheses = async (patternId: string) => {
  const res = await fetch(`${API_BASE_URL}/investigation/${patternId}/hypotheses`);
  if (!res.ok) throw new Error(`Failed to fetch hypotheses: ${res.status}`);
  return res.json();
};

export const fetchInvestigationAudit = async (patternId: string) => {
  const res = await fetch(`${API_BASE_URL}/investigation/${patternId}/audit`);
  if (!res.ok) throw new Error(`Failed to fetch audit trail: ${res.status}`);
  return res.json();
};

export const submitDecision = async (
  patternId: string,
  action: 'approve' | 'reject' | 'modify' | 'escalate' | 'dismiss',
  payload: { user_id?: string; reason?: string; modified_action?: string } = {}
) => {
  const res = await fetch(`${API_BASE_URL}/investigation/${patternId}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Failed to submit decision: ${res.status}`);
  return res.json();
};

export const executeTestAction = async (
  patternId: string,
  actionName: string,
  payload: { user_id?: string; reason?: string } = {}
) => {
  const res = await fetch(`${API_BASE_URL}/investigation/${patternId}/act`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action_name: actionName, ...payload })
  });
  if (!res.ok) throw new Error(`Failed to execute test action: ${res.status}`);
  return res.json();
};

export const submitMerchantFeedback = async (
  patternId: string,
  feedbackType: string,
  payload: { notes?: string; user_id?: string } = {}
) => {
  const res = await fetch(`${API_BASE_URL}/investigation/${patternId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback_type: feedbackType, ...payload })
  });
  if (!res.ok) throw new Error(`Failed to submit feedback: ${res.status}`);
  return res.json();
};

export const fetchInvestigationOutcome = async (patternId: string) => {
  const res = await fetch(`${API_BASE_URL}/investigation/${patternId}/outcome`);
  if (!res.ok) throw new Error(`Failed to fetch outcome: ${res.status}`);
  return res.json();
};

export const fetchPatternEvolution = async (patternId: string) => {
  const res = await fetch(`${API_BASE_URL}/investigation/${patternId}/evolution`);
  if (!res.ok) throw new Error(`Failed to fetch evolution: ${res.status}`);
  return res.json();
};

export const fetchEvaluationMetrics = async () => {
  const res = await fetch(`${API_BASE_URL}/evaluation`);
  if (!res.ok) throw new Error(`Failed to fetch evaluation metrics: ${res.status}`);
  return res.json();
};

