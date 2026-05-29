import { create } from "zustand";

interface AuthUser {
  id: string;
  username: string;
}

interface AuthState {
  user: AuthUser | null;
  serverUrl: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;

  login: (serverUrl: string, username: string, password: string) => Promise<void>;
  register: (serverUrl: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  restore: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  serverUrl: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  error: null,

  login: async (serverUrl: string, username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${serverUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Login failed");
      }
      const data = await res.json();
      sessionStorage.setItem("sync-server-url", serverUrl);
      sessionStorage.setItem("sync-token", data.accessToken);
      sessionStorage.setItem("sync-refresh-token", data.refreshToken);
      sessionStorage.setItem("sync-user", JSON.stringify(data.user));
      set({
        user: data.user,
        serverUrl,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        isLoading: false,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Login failed", isLoading: false });
      throw err;
    }
  },

  register: async (serverUrl: string, username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${serverUrl}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Registration failed");
      }
      const data = await res.json();
      sessionStorage.setItem("sync-server-url", serverUrl);
      sessionStorage.setItem("sync-token", data.accessToken);
      sessionStorage.setItem("sync-refresh-token", data.refreshToken);
      sessionStorage.setItem("sync-user", JSON.stringify(data.user));
      set({
        user: data.user,
        serverUrl,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        isLoading: false,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Registration failed", isLoading: false });
      throw err;
    }
  },

  logout: () => {
    sessionStorage.removeItem("sync-server-url");
    sessionStorage.removeItem("sync-token");
    sessionStorage.removeItem("sync-refresh-token");
    sessionStorage.removeItem("sync-user");
    set({
      user: null,
      serverUrl: null,
      accessToken: null,
      refreshToken: null,
      error: null,
    });
  },

  refresh: async () => {
    const { serverUrl, refreshToken } = get();
    if (!serverUrl || !refreshToken) return;
    try {
      const res = await fetch(`${serverUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        get().logout();
        return;
      }
      const data = await res.json();
      sessionStorage.setItem("sync-token", data.accessToken);
      set({ accessToken: data.accessToken });
    } catch {
      // silent fail, will retry on next request
    }
  },

  restore: () => {
    const serverUrl = sessionStorage.getItem("sync-server-url");
    const token = sessionStorage.getItem("sync-token");
    const refresh = sessionStorage.getItem("sync-refresh-token");
    const userJson = sessionStorage.getItem("sync-user");
    if (serverUrl && token) {
      const user = userJson ? JSON.parse(userJson) : null;
      set({ serverUrl, accessToken: token, refreshToken: refresh, user });
    }
  },
}));
