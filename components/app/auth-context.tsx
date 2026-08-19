"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PrivyProvider, useLogin, usePrivy } from "@privy-io/react-auth";
import type { PublicUser } from "@/lib/app/serialize";

export type SubmissionSummary = {
  id: string;
  status: string;
  createdAt: string;
  task: { id: string; title: string; priceUsdc: number };
};

export type MyTaskSummary = {
  id: string;
  title: string;
  priceUsdc: number;
  status: string;
  pendingCount: number;
};

type AppAuth = {
  configured: boolean;
  ready: boolean;
  authenticated: boolean;
  profile: PublicUser | null;
  submissions: SubmissionSummary[];
  myTasks: MyTaskSummary[];
  login: () => void;
  logout: () => Promise<void> | void;
  linkWallet: () => void;
  getToken: () => Promise<string | null>;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: PublicUser) => void;
};

const noop = () => {};

const AuthContext = createContext<AppAuth>({
  configured: false,
  ready: true,
  authenticated: false,
  profile: null,
  submissions: [],
  myTasks: [],
  login: noop,
  logout: noop,
  linkWallet: noop,
  getToken: async () => null,
  refreshProfile: async () => {},
  setProfile: noop,
});

export function useAppAuth() {
  return useContext(AuthContext);
}

function PrivyBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, logout, linkWallet, getAccessToken } =
    usePrivy();
  const { login } = useLogin();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [myTasks, setMyTasks] = useState<MyTaskSummary[]>([]);
  const syncedFor = useRef<string | null>(null);

  const getToken = useCallback(async () => {
    try {
      return await getAccessToken();
    } catch {
      return null;
    }
  }, [getAccessToken]);

  const refreshProfile = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const response = await fetch("/api/app/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const data = (await response.json()) as {
      user: PublicUser;
      submissions: SubmissionSummary[];
      myTasks: MyTaskSummary[];
    };
    setProfile(data.user);
    setSubmissions(data.submissions);
    setMyTasks(data.myTasks ?? []);
  }, [getToken]);

  const handleLogout = useCallback(async () => {
    await logout();
    syncedFor.current = null;
    setProfile(null);
    setSubmissions([]);
    setMyTasks([]);
  }, [logout]);

  // Upsert the database account per Privy session, re-syncing when the
  // linked wallet changes so the address lands in the database.
  useEffect(() => {
    if (!ready || !authenticated || !user) {
      return;
    }
    const syncKey = `${user.id}:${user.wallet?.address ?? ""}`;
    if (syncedFor.current === syncKey) return;
    syncedFor.current = syncKey;

    (async () => {
      const token = await getToken();
      if (!token) return;
      const response = await fetch("/api/app/sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email:
            user.email?.address ??
            user.google?.email ??
            user.apple?.email ??
            undefined,
          wallet: user.wallet?.address ?? undefined,
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as { user: PublicUser };
        setProfile(data.user);
      }
    })();
  }, [ready, authenticated, user, getToken]);

  return (
    <AuthContext.Provider
      value={{
        configured: true,
        ready,
        authenticated,
        profile,
        submissions,
        myTasks,
        login: () => login(),
        logout: handleLogout,
        linkWallet,
        getToken,
        refreshProfile,
        setProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AppAuthProvider({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "google", "apple", "wallet"],
        appearance: {
          theme: "light",
          accentColor: "#1a1a1a",
          logo: "/logo-utopia.png",
        },
      }}
    >
      <PrivyBridge>{children}</PrivyBridge>
    </PrivyProvider>
  );
}
