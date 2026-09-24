import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchOrCreateProfile, saveProfile } from "@/lib/profile";
import { clearUserPreferences, loadUserPreferences, saveUserPreferences, setPreferencesCloudUser, type UserPreferences } from "@/lib/user-preferences";

type AuthStatus = "loading" | "signedOut" | "signedIn" | "profileError";
type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  onboardingComplete: boolean;
  retryProfile: () => void;
  /** Persists preferences to the signed-in profile and local cache. Throws on failure. */
  commitPreferences: (preferences: UserPreferences) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const loadedFor = useRef<string | null>(null);

  const loadProfile = useCallback(async (nextUser: User) => {
    setStatus("loading");
    try {
      const preferences = await fetchOrCreateProfile(nextUser.id, String(nextUser.user_metadata?.["name"] ?? ""));
      setPreferencesCloudUser(nextUser.id);
      saveUserPreferences(preferences);
      setOnboardingComplete(preferences.onboardingComplete);
      loadedFor.current = nextUser.id;
      setStatus("signedIn");
    } catch {
      setStatus("profileError");
    }
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (!nextUser) {
        loadedFor.current = null;
        setPreferencesCloudUser(null);
        clearUserPreferences();
        setOnboardingComplete(false);
        setStatus("signedOut");
        return;
      }
      if (loadedFor.current === nextUser.id) return;
      setStatus("loading");
      setTimeout(() => void loadProfile(nextUser), 0);
    });
    const sync = () => { if (loadedFor.current) setOnboardingComplete(loadUserPreferences().onboardingComplete); };
    window.addEventListener("recomp-preferences-changed", sync);
    return () => { data.subscription.unsubscribe(); window.removeEventListener("recomp-preferences-changed", sync); };
  }, [loadProfile]);

  const commitPreferences = useCallback(async (preferences: UserPreferences) => {
    if (!user) throw new Error("Not signed in");
    await saveProfile(user.id, preferences);
    saveUserPreferences(preferences);
    setOnboardingComplete(preferences.onboardingComplete);
  }, [user]);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);
  const retryProfile = useCallback(() => { if (user) void loadProfile(user); }, [user, loadProfile]);

  const value = useMemo(() => ({ status, user, onboardingComplete, retryProfile, commitPreferences, signOut }), [status, user, onboardingComplete, retryProfile, commitPreferences, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
