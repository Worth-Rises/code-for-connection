export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
    pagination?: PaginationInfo;
}
export interface ApiError {
    code: string;
    message: string;
}
export interface PaginationInfo {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}
export interface PaginatedQuery {
    page?: number;
    pageSize?: number;
}
export interface DateRangeQuery {
    startDate?: string;
    endDate?: string;
}
export interface FacilityQuery {
    facilityId?: string;
}
export interface UserQuery {
    userId?: string;
}
export type CallLogsQuery = PaginatedQuery & DateRangeQuery & FacilityQuery & UserQuery;
export interface StatsResponse {
    activeCalls: number;
    todayTotal: number;
}
export interface VoiceStatsResponse extends StatsResponse {
}
export interface VideoStatsResponse extends StatsResponse {
    pendingRequests: number;
}
export interface MessagingStatsResponse {
    todayTotal: number;
    pendingReview: number;
}
export interface ContactCheckResponse {
    approved: boolean;
    isAttorney: boolean;
}
export interface BlockedNumberCheckResponse {
    blocked: boolean;
    scope?: 'facility' | 'agency';
}
//# sourceMappingURL=api.d.ts.map