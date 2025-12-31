"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

type Props = {
  requiredStatus: string | string[];
  allowedStatus?: string | string[];
  fallback?: string; // redirect destination when not matched
  children: React.ReactNode;
};

const order = [
  "AWAITING_TOS_AGREEMENT",
  "AWAITING_GUIDE_CHECK",
  "READY_TO_PURCHASE",
  "AWAITING_APPROVAL",
  "READY_TO_REGISTER_WISHLIST",
  "READY_TO_DRAW",
  "REVEALING",
  "WAITING_FOR_FULFILLMENT",
  "CYCLE_COMPLETE",
];

function normalizeRequired(status?: string | string[]) {
  if (!status) return [];
  return Array.isArray(status) ? status : [status];
}

function isAllowedStatus(current?: string | null, requiredStatus?: string | string[], allowedStatus?: string | string[]) {
  if (!current) return false;
  const allowedStatuses = new Set<string>([...normalizeRequired(requiredStatus), ...normalizeRequired(allowedStatus)]);
  if (allowedStatuses.size === 0) return false;
  return allowedStatuses.has(current);
}

const ADMIN_BYPASS_EMAILS = new Set(["goldbenchan@gmail.com", "goldbenchan@gamil.com"]);

export function FlowGuard({ requiredStatus, allowedStatus, fallback = "/", children }: Props) {
  const { user, loading, sessionEmail } = useUser();
  const router = useRouter();
  const bypass = sessionEmail ? ADMIN_BYPASS_EMAILS.has(sessionEmail) : false;

  useEffect(() => {
    if (loading || bypass) return;

    if (!isAllowedStatus(user?.status, requiredStatus, allowedStatus)) {
      // If the user is earlier in the flow, send them to the closest previous step
      const currentIndex = user ? order.indexOf(user.status) : -1;
      const requiredIndices = normalizeRequired(requiredStatus)
        .map((status) => order.indexOf(status))
        .filter((idx) => idx >= 0);
      const requiredIndex = requiredIndices.length > 0 ? Math.min(...requiredIndices) : -1;

      if (currentIndex >= 0 && requiredIndex >= 0 && currentIndex < requiredIndex) {
        // send to current step page by simple mapping (minimal for now)
        // AWAITING_TOS_AGREEMENT -> /tos, AWAITING_GUIDE_CHECK -> /guide, else fallback
        if (user?.status === "AWAITING_TOS_AGREEMENT") {
          router.replace("/tos");
          return;
        }
        if (user?.status === "AWAITING_GUIDE_CHECK") {
          router.replace("/guide");
          return;
        }
      }

      router.replace(fallback);
    }
  }, [loading, user, requiredStatus, allowedStatus, fallback, router, bypass]);

  if (loading && !bypass) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-[#5C4033]/80">
        読み込み中...
      </div>
    );
  }

  if (!bypass && !isAllowedStatus(user?.status, requiredStatus, allowedStatus)) {
    return null;
  }

  return <>{children}</>;
}
