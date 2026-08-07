/**
 * Calls to the API go through the gateway on the same origin. The browser
 * holds no token — it holds an opaque HttpOnly session cookie, and the gateway
 * attaches the bearer token on the way out.
 */

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.name = "ApiError";
  }
}

interface ProblemBody {
  status?: number;
  detail?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const body = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const problem = (body ?? {}) as ProblemBody;
    // The service states the corrective action. Pass it through rather than
    // replacing it with a generic message.
    throw new ApiError(
      response.status,
      problem.detail ?? "The request could not be completed. Try again.",
    );
  }

  return body as T;
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
};

export interface AccountView {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  enabled: boolean;
  createdAt: string;
}

export interface RoleOption {
  value: string;
  label: string;
  description: string;
}

export const identityApi = {
  listAccounts: () => api.get<{ users: AccountView[] }>("/api/identity/users"),
  listRoles: () => api.get<{ roles: RoleOption[] }>("/api/identity/roles"),
  createAccount: (input: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    temporaryPassword: string;
  }) => api.post<AccountView>("/api/identity/users", input),
  setEnabled: (id: string, enabled: boolean) =>
    api.post<{ id: string; enabled: boolean }>(
      `/api/identity/users/${encodeURIComponent(id)}/${enabled ? "enable" : "disable"}`,
    ),
};
