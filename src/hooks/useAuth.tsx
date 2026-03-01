import { useState, useEffect, createContext, useContext } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

const isFetchError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes("failed to fetch");
};

const clearAuthCache = () => {
  Object.keys(localStorage)
    .filter((key) => key.startsWith("sb-") && key.endsWith("-auth-token"))
    .forEach((key) => localStorage.removeItem(key));
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    const loadSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (error) {
        if (isFetchError(error)) {
          clearAuthCache();
        }
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    loadSession();

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    clearAuthCache();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

