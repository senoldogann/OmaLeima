"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

type ProfileStatusPayload = {
  id: string;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
};

const isInactiveStatusPayload = (
  payload: RealtimePostgresChangesPayload<ProfileStatusPayload>
): boolean => {
  const nextProfile = payload.new;

  if (typeof nextProfile !== "object" || nextProfile === null || !("status" in nextProfile)) {
    return false;
  }

  return nextProfile.status !== "ACTIVE";
};

export const DashboardProfileStatusWatcher = () => {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    const subscribeAsync = async (): Promise<(() => void) | null> => {
      const userResult = await supabase.auth.getUser();

      if (!isMounted) {
        return null;
      }

      if (userResult.error !== null) {
        console.warn("[dashboard-profile-status] user lookup failed", {
          message: userResult.error.message,
        });
        return null;
      }

      const userId = userResult.data.user?.id;

      if (typeof userId !== "string") {
        return null;
      }

      const channel = supabase
        .channel(`dashboard-profile-status:${userId}`)
        .on<ProfileStatusPayload>(
          "postgres_changes",
          {
            event: "UPDATE",
            filter: `id=eq.${userId}`,
            schema: "public",
            table: "profiles",
          },
          (payload) => {
            if (!isInactiveStatusPayload(payload)) {
              return;
            }

            router.replace("/login?session=suspended");
            router.refresh();
            void supabase.auth.signOut().then((result) => {
              if (result.error !== null) {
                console.warn("[dashboard-profile-status] sign-out failed", {
                  message: result.error.message,
                  userId,
                });
              }
            });
          }
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    };

    let cleanup: (() => void) | null = null;

    void subscribeAsync().then((nextCleanup) => {
      cleanup = nextCleanup;
    });

    return () => {
      isMounted = false;

      if (cleanup !== null) {
        cleanup();
      }
    };
  }, [router]);

  return null;
};
