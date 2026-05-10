import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { RealtimePostgresChangesPayload, Session } from "@supabase/supabase-js";

import { deviceStorage } from "@/lib/device-storage";
import { publicEnv } from "@/lib/env";
import { supabase } from "@/lib/supabase";

type SessionContextValue = {
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  bootstrapError: string | null;
  retryBootstrap: () => void;
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

const getSupabaseAuthStorageKey = (): string | null => {
  try {
    const supabaseHost = new URL(publicEnv.EXPO_PUBLIC_SUPABASE_URL).hostname;
    const projectRef = supabaseHost.split(".")[0];

    if (projectRef.length === 0) {
      return null;
    }

    return `sb-${projectRef}-auth-token`;
  } catch {
    return null;
  }
};

const deleteLocalAuthStorageFallback = async (): Promise<void> => {
  const storageKey = getSupabaseAuthStorageKey();

  if (storageKey === null) {
    return;
  }

  await deviceStorage.deleteItemAsync(storageKey);
};

const clearInvalidLocalAuthSessionAsync = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error !== null && !isInvalidRefreshTokenError(error)) {
    throw error;
  }

  await deleteLocalAuthStorageFallback();
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
  const [bootstrapAttempt, setBootstrapAttempt] = useState<number>(0);

  const retryBootstrap = useCallback((): void => {
    setSession(null);
    setBootstrapError(null);
    setIsLoading(true);
    setBootstrapAttempt((currentAttempt) => currentAttempt + 1);
  }, []);

  const reportBootstrapError = (error: unknown): void => {
    const message = error instanceof Error
      ? `Auth bootstrap failed: ${error.message}`
      : "Auth bootstrap failed: Unknown error.";

    setSession(null);
    setBootstrapError(message);
    setIsLoading(false);
  };

  useEffect(() => {
    let isActive = true;

    const clearInvalidLocalSessionAsync = async (): Promise<void> => {
      try {
        await clearInvalidLocalAuthSessionAsync();
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }

        reportBootstrapError(error);
        return;
      }

      if (!isActive) {
        return;
      }

      setSession(null);
      setBootstrapError(null);
      setIsLoading(false);
    };

    const bootstrapSessionAsync = async (): Promise<void> => {
      try {
        const sessionResult = await supabase.auth.getSession();

        if (!isActive) {
          return;
        }

        const { data, error } = sessionResult;

        if (error !== null) {
          if (isInvalidRefreshTokenError(error)) {
            await clearInvalidLocalSessionAsync();
            return;
          }

          reportBootstrapError(error);
          return;
        }

        setSession(data.session);
        setIsLoading(false);
        setBootstrapError(null);
        return;
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }

        if (isInvalidRefreshTokenError(error)) {
          await clearInvalidLocalSessionAsync();
          return;
        }

        reportBootstrapError(error);
      }
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
  }, [bootstrapAttempt]);

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
      retryBootstrap,
    }),
    [bootstrapError, isLoading, retryBootstrap, session]
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
