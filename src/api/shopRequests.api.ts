import { ShopRequest } from '@/lib/types';
import { apiFetch } from './client';

// The requester also chooses their own admin username + password (self-service).
export type ShopRequestInput = Omit<ShopRequest, 'id' | 'status' | 'createdAt'> & {
  username: string;
  password: string;
};

export const submitShopRequest = (payload: ShopRequestInput) =>
  apiFetch<{ request: ShopRequest }>('/shop-requests', { method: 'POST', body: JSON.stringify(payload) });

