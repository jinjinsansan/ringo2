"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type UserRecord = {
  id: string;
  status: string;
  tos_agreed: boolean;
  guide_checked: boolean;
  wishlist_url: string | null;
  exemption_tickets_bronze: number;
  exemption_tickets_silver: number;
  exemption_tickets_gold: number;
  exemption_tickets_red: number;
  total_exemption_tickets: number;
  can_use_ticket: boolean;
  referral_code?: string | null;
  referral_count?: number | null;
  referral_bonus_level?: number | null;
  referred_by?: string | null;
};

type UserContextValue = {
  user: UserRecord | null;
  loading: boolean;
  refresh: () => Promise<void>;
  sessionEmail: string | null;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const claimingReferralRef = useRef(false);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setUser(null);
      setSessionEmail(null);
      setLoading(false);
      return;
    }

    setSessionEmail(session.user.email ?? null);

    const loadRecord = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error || !data) {
        // 行がない場合は作成して再取得
        await supabase.from("users").upsert({ id: session.user.id }).select();
        const { data: retryData } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setUser((retryData as UserRecord | null) ?? null);
      } else {
        setUser(data as UserRecord);
      }
      setLoading(false);
    };

    await loadRecord();
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!mounted) return;
      await fetchUser();
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (!mounted) return;
      fetchUser();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUser]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) return;
    const pendingCode = window.localStorage.getItem("rk_pending_referral_code");
    if (!pendingCode) return;
    if (user.referred_by) {
      window.localStorage.removeItem("rk_pending_referral_code");
      return;
    }
    if (claimingReferralRef.current) return;
    claimingReferralRef.current = true;

    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          claimingReferralRef.current = false;
          return;
        }

        const res = await fetch("/api/referrals/claim", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ referralCode: pendingCode }),
        });

        if (res.ok) {
          window.localStorage.removeItem("rk_pending_referral_code");
          await fetchUser();
        } else {
          window.localStorage.removeItem("rk_pending_referral_code");
        }
      } finally {
        claimingReferralRef.current = false;
      }
    })();
  }, [user, fetchUser]);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        refresh: fetchUser,
        sessionEmail,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
