"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanMessage = scanMessage;
const shared_1 = require("@openconnect/shared");
const CACHE_REFRESH_MS = 60_000;
const AGENCY_SCOPE_KEY = '__agency__';
const keywordCache = new Map();
let cacheLoadedAt = 0;
let cacheLoadPromise = null;
function toScopeKey(agencyId, facilityId) {
    return `${agencyId}:${facilityId ?? AGENCY_SCOPE_KEY}`;
}
function normalizeToken(value) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}
function extractTokens(messageBody) {
    const tokens = messageBody
        .split(/\s+/)
        .map((token) => normalizeToken(token))
        .filter((token) => token.length > 0);
    return Array.from(new Set(tokens));
}
async function loadKeywords() {
    if (cacheLoadPromise) {
        await cacheLoadPromise;
        return;
    }
    cacheLoadPromise = (async () => {
        const alerts = await shared_1.prisma.keywordAlert.findMany({
            where: { isActive: true },
            select: {
                keyword: true,
                isRegex: true,
                tier: true,
                category: true,
                severity: true,
                agencyId: true,
                facilityId: true,
            },
        });
        const nextCache = new Map();
        for (const alert of alerts) {
            const key = toScopeKey(alert.agencyId, alert.facilityId);
            const entry = nextCache.get(key) ?? [];
            entry.push({
                keyword: alert.keyword,
                isRegex: alert.isRegex,
                tier: alert.tier,
                category: alert.category,
                severity: alert.severity,
                agencyId: alert.agencyId,
                facilityId: alert.facilityId,
            });
            nextCache.set(key, entry);
        }
        keywordCache.clear();
        for (const [key, value] of nextCache.entries()) {
            keywordCache.set(key, value);
        }
        cacheLoadedAt = Date.now();
    })();
    try {
        await cacheLoadPromise;
    }
    finally {
        cacheLoadPromise = null;
    }
}
function getScopedAlerts(agencyId, facilityId) {
    const agencyAlerts = keywordCache.get(toScopeKey(agencyId, null)) ?? [];
    if (!facilityId) {
        return agencyAlerts;
    }
    const facilityAlerts = keywordCache.get(toScopeKey(agencyId, facilityId)) ?? [];
    return [...agencyAlerts, ...facilityAlerts];
}
async function ensureCacheLoaded() {
    if (cacheLoadedAt === 0 || Date.now() - cacheLoadedAt > CACHE_REFRESH_MS) {
        await loadKeywords();
    }
}
setInterval(() => {
    void loadKeywords();
}, CACHE_REFRESH_MS);
async function scanMessage(messageBody, agencyId, facilityId) {
    await ensureCacheLoaded();
    const matches = [];
    const seenMatches = new Set();
    const tokens = extractTokens(messageBody);
    const scopedAlerts = getScopedAlerts(agencyId, facilityId);
    const exactBlacklistAlerts = scopedAlerts.filter((alert) => alert.tier === 'blacklist' && !alert.isRegex);
    const blacklistMap = new Map();
    for (const alert of exactBlacklistAlerts) {
        const normalizedKeyword = normalizeToken(alert.keyword);
        if (!normalizedKeyword) {
            continue;
        }
        const alertGroup = blacklistMap.get(normalizedKeyword) ?? [];
        alertGroup.push(alert);
        blacklistMap.set(normalizedKeyword, alertGroup);
    }
    for (const token of tokens) {
        const tokenMatches = blacklistMap.get(token) ?? [];
        for (const match of tokenMatches) {
            const id = `${match.keyword}|${match.tier}|${match.category}|${match.severity}`;
            if (seenMatches.has(id)) {
                continue;
            }
            seenMatches.add(id);
            matches.push({
                keyword: match.keyword,
                tier: match.tier,
                category: match.category,
                severity: match.severity,
            });
        }
    }
    for (const token of tokens) {
        const fuzzyRows = await shared_1.prisma.$queryRaw `
      SELECT keyword, tier, category, severity, word_similarity(keyword, ${token}) as score
      FROM keyword_alerts
      WHERE is_active = true AND agency_id = ${agencyId} AND (facility_id IS NULL OR facility_id = ${facilityId ?? null})
      AND keyword %> ${token}
      ORDER BY score DESC LIMIT 20
    `;
        for (const row of fuzzyRows) {
            if (row.tier !== 'greylist') {
                continue;
            }
            const id = `${row.keyword}|${row.tier}|${row.category}|${row.severity}`;
            if (seenMatches.has(id)) {
                continue;
            }
            seenMatches.add(id);
            matches.push({
                keyword: row.keyword,
                tier: row.tier,
                category: row.category,
                severity: row.severity,
            });
        }
    }
    const regexWatchlistAlerts = scopedAlerts.filter((alert) => alert.tier === 'watchlist' && alert.isRegex);
    for (const alert of regexWatchlistAlerts) {
        try {
            const regex = new RegExp(alert.keyword, 'i');
            if (!regex.test(messageBody)) {
                continue;
            }
            const id = `${alert.keyword}|${alert.tier}|${alert.category}|${alert.severity}`;
            if (seenMatches.has(id)) {
                continue;
            }
            seenMatches.add(id);
            matches.push({
                keyword: alert.keyword,
                tier: alert.tier,
                category: alert.category,
                severity: alert.severity,
            });
        }
        catch {
            continue;
        }
    }
    const blocked = matches.some((match) => match.tier === 'blacklist');
    return {
        blocked,
        flagged: matches.length > 0,
        matches,
    };
}
//# sourceMappingURL=messageScanner.js.map