"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clientAuthApi } from "@/lib/clientApi";
import Cookies from "js-cookie";

interface ClientUser {
  id: string;
  email: string;
}

interface ClientInfo {
  id: string;
  name: string;
  email: string;
  workspaceId: string;
}

interface ClientAuthState {
  clientUser: ClientUser | null;
  client: ClientInfo | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAuth: (user: ClientUser, client: ClientInfo, token: string) => void;
  clearAuth: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useClientAuth = create<ClientAuthState>()(
  persist(
    (set) => ({
      clientUser: null,
      client: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await clientAuthApi.login({ email, password });
          const { accessToken, user, client } = response.data;
          localStorage.setItem("clientAccessToken", accessToken);
          document.cookie = `clientAccessToken=${accessToken}; path=/; max-age=86400`;
          set({
            clientUser: user,
            client,
            accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          await clientAuthApi.logout();
        } finally {
          localStorage.removeItem("clientAccessToken");
          Cookies.remove("clientAccessToken");
          set({
            clientUser: null,
            client: null,
            accessToken: null,
            isAuthenticated: false,
          });
        }
      },

      setAuth: (clientUser, client, token) => {
        localStorage.setItem("clientAccessToken", token);
        document.cookie = `clientAccessToken=${token}; path=/; max-age=86400`;
        set({ clientUser, client, accessToken: token, isAuthenticated: true });
      },

      clearAuth: () => {
        localStorage.removeItem("clientAccessToken");
        Cookies.remove("clientAccessToken");
        set({
          clientUser: null,
          client: null,
          accessToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: "client-auth-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        clientUser: state.clientUser,
        client: state.client,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
