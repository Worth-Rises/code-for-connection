import type { PaginationInfo } from '../types/api.js';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface PaginationResult {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
}

export function getPagination(options: PaginationOptions): PaginationResult {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, options.pageSize || DEFAULT_PAGE_SIZE)
  );
  
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
    page,
    pageSize,
  };
}

export function createPaginationInfo(
  page: number,
  pageSize: number,
  total: number
): PaginationInfo {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}
