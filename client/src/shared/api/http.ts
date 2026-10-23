export class ApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); this.name = "ApiError"; }
}

let csrf = "";
let csrfRequest: Promise<string> | undefined;

async function readProblem(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => undefined);
  if (typeof body === "object" && body !== null && "detail" in body && typeof body.detail === "string") return body.detail;
  if (response.status === 401) return "Please sign in.";
  if (response.status === 429) return "Too many attempts. Wait a minute and retry.";
  return "Request failed. Reload and retry.";
}

async function requestCsrf(): Promise<string> {
  if (!csrfRequest) {
    csrfRequest = fetch("/api/auth/csrf", { credentials: "same-origin" }).then(async response => {
      if (!response.ok) throw new ApiError(response.status, await readProblem(response));
      const body: unknown = await response.json();
      if (typeof body !== "object" || body === null || !("token" in body) || typeof body.token !== "string") throw new ApiError(500, "Security token unavailable. Reload and retry.");
      csrf = body.token;
      return csrf;
    }).finally(() => { csrfRequest = undefined; });
  }
  return csrfRequest;
}

export async function api(path: string, method = "GET", body?: unknown): Promise<unknown> {
  return request(path, method, body);
}

export async function apiParsed<T>(
  path: string,
  parse: (value: unknown) => T,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const value = await request(path, method, body);
  try {
    return parse(value);
  } catch {
    throw new ApiError(502, "Server returned an invalid response.");
  }
}

async function request(path: string, method: string, body?: unknown): Promise<unknown> {
  const mutation = method !== "GET" && method !== "HEAD";
  const token = mutation ? (csrf || await requestCsrf()) : undefined;
  const response = await fetch(`/api${path}`, { method, credentials: "same-origin", headers: { "Content-Type": "application/json", ...(token ? { "X-CSRF-TOKEN": token } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
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
    throw new ApiError(502, "Server returned invalid JSON.");
  }
}

export function resetCsrf() { csrf = ""; csrfRequest = undefined; }
