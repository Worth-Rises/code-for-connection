export type MatchResult = {
    keyword: string;
    tier: string;
    category: string;
    severity: string;
};
export type ScanResult = {
    blocked: boolean;
    flagged: boolean;
    matches: MatchResult[];
};
export declare function scanMessage(messageBody: string, agencyId: string, facilityId?: string): Promise<ScanResult>;
//# sourceMappingURL=messageScanner.d.ts.map