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

