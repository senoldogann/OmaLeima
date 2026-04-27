import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

type SessionContextValue = {
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  bootstrapError: string | null;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export const SessionProvider = ({ children }: PropsWithChildren) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const bootstrapSessionAsync = async (): Promise<void> => {
      const { data, error } = await supabase.auth.getSession();

      if (!isActive) {
        return;
      }

      if (error !== null) {
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
