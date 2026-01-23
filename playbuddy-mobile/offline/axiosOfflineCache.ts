import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';

type CacheEntry = {
  timestamp: number;
  data: unknown;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
};

type SetupOptions = {
  queryClient: QueryClient;
  maxAgeMs?: number;
  maxEntries?: number;
  maxBytes?: number;
  maxEntryBytes?: number;
  reconnectPollMs?: number;
};

type CacheIndexEntry = {
  key: string;
  timestamp: number;
  size: number;
};

type CacheSettings = {
  maxAgeMs: number;
  maxEntries: number;
  maxBytes: number;
  maxEntryBytes: number;
};

const CACHE_PREFIX = 'playbuddy:http-cache:';
const DEFAULT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;
const DEFAULT_RECONNECT_POLL_MS = 15000;
const CACHE_INDEX_KEY = `${CACHE_PREFIX}index`;
const DEFAULT_MAX_ENTRIES = 120;
const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;
const DEFAULT_MAX_ENTRY_BYTES = 4 * 1024 * 1024;

let hasSetup = false;
let cacheIndex: CacheIndexEntry[] | null = null;
let cacheIndexPromise: Promise<CacheIndexEntry[]> | null = null;
let cacheSettings: CacheSettings = {
  maxAgeMs: DEFAULT_MAX_AGE_MS,
  maxEntries: DEFAULT_MAX_ENTRIES,
  maxBytes: DEFAULT_MAX_BYTES,
  maxEntryBytes: DEFAULT_MAX_ENTRY_BYTES,
};

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
};

const normalizeParams = (params: unknown): string => {
  if (!params) return '';
  if (typeof URLSearchParams !== 'undefined' && params instanceof URLSearchParams) {
    return params.toString();
  }
  if (typeof params === 'string') return params;
  return stableStringify(params);
};

const getHeaderValue = (headers: AxiosRequestConfig['headers'], name: string): string => {
  if (!headers) return '';
  const maybeHeaders = headers as { get?: (key: string) => string | null };
  if (typeof maybeHeaders.get === 'function') {
    const value = maybeHeaders.get(name);
    return typeof value === 'string' ? value : '';
  }
  const record = headers as Record<string, unknown>;
  const value = record[name] ?? record[name.toLowerCase()] ?? record[name.toUpperCase()];
  return typeof value === 'string' ? value : '';
};

const hashString = (value: string): string => {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

const getCacheKey = (config: AxiosRequestConfig): string | null => {
  const method = (config.method || 'get').toLowerCase();
  if (method !== 'get') return null;
  const url = config.baseURL ? `${config.baseURL}${config.url ?? ''}` : (config.url ?? '');
  const params = normalizeParams(config.params);
  const authHeader = getHeaderValue(config.headers, 'Authorization');
  const authHash = authHeader ? hashString(authHeader) : '';
  const paramsSuffix = params ? `?${params}` : '';
  const authSuffix = authHash ? `|auth=${authHash}` : '';
  return `${CACHE_PREFIX}${url}${paramsSuffix}${authSuffix}`;
};

const shouldCacheRequest = (config?: AxiosRequestConfig): boolean => {
  if (!config) return false;
  const method = (config.method || 'get').toLowerCase();
  if (method !== 'get') return false;
  if (config.responseType && config.responseType !== 'json') return false;
  return true;
};

const getContentType = (headers: AxiosResponse['headers']): string => {
  const maybeHeaders = headers as { get?: (key: string) => string | null };
  if (typeof maybeHeaders.get === 'function') {
    const value = maybeHeaders.get('content-type');
    return typeof value === 'string' ? value : '';
  }
  const record = headers as Record<string, unknown>;
  const value = record['content-type'] ?? record['Content-Type'];
  return typeof value === 'string' ? value : '';
};

const shouldCacheResponse = (response: AxiosResponse): boolean => {
  if (!shouldCacheRequest(response.config)) return false;
  const contentType = getContentType(response.headers);
  return !contentType || contentType.includes('application/json');
};

const isNetworkError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false;
  if (error.code === 'ERR_CANCELED') return false;
  return !error.response;
};

const getByteLength = (value: string): number => value.length;

const normalizeCacheIndex = (entries: CacheIndexEntry[]): CacheIndexEntry[] => {
  const map = new Map<string, CacheIndexEntry>();
  for (const entry of entries) {
    if (!entry || typeof entry.key !== 'string') continue;
    if (!Number.isFinite(entry.timestamp) || !Number.isFinite(entry.size)) continue;
    const existing = map.get(entry.key);
    if (!existing || entry.timestamp > existing.timestamp) {
      map.set(entry.key, entry);
    }
  }
  return Array.from(map.values());
};

const persistCacheIndex = async (entries: CacheIndexEntry[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage errors so requests still succeed.
  }
};

const rebuildCacheIndex = async (): Promise<CacheIndexEntry[]> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_INDEX_KEY);
    if (!cacheKeys.length) return [];
    const pairs = await AsyncStorage.multiGet(cacheKeys);
    const entries: CacheIndexEntry[] = [];
    for (const [key, raw] of pairs) {
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as CacheEntry;
        if (!Number.isFinite(parsed.timestamp)) continue;
        entries.push({
          key,
          timestamp: parsed.timestamp,
          size: getByteLength(raw),
        });
      } catch {
        // Ignore invalid cache entries.
      }
    }
    return normalizeCacheIndex(entries);
  } catch {
    return [];
  }
};

const loadCacheIndex = async (): Promise<CacheIndexEntry[]> => {
  if (cacheIndex) return cacheIndex;
  if (cacheIndexPromise) return cacheIndexPromise;
  cacheIndexPromise = (async () => {
    let entries: CacheIndexEntry[] | null = null;
    try {
      const raw = await AsyncStorage.getItem(CACHE_INDEX_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CacheIndexEntry[];
        entries = normalizeCacheIndex(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      // Ignore invalid cache index values.
    }
    if (!entries) {
      entries = await rebuildCacheIndex();
    }
    cacheIndex = entries;
    await persistCacheIndex(entries);
    cacheIndexPromise = null;
    return entries;
  })();
  return cacheIndexPromise;
};

const trimCacheEntries = (
  entries: CacheIndexEntry[],
  now: number,
  maxAgeMs: number,
  maxEntries: number,
  maxBytes: number,
) => {
  const expiredKeys: string[] = [];
  const freshEntries: CacheIndexEntry[] = [];

  for (const entry of entries) {
    if (now - entry.timestamp > maxAgeMs) {
      expiredKeys.push(entry.key);
    } else {
      freshEntries.push(entry);
    }
  }

  const sorted = [...freshEntries].sort((a, b) => a.timestamp - b.timestamp);
  let totalSize = sorted.reduce((sum, entry) => sum + entry.size, 0);
  const evictedKeys: string[] = [];
  const maxEntriesLimit = maxEntries > 0 ? maxEntries : Number.POSITIVE_INFINITY;
  const maxBytesLimit = maxBytes > 0 ? maxBytes : Number.POSITIVE_INFINITY;

  while (sorted.length > maxEntriesLimit || totalSize > maxBytesLimit) {
    const removed = sorted.shift();
    if (!removed) break;
    totalSize -= removed.size;
    evictedKeys.push(removed.key);
  }

  return {
    kept: sorted.sort((a, b) => b.timestamp - a.timestamp),
    expiredKeys,
    evictedKeys,
  };
};

const pruneCacheIndex = async (
  maxAgeMs: number,
  maxEntries: number,
  maxBytes: number,
) => {
  const entries = await loadCacheIndex();
  if (!entries.length) return;
  const now = Date.now();
  const { kept, expiredKeys, evictedKeys } = trimCacheEntries(
    entries,
    now,
    maxAgeMs,
    maxEntries,
    maxBytes,
  );
  const keysToRemove = [...expiredKeys, ...evictedKeys];
  if (keysToRemove.length) {
    try {
      await AsyncStorage.multiRemove(keysToRemove);
    } catch {
      // Ignore storage errors so requests still succeed.
    }
  }
  cacheIndex = kept;
  await persistCacheIndex(kept);
};

const removeCacheKeyFromIndex = (key: string) => {
  if (!cacheIndex) return;
  const next = cacheIndex.filter(entry => entry.key !== key);
  if (next.length === cacheIndex.length) return;
  cacheIndex = next;
  void persistCacheIndex(next);
};

const readCacheEntry = async (key: string, maxAgeMs: number): Promise<CacheEntry | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.timestamp > maxAgeMs) {
      await AsyncStorage.removeItem(key);
      removeCacheKeyFromIndex(key);
      return null;
    }
    return parsed;
  } catch {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore storage errors so requests still succeed.
    }
    removeCacheKeyFromIndex(key);
    return null;
  }
};

export const readCachedAxiosData = async <T = unknown>(
  config: AxiosRequestConfig,
  maxAgeMs: number = cacheSettings.maxAgeMs,
): Promise<T | null> => {
  const cacheKey = getCacheKey(config);
  if (!cacheKey) return null;
  const cached = await readCacheEntry(cacheKey, maxAgeMs);
  return cached ? (cached.data as T) : null;
};

const writeCacheEntry = async (key: string, entry: CacheEntry): Promise<void> => {
  try {
    const raw = JSON.stringify(entry);
    const entrySize = getByteLength(raw);
    if (entrySize > cacheSettings.maxEntryBytes) {
      await pruneCacheIndex(
        cacheSettings.maxAgeMs,
        cacheSettings.maxEntries,
        cacheSettings.maxBytes,
      );
      return;
    }

    const entries = await loadCacheIndex();
    const now = Date.now();
    const nextEntries: CacheIndexEntry[] = [
      { key, timestamp: entry.timestamp, size: entrySize },
      ...entries.filter(existing => existing.key !== key),
    ];
    const { kept, expiredKeys, evictedKeys } = trimCacheEntries(
      nextEntries,
      now,
      cacheSettings.maxAgeMs,
      cacheSettings.maxEntries,
      cacheSettings.maxBytes,
    );
    const shouldWrite = kept.some(entryItem => entryItem.key === key);

    if (!shouldWrite) {
      const { kept: pruned, expiredKeys: prunedExpired, evictedKeys: prunedEvicted } =
        trimCacheEntries(
          entries,
          now,
          cacheSettings.maxAgeMs,
          cacheSettings.maxEntries,
          cacheSettings.maxBytes,
        );
      const keysToRemove = [...prunedExpired, ...prunedEvicted];
      if (keysToRemove.length) {
        try {
          await AsyncStorage.multiRemove(keysToRemove);
        } catch {
          // Ignore storage errors so requests still succeed.
        }
      }
      cacheIndex = pruned;
      await persistCacheIndex(pruned);
      return;
    }

    const keysToRemove = [...expiredKeys, ...evictedKeys];
    if (keysToRemove.length) {
      try {
        await AsyncStorage.multiRemove(keysToRemove);
      } catch {
        // Ignore storage errors so requests still succeed.
      }
    }

    await AsyncStorage.setItem(key, raw);
    cacheIndex = kept;
    await persistCacheIndex(kept);
  } catch {
    // Ignore storage errors so requests still succeed.
  }
};

export const setupAxiosOfflineCache = ({
  queryClient,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
  maxEntries = DEFAULT_MAX_ENTRIES,
  maxBytes = DEFAULT_MAX_BYTES,
  maxEntryBytes = DEFAULT_MAX_ENTRY_BYTES,
  reconnectPollMs = DEFAULT_RECONNECT_POLL_MS,
}: SetupOptions) => {
  if (typeof globalThis !== 'undefined') {
    (globalThis as typeof globalThis & { __PB_READ_AXIOS_CACHE__?: typeof readCachedAxiosData })
      .__PB_READ_AXIOS_CACHE__ = readCachedAxiosData;
  }
  if (hasSetup) return;
  hasSetup = true;
  cacheSettings = { maxAgeMs, maxEntries, maxBytes, maxEntryBytes };
  void pruneCacheIndex(maxAgeMs, maxEntries, maxBytes);

  let isOffline = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let isRefetchingAll = false;

  const stopReconnectPolling = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const startReconnectPolling = () => {
    if (reconnectTimer) return;
    const poll = async () => {
      if (!isOffline) {
        reconnectTimer = null;
        return;
      }
      isRefetchingAll = true;
      try {
        await queryClient.refetchQueries({ type: 'all' });
      } finally {
        isRefetchingAll = false;
      }
      if (isOffline) {
        reconnectTimer = setTimeout(poll, reconnectPollMs);
      } else {
        reconnectTimer = null;
      }
    };
    reconnectTimer = setTimeout(poll, reconnectPollMs);
  };

  const handleBackOnline = () => {
    if (!isOffline) return;
    isOffline = false;
    stopReconnectPolling();
    if (!isRefetchingAll) {
      void queryClient.refetchQueries({ type: 'all' });
    }
  };

  axios.interceptors.response.use(
    response => {
      if (shouldCacheResponse(response)) {
        const cacheKey = getCacheKey(response.config);
        if (cacheKey) {
          void writeCacheEntry(cacheKey, {
            timestamp: Date.now(),
            data: response.data,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers as Record<string, string>,
          });
        }
      }
      handleBackOnline();
      return response;
    },
    async error => {
      if (isNetworkError(error) && shouldCacheRequest(error.config)) {
        isOffline = true;
        startReconnectPolling();
        const cacheKey = error.config ? getCacheKey(error.config) : null;
        if (cacheKey) {
          const cached = await readCacheEntry(cacheKey, maxAgeMs);
          if (cached) {
            return Promise.resolve({
              data: cached.data,
              status: cached.status ?? 200,
              statusText: cached.statusText ?? 'OK',
              headers: cached.headers ?? {},
              config: error.config,
              request: error.request,
            } as AxiosResponse);
          }
        }
      }
      return Promise.reject(error);
    },
  );
};
