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
