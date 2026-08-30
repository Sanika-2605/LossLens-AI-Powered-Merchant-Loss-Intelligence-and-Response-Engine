export interface Stats {
  transaction_count: number;
  transaction_value: number;
  customer_count: number;
  order_count: number;
  refund_count: number;
  refund_value: number;
  device_count: number;
  address_count: number;
  event_count: number;
}

export interface Payment {
  id: string;
  order_id: string;
  customer_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  provider: string;
  provider_payment_id: string;
  created_at: string;
}

export interface EventItem {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  event_timestamp: string;
  source: string;
  payload: any;
}
