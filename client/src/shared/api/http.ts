type ApiErrorMessage =
  string | { key: string; params?: Record<string, unknown> };

/** Converts fetch-level network failures into a message translated at render time. */
async function fetchApi(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (cause) {
    if (cause instanceof TypeError) throw new ApiError(0, { key: 'apiFailed' });
    throw cause;
  }
}

export class ApiError extends Error {
  readonly translationKey?: string;
  readonly translationParams?: Record<string, unknown>;

  /** Keeps server details verbatim and translation keys/parameters for rendering. */
  constructor(
    readonly status: number,
    message: ApiErrorMessage,
  ) {
    super(typeof message === 'string' ? message : message.key);
    this.name = 'ApiError';
    if (typeof message !== 'string') {
      this.translationKey = message.key;
      this.translationParams = message.params;
    }
  }
}

let csrf = '';
let csrfRequest: Promise<string> | undefined;

type ApiRequestOptions =
  | { method?: 'GET' | 'HEAD'; body?: never }
  | { method: 'POST' | 'PUT' | 'DELETE'; body?: unknown };

/**
 * Returns a string problem detail when available, otherwise a status-specific translation key.
 * JSON parsing and body-reading rejections are caught and converted to fallback keys.
 */
async function readProblem(response: Response): Promise<ApiErrorMessage> {
  const body: unknown = await response.json().catch(() => undefined);
  if (
    typeof body === 'object' &&
    body !== null &&
    'detail' in body &&
    typeof body.detail === 'string'
  )
    return body.detail;
  if (response.status === 401) return { key: 'apiUnauthorized' };
  if (response.status === 429) return { key: 'apiRateLimit' };
  return { key: 'apiFailed' };
}

/**
 * Fetches and caches a CSRF token, sharing an in-flight request with concurrent callers.
 * @throws {ApiError} For unsuccessful HTTP responses or a missing/non-string token.
 * Network failures become translated `apiFailed` errors; response-reading and
 * JSON parsing errors propagate unchanged.
 */
async function requestCsrf(): Promise<string> {
  if (!csrfRequest) {
    csrfRequest = fetchApi('/api/auth/csrf', { credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok)
          throw new ApiError(response.status, await readProblem(response));
        const body: unknown = await response.json();
        if (
          typeof body !== 'object' ||
          body === null ||
          !('token' in body) ||
          typeof body.token !== 'string'
        )
          throw new ApiError(500, { key: 'apiSecurity' });
        csrf = body.token;
        return csrf;
      })
      .finally(() => {
        csrfRequest = undefined;
      });
  }
  return csrfRequest;
}

/**
 * Sends a request to `/api` with same-origin credentials and returns parsed JSON,
 * or `undefined` for an empty response. Mutations acquire and send a CSRF token.
 *
 * @param path - API path including the leading slash, without the `/api` prefix.
 * @param options - Defaults to GET; mutation bodies are JSON-serialized when supplied.
 * @throws {ApiError} For unsuccessful HTTP responses, an invalid CSRF token response,
 * or invalid JSON in the requested response. Network failures become translated
 * `apiFailed` errors; serialization, response-reading, and CSRF JSON parsing errors
 * propagate unchanged.
 */
export async function api(
  path: string,
  options: ApiRequestOptions = {},
): Promise<unknown> {
  return request(path, options);
}

/**
 * Sends a request using {@link api}'s options and response handling, then parses its result.
 *
 * @param path - API path including the leading slash, without the `/api` prefix.
 * @param parse - Synchronous parser; receives `undefined` for an empty response.
 * @returns The parser's result.
 * @throws {ApiError} With status 502 if the parser throws; the original parser error
 * is replaced. Request errors propagate unchanged, as described in {@link api}.
 */
export async function apiParsed<T>(
  path: string,
  parse: (value: unknown) => T,
  options: ApiRequestOptions = {},
): Promise<T> {
  const value = await request(path, options);
  try {
    return parse(value);
  } catch {
    throw new ApiError(502, { key: 'apiInvalidResponse' });
  }
}

/**
 * Performs the shared API request, returning parsed JSON or `undefined` for an empty body.
 * Uses same-origin credentials and a cached or newly fetched CSRF token for mutations;
 * a 400 response from the requested endpoint clears the cached token without retrying.
 *
 * @param path - Path appended to `/api`, including the leading slash.
 * @param options - Defaults to GET when no method is supplied; serializes a supplied body as JSON.
 * @throws {ApiError} For unsuccessful HTTP responses, an invalid CSRF token response,
 * or invalid JSON from the requested endpoint. Network failures become translated
 * `apiFailed` errors; serialization, response-reading, and CSRF JSON parsing errors
 * propagate unchanged.
 */
async function request(
  path: string,
  options: ApiRequestOptions,
): Promise<unknown> {
  const method = options.method ?? 'GET';
  const body = 'body' in options ? options.body : undefined;
  const mutation = method !== 'GET' && method !== 'HEAD';
  const token = mutation ? csrf || (await requestCsrf()) : undefined;
  const response = await fetchApi(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-CSRF-TOKEN': token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    if (response.status === 400) resetCsrf();
    throw new ApiError(response.status, await readProblem(response));
  }
  const text = await response.text();
  if (!text) return undefined;
  try {
    const value: unknown = JSON.parse(text);
    return value;
  } catch {
    throw new ApiError(502, { key: 'apiInvalidJson' });
  }
}

/**
 * Clears the cached CSRF token and shared request reference without canceling a fetch.
 * An already pending request can still populate the token cache when it resolves.
 */
export function resetCsrf() {
  csrf = '';
  csrfRequest = undefined;
}
