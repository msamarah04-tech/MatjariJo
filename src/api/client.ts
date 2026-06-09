export const API_BASE = import.meta.env.VITE_API_URL || '/api';

type ApiIssue = { path?: (string | number)[]; message?: string };
type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    issues?: ApiIssue[];
  };
};

// Turn a Zod validation error into a readable, field-aware message so forms can
// show *which* field is wrong instead of a generic "Validation failed".
function describeError(error: ApiErrorBody['error'], status: number): string {
  const base = error?.message || `Request failed with ${status}`;
  const issues = error?.issues;
  if (!Array.isArray(issues) || issues.length === 0) return base;
  const detail = issues.slice(0, 4).map((issue) => {
    const field = (issue.path ?? []).filter((p) => p !== '').join('.') || 'field';
    return `${field}: ${issue.message ?? 'invalid'}`;
  }).join('; ');
  return `${base} — ${detail}`;
}

let tokenProvider: (() => string | null | undefined) | null = null;
let unauthorizedHandler: (() => void) | null = null;
// Returns a fresh access token (or null if the session can't be refreshed).
let refreshHandler: (() => Promise<string | null>) | null = null;
// De-duplicate concurrent refreshes into a single in-flight request.
let refreshInFlight: Promise<string | null> | null = null;

export function configureApiClient(options: {
  getToken?: () => string | null | undefined;
  onUnauthorized?: () => void;
  onRefresh?: () => Promise<string | null>;
}) {
  tokenProvider = options.getToken ?? tokenProvider;
  unauthorizedHandler = options.onUnauthorized ?? unauthorizedHandler;
  refreshHandler = options.onRefresh ?? refreshHandler;
}

function runRefresh(): Promise<string | null> {
  if (!refreshHandler) return Promise.resolve(null);
  if (!refreshInFlight) {
    refreshInFlight = refreshHandler().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

const parseBody = async (response: Response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const withQuery = (path: string, query?: Record<string, string | number | boolean | undefined | null>) => {
  if (!query) return path;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const serialized = params.toString();
  return serialized ? `${path}${path.includes('?') ? '&' : '?'}${serialized}` : path;
};

export async function apiFetch<T>(
  path: string,
  options: RequestInit & {
    token?: string | null;
    query?: Record<string, string | number | boolean | undefined | null>;
    // The refresh call itself must not recurse into the refresh-on-401 path.
    skipAuthRefresh?: boolean;
  } = {},
): Promise<T> {
  const send = async (overrideToken?: string | null) => {
    const headers = new Headers(options.headers);
    if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
    const token = overrideToken ?? options.token ?? tokenProvider?.();
    if (token) headers.set('authorization', `Bearer ${token}`);
    return fetch(`${API_BASE}${withQuery(path, options.query)}`, { ...options, headers });
  };

  let response = await send();

  // On 401, attempt a single transparent refresh, then retry the original request.
  if (response.status === 401 && !options.skipAuthRefresh && options.token == null) {
    const newToken = await runRefresh();
    if (newToken) {
      response = await send(newToken);
    }
  }

  const body = await parseBody(response);

  if (!response.ok) {
    if (response.status === 401) unauthorizedHandler?.();
    const errorBody = typeof body === 'object' && body ? (body as ApiErrorBody).error : undefined;
    throw new Error(describeError(errorBody, response.status));
  }

  return body as T;
}
