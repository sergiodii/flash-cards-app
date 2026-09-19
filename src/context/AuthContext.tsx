import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getSupabase } from "../lib/supabase";
import {
  signInWithPassword,
  signOut as signOutRequest,
  signUpWithPassword,
} from "../services/auth";

export interface AuthState {
  session: Session | null;
  user: User | null;
  /** True while the persisted session is being restored on cold start. */
  initializing: boolean;
  /** Set when Supabase itself could not be reached/configured. */
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | undefined;

    const bootstrap = async () => {
      try {
        const supabase = getSupabase();
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setSession(data.session);

        const listener = supabase.auth.onAuthStateChange((_event, next) => {
          if (!active) return;
          setSession(next);
          setInitializing(false);
        });
        subscription = listener.data.subscription;
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (active) setInitializing(false);
      }
    };

    void bootstrap();

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      initializing,
      error,
      signIn: signInWithPassword,
      signUp: signUpWithPassword,
      signOut: signOutRequest,
    }),
    [session, initializing, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
