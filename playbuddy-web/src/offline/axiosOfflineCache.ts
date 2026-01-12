import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
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
};

const CACHE_PREFIX = 'playbuddy:http-cache:';
const DEFAULT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

let hasSetup = false;

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

const readCacheEntry = (key: string, maxAgeMs: number): CacheEntry | null => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.timestamp > maxAgeMs) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeCacheEntry = (key: string, entry: CacheEntry): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore storage errors so requests still succeed.
  }
};

export const setupAxiosOfflineCache = ({
  queryClient,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
}: SetupOptions) => {
  if (hasSetup) return;
  hasSetup = true;

  let isOffline = false;

  const handleBackOnline = () => {
    if (!isOffline) return;
    isOffline = false;
    void queryClient.refetchQueries({ type: 'all' });
  };

  axios.interceptors.response.use(
    response => {
      if (shouldCacheResponse(response)) {
        const cacheKey = getCacheKey(response.config);
        if (cacheKey) {
          writeCacheEntry(cacheKey, {
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
        const cacheKey = error.config ? getCacheKey(error.config) : null;
        if (cacheKey) {
          const cached = readCacheEntry(cacheKey, maxAgeMs);
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
