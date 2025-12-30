"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
};

type UserContextValue = {
  user: UserRecord | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setUser(null);
      setLoading(false);
      return;
    }

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
  };

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
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        refresh: fetchUser,
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
