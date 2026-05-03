/**
 * Auth hook — wraps Supabase Auth for LegalGuard AI.
 * Provides user state, login, register, logout, and subscription tier.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type SubscriptionTier = "free" | "pro" | "team" | "enterprise";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  tier: SubscriptionTier;
  role: string; // lawyer | citizen | government | judge
  search_count_today: number;
  analysis_count_today: number;
}

const DEFAULT_PROFILE: Omit<UserProfile, "id" | "email"> = {
  full_name: "",
  tier: "free",
  role: "lawyer",
  search_count_today: 0,
  analysis_count_today: 0,
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) loadProfile(s.user);
        else setProfile(null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (u: User) => {
    // For now, use user metadata. Later: fetch from user_profiles table.
    setProfile({
      id: u.id,
      email: u.email ?? "",
      full_name: u.user_metadata?.full_name ?? u.email?.split("@")[0] ?? "",
      tier: (u.user_metadata?.tier as SubscriptionTier) ?? "free",
      role: (u.user_metadata?.role as string) ?? "lawyer",
      search_count_today: 0,
      analysis_count_today: 0,
    });
  };

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: "lawyer", tier: "free" } },
    });
    return { error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/private-offering` },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  return {
    user,
    session,
    profile,
    loading,
    isAuthenticated: !!user,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
  };
}
