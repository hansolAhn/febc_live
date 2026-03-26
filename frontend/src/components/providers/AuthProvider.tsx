"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as mockApi from "@/lib/mock-api";

const ACCESS_TOKEN_KEY = "febc_live_access_token";
const REFRESH_TOKEN_KEY = "febc_live_refresh_token";
const SESSION_CHECK_INTERVAL_MS = 5000;

type AuthState = {
  user: mockApi.CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: mockApi.LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<mockApi.CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function clearSession() {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    setUser(null);
  }

  async function validateCurrentSession() {
    const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await mockApi.fetchCurrentUser(token);
      setUser(currentUser);
    } catch {
      clearSession();
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void validateCurrentSession();

    const intervalId = window.setInterval(() => {
      void validateCurrentSession();
    }, SESSION_CHECK_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void validateCurrentSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const value = useMemo<AuthState>(() => ({
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    async login(payload) {
      const response = await mockApi.login(payload);
      window.localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
      window.localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
      setUser(response.user);
      setIsLoading(false);
    },
    async logout() {
      const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);

      try {
        if (token) {
          await mockApi.logout(token);
        }
      } catch {
        // Ignore logout API failures and clear the local session anyway.
      } finally {
        clearSession();
        setIsLoading(false);
      }
    }
  }), [isLoading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
