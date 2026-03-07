import { prisma } from '@openconnect/shared';

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

type KeywordAlertRecord = {
  keyword: string;
  isRegex: boolean;
  tier: string;
  category: string;
  severity: string;
  agencyId: string;
  facilityId: string | null;
};

type FuzzyMatchRow = {
  keyword: string;
  tier: string;
  category: string;
  severity: string;
  score: number;
};

const CACHE_REFRESH_MS = 60_000;
const AGENCY_SCOPE_KEY = '__agency__';
const keywordCache = new Map<string, KeywordAlertRecord[]>();

let cacheLoadedAt = 0;
let cacheLoadPromise: Promise<void> | null = null;

function toScopeKey(agencyId: string, facilityId: string | null): string {
  return `${agencyId}:${facilityId ?? AGENCY_SCOPE_KEY}`;
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function extractTokens(messageBody: string): string[] {
  const tokens = messageBody
    .split(/\s+/)
    .map((token) => normalizeToken(token))
    .filter((token) => token.length > 0);

  return Array.from(new Set(tokens));
}

async function loadKeywords(): Promise<void> {
  if (cacheLoadPromise) {
    await cacheLoadPromise;
    return;
  }

  cacheLoadPromise = (async () => {
    const alerts = await prisma.keywordAlert.findMany({
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

    const nextCache = new Map<string, KeywordAlertRecord[]>();

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
  } finally {
    cacheLoadPromise = null;
  }
}

function getScopedAlerts(agencyId: string, facilityId?: string): KeywordAlertRecord[] {
  const agencyAlerts = keywordCache.get(toScopeKey(agencyId, null)) ?? [];
  if (!facilityId) {
    return agencyAlerts;
  }

  const facilityAlerts = keywordCache.get(toScopeKey(agencyId, facilityId)) ?? [];
  return [...agencyAlerts, ...facilityAlerts];
}

async function ensureCacheLoaded(): Promise<void> {
  if (cacheLoadedAt === 0 || Date.now() - cacheLoadedAt > CACHE_REFRESH_MS) {
    await loadKeywords();
  }
}

setInterval(() => {
  void loadKeywords();
}, CACHE_REFRESH_MS);

export async function scanMessage(
  messageBody: string,
  agencyId: string,
  facilityId?: string
): Promise<ScanResult> {
  await ensureCacheLoaded();

  const matches: MatchResult[] = [];
  const seenMatches = new Set<string>();
  const tokens = extractTokens(messageBody);
  const scopedAlerts = getScopedAlerts(agencyId, facilityId);

  const exactBlacklistAlerts = scopedAlerts.filter((alert) => alert.tier === 'blacklist' && !alert.isRegex);
  const blacklistMap = new Map<string, KeywordAlertRecord[]>();

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
    const fuzzyRows = await prisma.$queryRaw<FuzzyMatchRow[]>`
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
    } catch {
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
