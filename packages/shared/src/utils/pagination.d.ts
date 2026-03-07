import type { PaginationInfo } from '../types/api.js';
export declare const DEFAULT_PAGE_SIZE = 20;
export declare const MAX_PAGE_SIZE = 100;
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
export declare function getPagination(options: PaginationOptions): PaginationResult;
export declare function createPaginationInfo(page: number, pageSize: number, total: number): PaginationInfo;
//# sourceMappingURL=pagination.d.ts.map