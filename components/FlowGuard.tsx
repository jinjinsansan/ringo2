"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

type Props = {
  requiredStatus: string;
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

function shouldRedirect(current?: string | null, required?: string) {
  if (!current || !required) return true;
  return current !== required;
}

export function FlowGuard({ requiredStatus, fallback = "/", children }: Props) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (shouldRedirect(user?.status, requiredStatus)) {
      // If the user is earlier in the flow, send them to the closest previous step
      const currentIndex = user ? order.indexOf(user.status) : -1;
      const requiredIndex = order.indexOf(requiredStatus);

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
  }, [loading, user, requiredStatus, fallback, router]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-[#5C4033]/80">
        読み込み中...
      </div>
    );
  }

  if (shouldRedirect(user?.status, requiredStatus)) {
    return null;
  }

  return <>{children}</>;
}
