import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { FoundationStatusCard } from "@/features/foundation/components/foundation-status-card";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/providers/session-provider";
import type { AppReadinessState } from "@/types/app";

type CallbackState = {
  status: AppReadinessState;
  detail: string;
};

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string | string[];
    error?: string | string[];
    error_description?: string | string[];
  }>();
  const { isAuthenticated } = useSession();
  const [callbackState, setCallbackState] = useState<CallbackState>({
    status: "loading",
    detail: "Waiting for the Supabase OAuth callback.",
  });

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const code = Array.isArray(params.code) ? params.code[0] : params.code;
    const error = Array.isArray(params.error) ? params.error[0] : params.error;
    const errorDescription = Array.isArray(params.error_description)
      ? params.error_description[0]
      : params.error_description;

    if (typeof error === "string" && error.length > 0) {
      setCallbackState({
        status: "error",
        detail: errorDescription ?? error,
      });
      return;
    }

    if (typeof code !== "string" || code.length === 0) {
      setCallbackState({
        status: "warning",
        detail: "OAuth callback returned without an authorization code.",
      });
      return;
    }

    let isActive = true;

    const exchangeCodeAsync = async (): Promise<void> => {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (!isActive) {
        return;
      }

      if (exchangeError !== null) {
        setCallbackState({
          status: "error",
          detail: exchangeError.message,
        });
        return;
      }

      setCallbackState({
        status: "ready",
        detail: "OAuth sign-in completed. Redirecting to the correct mobile area.",
      });
      router.replace("/");
    };

    void exchangeCodeAsync();

    return () => {
      isActive = false;
    };
  }, [params.code, params.error, params.error_description, router]);

  return (
    <AppScreen>
      <InfoCard eyebrow="Auth" title="Completing sign-in">
        <Text selectable style={styles.bodyText}>
          OmaLeima is exchanging the returned OAuth code for a Supabase session and then resolving the correct mobile area.
        </Text>
      </InfoCard>

      <FoundationStatusCard
        eyebrow="Callback"
        title="OAuth callback status"
        items={[
          {
            label: "Result",
            value: callbackState.detail,
            state: callbackState.status,
          },
        ]}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
});
