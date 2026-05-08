import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { RealtimePostgresChangesPayload, Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

type SessionContextValue = {
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  bootstrapError: string | null;
};

type ProfileStatusPayload = {
  id: string;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
};

const isInactiveProfileStatusPayload = (
  payload: RealtimePostgresChangesPayload<ProfileStatusPayload>
): boolean => {
  const nextProfile = payload.new;

  if (typeof nextProfile !== "object" || nextProfile === null || !("status" in nextProfile)) {
    return false;
  }

  return nextProfile.status !== "ACTIVE";
};

const isInvalidRefreshTokenError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("Invalid Refresh Token") || error.message.includes("Refresh Token Not Found");
};

const clearLocalAuthSessionAsync = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error !== null && !isInvalidRefreshTokenError(error)) {
    throw error;
  }
};

const SessionContext = createContext<SessionContextValue | null>(null);

export const SessionProvider = ({ children }: PropsWithChildren) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const bootstrapSessionAsync = async (): Promise<void> => {
      let sessionResult: Awaited<ReturnType<typeof supabase.auth.getSession>>;

      try {
        sessionResult = await supabase.auth.getSession();
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }

        if (isInvalidRefreshTokenError(error)) {
          await clearLocalAuthSessionAsync();
          setSession(null);
          setBootstrapError(null);
          setIsLoading(false);
          return;
        }

        throw error;
      }

      if (!isActive) {
        return;
      }

      const { data, error } = sessionResult;

      if (error !== null) {
        if (isInvalidRefreshTokenError(error)) {
          await clearLocalAuthSessionAsync();
          setSession(null);
          setBootstrapError(null);
          setIsLoading(false);
          return;
        }

        setBootstrapError(error.message);
        setIsLoading(false);
        return;
      }

      setSession(data.session);
      setIsLoading(false);
    };

    void bootstrapSessionAsync();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isActive) {
        return;
      }

      setSession(nextSession);
      setBootstrapError(null);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user.id;

    if (typeof userId !== "string") {
      return;
    }

    let isActive = true;
    const handleProfileStatusUpdate = (
      payload: RealtimePostgresChangesPayload<ProfileStatusPayload>
    ): void => {
      if (!isInactiveProfileStatusPayload(payload)) {
        return;
      }

      setSession(null);
      void clearLocalAuthSessionAsync().catch((error: unknown) => {
        if (!isActive || isInvalidRefreshTokenError(error)) {
          return;
        }

        const message = error instanceof Error ? error.message : "Failed to clear local session.";
        setBootstrapError(message);
      });
    };
    const channel = supabase
      .channel(`profile-status:${userId}`)
      .on<ProfileStatusPayload>(
        "postgres_changes",
        {
          event: "UPDATE",
          filter: `id=eq.${userId}`,
          schema: "public",
          table: "profiles",
        },
        handleProfileStatusUpdate
      )
      .subscribe();

    return () => {
      isActive = false;
      void supabase.removeChannel(channel);
    };
  }, [session?.user.id]);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      isAuthenticated: session !== null,
      isLoading,
      bootstrapError,
    }),
    [bootstrapError, isLoading, session]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = (): SessionContextValue => {
  const value = useContext(SessionContext);

  if (value === null) {
    throw new Error("useSession must be used inside SessionProvider.");
  }

  return value;
};
