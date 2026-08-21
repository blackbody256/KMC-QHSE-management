import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Roles as the Keycloak realm names them.
 *
 * The browser reads roles to decide what to render. It does not decide what is
 * permitted. Every service checks the token again at the handler and once
 * more in the service layer. Hiding a control the caller may not use is a
 * courtesy; refusing the request is the control.
 */
export type Role = "hwms-officer" | "hwms-manager" | "hwms-director";

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  roles: Role[];
}

interface SessionState {
  status: "loading" | "authenticated" | "anonymous";
  user: User | null;
  idleTimeoutSeconds: number;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

interface SessionResponse {
  authenticated: boolean;
  user?: {
    id: string;
    username: string;
    name: string;
    email: string;
    roles: Role[];
  };
  idleTimeoutSeconds?: number;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionState["status"]>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [idleTimeoutSeconds, setIdleTimeoutSeconds] = useState(1800);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/auth/session", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        setStatus("anonymous");
        setUser(null);
        return;
      }
      const body: SessionResponse = await response.json();
      if (!body.authenticated || !body.user) {
        setStatus("anonymous");
        setUser(null);
        return;
      }
      setUser({
        id: body.user.id,
        username: body.user.username,
        name: body.user.name || body.user.username,
        email: body.user.email,
        roles: body.user.roles ?? [],
      });
      setIdleTimeoutSeconds(body.idleTimeoutSeconds ?? 1800);
      setStatus("authenticated");
    } catch {
      // A network failure is not the same as being signed out, but the
      // application cannot tell the difference from here and the safe reading
      // is the restrictive one.
      setStatus("anonymous");
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      const response = await fetch("/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const body = (await response.json()) as { redirectTo?: string };
      setUser(null);
      setStatus("anonymous");
      window.location.href = body.redirectTo ?? "/login";
    } catch {
      window.location.href = "/login";
    }
  }, []);

  const value = useMemo(
    () => ({ status, user, idleTimeoutSeconds, signOut, refresh }),
    [status, user, idleTimeoutSeconds, signOut, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used within a SessionProvider");
  return value;
}

/** The single role this system treats as the account's role. */
export function primaryRole(user: User | null): Role | null {
  if (!user) return null;
  const order: Role[] = ["hwms-officer", "hwms-manager", "hwms-director"];
  return order.find((role) => user.roles.includes(role)) ?? null;
}

export const roleLabels: Record<Role, string> = {
  "hwms-officer": "Health and Wellness Officer",
  "hwms-manager": "Manager",
  "hwms-director": "Director",
};
