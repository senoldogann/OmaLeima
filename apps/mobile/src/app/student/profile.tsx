import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { FoundationStatusCard } from "@/features/foundation/components/foundation-status-card";
import {
  useRegisterPushDeviceMutation,
  type PushDeviceRegistrationResult,
} from "@/features/push/device-registration";
import { useSession } from "@/providers/session-provider";
import type { AppReadinessState } from "@/types/app";

const mapPushResultState = (state: PushDeviceRegistrationResult["state"]): AppReadinessState => {
  switch (state) {
    case "registered":
      return "ready";
    case "denied":
      return "warning";
    case "misconfigured":
      return "error";
    case "error":
      return "error";
    case "granted":
      return "ready";
    case "unavailable":
      return "pending";
  }
};

export default function StudentProfileScreen() {
  const { bootstrapError, session } = useSession();
  const [pushState, setPushState] = useState<PushDeviceRegistrationResult | null>(null);
  const registerPushMutation = useRegisterPushDeviceMutation();

  const handleRegisterPushPress = async (): Promise<void> => {
    const result = await registerPushMutation.mutateAsync({
      accessToken: session?.access_token ?? "",
    });
    setPushState(result);
  };

  return (
    <AppScreen>
      <InfoCard eyebrow="Student" title="Profile and notifications shell">
        <Text style={styles.bodyText}>
          Profile tags and account state will keep growing here. This slice turns notification setup into a real backend registration flow for the current device.
        </Text>
      </InfoCard>

      <FoundationStatusCard
        eyebrow="Session"
        title="Auth bootstrap state"
        items={[
          {
            label: "Persisted session",
            value: session?.user.email ?? bootstrapError ?? "No user session yet.",
            state: session ? "ready" : bootstrapError ? "error" : "pending",
          },
          {
            label: "Department tags",
            value: "Planned after the schema foundation branch lands.",
            state: "pending",
          },
          {
            label: "Push backend",
            value: "register-device-token is already merged and ready for student device enrollment.",
            state: "ready",
          },
        ]}
      />

      <InfoCard eyebrow="Account" title="Session actions">
        <Text style={styles.bodyText}>
          Signing out should clear the local Supabase session and return the app to the Google login screen through the student route guard.
        </Text>
        <SignOutButton />
      </InfoCard>

      <InfoCard eyebrow="Push" title="Notification readiness">
        <Text style={styles.bodyText}>
          Enable notifications on a physical device to request permission, obtain the Expo push token, and register it with the backend for this signed-in student.
        </Text>
        <Text style={styles.metaText}>
          Expo Go is not enough for remote push testing on SDK 53 and later. Use a development build on a physical device for the full path.
        </Text>
        <Pressable
          style={[styles.primaryButton, registerPushMutation.isPending ? styles.disabledButton : null]}
          onPress={handleRegisterPushPress}
          disabled={registerPushMutation.isPending}
        >
          <Text style={styles.primaryButtonText}>
            {registerPushMutation.isPending ? "Enabling notifications..." : "Enable notifications on this device"}
          </Text>
        </Pressable>
      </InfoCard>

      {pushState ? (
        <FoundationStatusCard
          eyebrow="Result"
          title="Last notification registration result"
          items={[
            {
              label: "Device state",
              value: pushState.detail,
              state: mapPushResultState(pushState.state),
            },
            {
              label: "Expo token",
              value: pushState.expoPushToken ?? "No token produced in this run.",
              state: pushState.expoPushToken ? "ready" : "pending",
            },
            {
              label: "Backend registration",
              value:
                pushState.backendDeviceTokenId === null
                  ? pushState.backendStatus ?? "Token was not registered with the backend in this run."
                  : `Device token stored as ${pushState.backendDeviceTokenId}.`,
              state: pushState.backendDeviceTokenId === null ? mapPushResultState(pushState.state) : "ready",
            },
          ]}
        />
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  bodyText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
  disabledButton: {
    opacity: 0.7,
  },
  metaText: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    borderRadius: 8,
    backgroundColor: "#1D4ED8",
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
});
