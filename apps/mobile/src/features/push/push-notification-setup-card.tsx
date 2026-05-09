import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useRegisterPushDeviceMutation, type PushDeviceRegistrationResult } from "@/features/push/device-registration";
import { useNativePushDiagnostics } from "@/features/push/native-push-diagnostics";
import type { MobileTheme } from "@/features/foundation/theme";
import { createUserSafeErrorMessage } from "@/features/foundation/user-safe-error";
import { useSession } from "@/providers/session-provider";

type PushNotificationSetupCardProps = {
  context: "business" | "club";
};

const hasGrantedPushPermission = (permissionState: string): boolean =>
  permissionState === "granted" || permissionState === "provisional";

const createSummary = (
  language: "fi" | "en",
  context: PushNotificationSetupCardProps["context"],
  pushState: PushDeviceRegistrationResult | null,
  permissionState: string
): string => {
  if (pushState?.state === "registered") {
    return language === "fi"
      ? "Tämä laite vastaanottaa taustailmoitukset."
      : "This device is ready for background notifications.";
  }

  if (permissionState === "denied") {
    return language === "fi"
      ? "Ilmoitukset on estetty laitteen asetuksista."
      : "Notifications are blocked in device settings.";
  }

  if (permissionState === "unavailable") {
    return language === "fi"
      ? "Ilmoitukset vaativat fyysisen iOS/Android development- tai production-buildin."
      : "Notifications require a physical iOS/Android development or production build.";
  }

  if (hasGrantedPushPermission(permissionState)) {
    return language === "fi"
      ? "Ilmoituslupa on annettu. Rekisteroi tama laite, jotta taustailmoitukset voidaan toimittaa."
      : "Notification permission is granted. Register this device so background notifications can be delivered.";
  }

  if (context === "business") {
    return language === "fi"
      ? "Ota ilmoitukset käyttöön, jotta yritystiimi saa tapahtumapäivän tiedotteet ja tuen vastaukset."
      : "Enable notifications so the business team can receive event-day updates and support replies.";
  }

  return language === "fi"
    ? "Ota ilmoitukset käyttöön, jotta järjestäjä saa tiedotteet ja tuen vastaukset tähän laitteeseen."
    : "Enable notifications so organizers can receive updates and support replies on this device.";
};

const createDetail = (
  language: "fi" | "en",
  pushState: PushDeviceRegistrationResult | null,
  isPending: boolean
): string | null => {
  if (isPending) {
    return language === "fi" ? "Rekisteröidään tätä laitetta..." : "Registering this device...";
  }

  if (pushState === null || pushState.state === "registered") {
    return null;
  }

  if (language === "fi") {
    switch (pushState.state) {
      case "denied":
        return "Ilmoituslupaa ei myönnetty.";
      case "error":
        return "Laitteen ilmoitusrekisteröinti ei onnistunut. Yritä uudelleen.";
      case "granted":
        return "Ilmoituslupa on myönnetty, mutta rekisteröinti ei ole vielä valmis.";
      case "misconfigured":
        return "Ilmoitusasetukset ovat puutteelliset.";
      case "unavailable":
        return "Ilmoitukset eivät ole käytettävissä tässä ympäristössä.";
    }
  }

  switch (pushState.state) {
    case "denied":
      return "Notification permission was not granted.";
    case "error":
      return "Device notification registration failed. Try again.";
    case "granted":
      return "Permission is granted, but registration is not finished yet.";
    case "misconfigured":
      return "Notification configuration is incomplete.";
    case "unavailable":
      return "Notifications are unavailable in this runtime.";
  }
};

export const PushNotificationSetupCard = ({ context }: PushNotificationSetupCardProps) => {
  const { language, theme } = useUiPreferences();
  const styles = useThemeStyles(createStyles);
  const { session } = useSession();
  const { diagnostics, refreshPushPermissionStateAsync } = useNativePushDiagnostics();
  const registerPushMutation = useRegisterPushDeviceMutation();
  const [pushState, setPushState] = useState<PushDeviceRegistrationResult | null>(null);
  const isRegistered = pushState?.state === "registered";
  const summary = createSummary(language, context, pushState, diagnostics.permissionState);
  const detail = createDetail(language, pushState, registerPushMutation.isPending);
  const shouldShowAction = !isRegistered;
  const actionLabel = registerPushMutation.isPending
    ? language === "fi"
      ? "Valmistellaan..."
      : "Preparing..."
    : hasGrantedPushPermission(diagnostics.permissionState) && pushState === null
      ? language === "fi"
        ? "Rekisteroi tama laite"
        : "Register this device"
    : pushState?.state === "error" || pushState?.state === "misconfigured" || pushState?.state === "unavailable"
      ? language === "fi"
        ? "Yritä uudelleen"
        : "Retry setup"
      : language === "fi"
        ? "Ota ilmoitukset käyttöön"
        : "Enable notifications";

  const handleEnablePress = async (): Promise<void> => {
    try {
      const result = await registerPushMutation.mutateAsync({
        accessToken: session?.access_token ?? "",
      });

      setPushState(result);
      await refreshPushPermissionStateAsync();
    } catch (error) {
      setPushState({
        backendDeviceTokenId: null,
        backendStatus: "CLIENT_ERROR",
        detail: createUserSafeErrorMessage(error, language, "pushRegistration"),
        expoPushToken: null,
        state: "error",
        status: "misconfigured",
      });
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <AppIcon color={theme.colors.lime} name="bell" size={16} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{language === "fi" ? "Ilmoitukset" : "Notifications"}</Text>
          <Text style={styles.summary}>{summary}</Text>
          {detail !== null ? (
            <Text style={pushState?.state === "error" ? styles.errorText : styles.summary}>{detail}</Text>
          ) : null}
        </View>
        {isRegistered ? (
          <View style={styles.readyPill}>
            <Text style={styles.readyText}>{language === "fi" ? "Valmis" : "Ready"}</Text>
            <AppIcon color={theme.colors.success} name="check" size={14} />
          </View>
        ) : null}
      </View>
      {shouldShowAction ? (
        <Pressable
          disabled={registerPushMutation.isPending}
          onPress={() => void handleEnablePress()}
          style={[styles.primaryButton, registerPushMutation.isPending ? styles.disabledButton : null]}
        >
          <Text style={styles.primaryButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    card: {
      gap: 12,
    },
    copy: {
      flex: 1,
      gap: 4,
    },
    disabledButton: {
      opacity: 0.62,
    },
    errorText: {
      color: theme.colors.danger,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    header: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 12,
    },
    iconWrap: {
      alignItems: "center",
      backgroundColor: theme.colors.limeSurface,
      borderRadius: 999,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    primaryButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.extrabold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
    readyPill: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
    },
    readyText: {
      color: theme.colors.success,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    summary: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
  });
