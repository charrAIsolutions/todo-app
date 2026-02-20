import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { storage } from "@/lib/storage";
import type { AuthContextValue } from "@/types/auth";

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    supabase()
      .auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setIsLoading(false);
      });

    // Listen for auth state changes (token refresh, sign in/out)
    const {
      data: { subscription },
    } = supabase().auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase().auth.signUp({ email, password });
    if (error) throw error;
    // If email confirmation is enabled, session will be null until confirmed
    if (!data.session) {
      return "confirmation_required" as const;
    }
    return "signed_in" as const;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase().auth.signOut({ scope: "local" });
    if (error) {
      // Sign-out failed (network error) — clear local session but keep
      // AsyncStorage cache so data is recoverable on next sign-in
      console.warn("Sign-out API call failed, clearing local session:", error);
    }
    // Only clear app data if sign-out succeeded (no error)
    if (!error) {
      await storage.clearAppData();
    }
  }, []);

  const user: User | null = session?.user ?? null;

  return (
    <AuthContext.Provider
      value={{ session, user, isLoading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
