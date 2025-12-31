"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "rk_admin_secret";

export function useAdminSecret() {
  const [secret, setSecret] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      queueMicrotask(() => {
        setSecret(saved);
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (secret) {
      window.localStorage.setItem(STORAGE_KEY, secret);
    }
  }, [secret]);

  return { secret, setSecret } as const;
}
