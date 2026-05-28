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
      localStorage.setItem("sync-server-url", serverUrl);
      localStorage.setItem("sync-token", data.accessToken);
      localStorage.setItem("sync-refresh-token", data.refreshToken);
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
      localStorage.setItem("sync-server-url", serverUrl);
      localStorage.setItem("sync-token", data.accessToken);
      localStorage.setItem("sync-refresh-token", data.refreshToken);
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
    localStorage.removeItem("sync-server-url");
    localStorage.removeItem("sync-token");
    localStorage.removeItem("sync-refresh-token");
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
      localStorage.setItem("sync-token", data.accessToken);
      set({ accessToken: data.accessToken });
    } catch {
      // silent fail, will retry on next request
    }
  },

  restore: () => {
    const serverUrl = localStorage.getItem("sync-server-url");
    const token = localStorage.getItem("sync-token");
    const refresh = localStorage.getItem("sync-refresh-token");
    if (serverUrl && token) {
      set({ serverUrl, accessToken: token, refreshToken: refresh });
    }
  },
}));
