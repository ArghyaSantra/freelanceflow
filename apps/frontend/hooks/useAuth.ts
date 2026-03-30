import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, Workspace, Member } from "@/types";
import { authApi } from "@/lib/api";
import Cookies from "js-cookie";

interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  member: Member | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    workspaceName: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  setAuth: (
    user: User,
    workspace: Workspace,
    member: Member,
    token: string,
  ) => void;
  clearAuth: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      workspace: null,
      member: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login({ email, password });
          const { accessToken, user, workspace, member } = response.data;
          localStorage.setItem("accessToken", accessToken);
          // Cookies.set("accessToken", accessToken, { expires: 1 }); // 1 day
          document.cookie = `accessToken=${accessToken}; path=/; max-age=86400`;

          console.log(
            "Login successful, setting token:",
            accessToken.slice(0, 20) + "...",
          );

          set({
            user,
            workspace,
            member,
            accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (email, password, workspaceName) => {
        set({ isLoading: true });
        try {
          const response = await authApi.register({
            email,
            password,
            workspaceName,
          });
          const { accessToken, user, workspace, member } = response.data;
          localStorage.setItem("accessToken", accessToken);
          Cookies.set("accessToken", accessToken, { expires: 1 });
          set({
            user,
            workspace,
            member,
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
          await authApi.logout();
        } finally {
          localStorage.removeItem("accessToken");
          Cookies.remove("accessToken");
          set({
            user: null,
            workspace: null,
            member: null,
            accessToken: null,
            isAuthenticated: false,
          });
        }
      },

      setAuth: (user, workspace, member, token) => {
        localStorage.setItem("accessToken", token);
        set({
          user,
          workspace,
          member,
          accessToken: token,
          isAuthenticated: true,
        });
      },

      clearAuth: () => {
        localStorage.removeItem("accessToken");
        set({
          user: null,
          workspace: null,
          member: null,
          accessToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: "auth-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        user: state.user,
        workspace: state.workspace,
        member: state.member,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
