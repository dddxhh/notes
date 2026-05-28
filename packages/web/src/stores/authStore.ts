import { create } from "zustand";

interface User {
  username: string;
}

interface AuthStoreState {
  user: User | null;
}

export const useAuthStore = create<AuthStoreState>()(() => ({
  user: null,
}));
