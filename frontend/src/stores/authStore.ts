import { User } from "@/types/auth";

let currentUser: User | null = null;
const listeners = new Set<() => void>();

export const authStore = {
  getToken: () => localStorage.getItem("token"),

  setToken: (token: string) => {
    localStorage.setItem("token", token);
    listeners.forEach((fn) => fn());
  },

  clearToken: () => {
    localStorage.removeItem("token");
    currentUser = null;
    listeners.forEach((fn) => fn());
  },

  getUser: () => currentUser,
  setUser: (user: User) => {
    currentUser = user;
    listeners.forEach((fn) => fn());
  },

  isAuthenticated: () => !!localStorage.getItem("token"),

  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
