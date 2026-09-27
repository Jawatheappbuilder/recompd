import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearCloudData, importStagedDemoData, leaveDemoData, loadCloudData, loadDemoData } from "@/lib/cloud-data";
import { fetchOrCreateProfile, saveProfile } from "@/lib/profile";
import { clearUserPreferences, defaultUserPreferences, loadUserPreferences, saveUserPreferences, setPreferencesCloudUser, type UserPreferences } from "@/lib/user-preferences";

type AuthStatus = "loading" | "signedOut" | "signedIn" | "demo" | "profileError";
type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  onboardingComplete: boolean;
  retryProfile: () => void;
  /** Persists preferences to the signed-in profile and local cache. Throws on failure. */
  commitPreferences: (preferences: UserPreferences) => Promise<void>;
  signOut: () => Promise<void>;
  finishDeletedAccount: () => Promise<void>;
  enterDemo: () => Promise<void>;
  exitDemo: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const loadedFor = useRef<string | null>(null);
  const demoRef = useRef(false);
  const recoveryRef = useRef(false);

  const loadProfile = useCallback(async (nextUser: User) => {
    setStatus("loading");
    try {
      const preferences = await fetchOrCreateProfile(nextUser.id, String(nextUser.user_metadata?.["name"] ?? ""));
      setPreferencesCloudUser(nextUser.id);
      saveUserPreferences(preferences);
      await loadCloudData(nextUser.id);
      await importStagedDemoData();
      setOnboardingComplete(preferences.onboardingComplete);
      loadedFor.current = nextUser.id;
      setStatus("signedIn");
    } catch {
      setStatus("profileError");
    }
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") recoveryRef.current = true;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (!nextUser) {
        if (demoRef.current) return;
        loadedFor.current = null;
        setPreferencesCloudUser(null);
        clearUserPreferences();
        clearCloudData();
        setOnboardingComplete(false);
        setStatus("signedOut");
        return;
      }
      if (event === "PASSWORD_RECOVERY" || recoveryRef.current) {
        setStatus("signedIn");
        if (window.location.pathname !== "/reset-password") {
          window.location.replace("/reset-password");
        }
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

  const signOut = useCallback(async () => { recoveryRef.current = false; await supabase.auth.signOut(); }, []);
  const finishDeletedAccount = useCallback(async () => {
    demoRef.current = false;
    recoveryRef.current = false;
    loadedFor.current = null;
    setUser(null);
    setPreferencesCloudUser(null);
    clearUserPreferences();
    clearCloudData();
    setOnboardingComplete(false);
    setStatus("signedOut");
    // The auth user no longer exists server-side, so only clear the local session.
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  }, []);
  const enterDemo = useCallback(async () => {
    setPreferencesCloudUser(null);
    saveUserPreferences({ ...defaultUserPreferences, name: "Alex", weeklyWorkoutTarget: 4, goals: ["Build muscle"], onboardingComplete: true, theme: "light" });
    await loadDemoData(); demoRef.current = true; setOnboardingComplete(true); setStatus("demo");
  }, []);
  const exitDemo = useCallback(() => { demoRef.current = false; leaveDemoData(); clearUserPreferences(); setOnboardingComplete(false); setStatus("signedOut"); }, []);
  const retryProfile = useCallback(() => { if (user) void loadProfile(user); }, [user, loadProfile]);

  const value = useMemo(() => ({ status, user, onboardingComplete, retryProfile, commitPreferences, signOut, finishDeletedAccount, enterDemo, exitDemo }), [status, user, onboardingComplete, retryProfile, commitPreferences, signOut, finishDeletedAccount, enterDemo, exitDemo]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
