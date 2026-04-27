import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { InfoCard } from "@/components/info-card";
import { FoundationStatusCard } from "@/features/foundation/components/foundation-status-card";
import { preparePushTokenAsync } from "@/lib/push";
import { useSession } from "@/providers/session-provider";
import type { PushPreparationResult } from "@/types/app";

export default function StudentProfileScreen() {
  const { bootstrapError, session } = useSession();
  const [pushState, setPushState] = useState<PushPreparationResult | null>(null);

  const handlePreparePushPress = async (): Promise<void> => {
    const result = await preparePushTokenAsync();
    setPushState(result);
  };

  return (
    <AppScreen>
      <InfoCard eyebrow="Student" title="Profile and notifications shell">
        <Text style={styles.bodyText}>
          Profile tags, account state, and notification setup will live here. The button below already exercises the native push preparation helper for this device.
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
        ]}
      />

      <InfoCard eyebrow="Push" title="Notification readiness">
        <Text style={styles.bodyText}>
          This prepares the Expo push token locally. Registering that token with the backend stays for the next mobile notification slice.
        </Text>
        <Pressable style={styles.primaryButton} onPress={handlePreparePushPress}>
          <Text style={styles.primaryButtonText}>Prepare push on this device</Text>
        </Pressable>
      </InfoCard>

      {pushState ? (
        <FoundationStatusCard
          eyebrow="Result"
          title="Last push preparation result"
          items={[
            {
              label: "Status",
              value: pushState.detail,
              state:
                pushState.status === "granted"
                  ? "ready"
                  : pushState.status === "denied"
                    ? "warning"
                    : "pending",
            },
            {
              label: "Expo token",
              value: pushState.expoPushToken ?? "No token produced in this run.",
              state: pushState.expoPushToken ? "ready" : "pending",
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
