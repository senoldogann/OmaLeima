import { useEffect, useRef } from "react";

import { useRegisterPushDeviceMutation } from "@/features/push/device-registration";
import { useNativePushDiagnostics } from "@/features/push/native-push-diagnostics";
import { useSession } from "@/providers/session-provider";

const canRegisterWithoutPrompt = (permissionState: string): boolean =>
  permissionState === "granted" || permissionState === "provisional";

export const PushAutoRegistrationBridge = (): null => {
  const { session } = useSession();
  const { diagnostics, refreshPushPermissionStateAsync } = useNativePushDiagnostics();
  const registerPushMutation = useRegisterPushDeviceMutation();
  const attemptedKeyRef = useRef<string | null>(null);
  const userId = session?.user.id ?? null;
  const accessToken = session?.access_token ?? "";
  const attemptKey = userId === null ? null : `${userId}:${diagnostics.permissionState}:${diagnostics.projectId ?? "no-project"}`;

  useEffect(() => {
    if (
      userId === null ||
      accessToken.length === 0 ||
      attemptKey === null ||
      attemptedKeyRef.current === attemptKey ||
      registerPushMutation.isPending ||
      !canRegisterWithoutPrompt(diagnostics.permissionState)
    ) {
      return;
    }

    attemptedKeyRef.current = attemptKey;

    void registerPushMutation
      .mutateAsync({ accessToken })
      .then(async (result) => {
        if (result.state !== "registered") {
          console.warn("push_auto_registration_not_registered", {
            backendStatus: result.backendStatus,
            state: result.state,
            status: result.status,
            userId,
          });
        }

        await refreshPushPermissionStateAsync();
      })
      .catch((error: unknown) => {
        console.warn("push_auto_registration_failed", {
          message: error instanceof Error ? error.message : String(error),
          userId,
        });
      });
  }, [
    accessToken,
    attemptKey,
    diagnostics.permissionState,
    registerPushMutation,
    refreshPushPermissionStateAsync,
    userId,
  ]);

  useEffect(() => {
    attemptedKeyRef.current = null;
  }, [userId]);

  return null;
};
