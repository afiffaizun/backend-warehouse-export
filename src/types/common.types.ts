export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: PaginationMeta;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedRequest {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN_GUDANG = 'ADMIN_GUDANG',
  ADMIN_PENJUALAN = 'ADMIN_PENJUALAN',
  MANAGER = 'MANAGER',
  VIEWER = 'VIEWER',
}

export const PERMISSIONS = {
  SUPER_ADMIN: ['*'],
  ADMIN_GUDANG: [
    'products:read', 'products:write',
    'inventory:read', 'inventory:write',
    'warehouses:read', 'warehouses:write',
  ],
  ADMIN_PENJUALAN: [
    'products:read',
    'buyers:read', 'buyers:write',
    'orders:read', 'orders:write',
    'invoices:read', 'invoices:write',
    'shipments:read', 'shipments:write',
  ],
  MANAGER: [
    'dashboard:read',
    'reports:read',
    'orders:read',
    'inventory:read',
  ],
  VIEWER: [
    'dashboard:read',
  ],
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS][number];
