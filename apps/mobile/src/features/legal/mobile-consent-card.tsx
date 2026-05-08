import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import type { MobileTheme } from "@/features/foundation/theme";
import type { AppLanguage } from "@/features/i18n/translations";
import { LegalLinksCard } from "@/features/legal/legal-links-card";
import { writeMobileLegalConsentAsync } from "@/features/legal/mobile-consent";
import { useAppTheme, useThemeStyles } from "@/features/preferences/ui-preferences-provider";

type MobileConsentCardProps = {
  language: AppLanguage;
  onAccepted: () => void;
};

const getConsentCopy = (language: AppLanguage) => {
  if (language === "fi") {
    return {
      action: "Hyväksyn ja jatkan",
      body:
        "OmaLeima käyttää välttämättömiä sovellus- ja laitetietoja kirjautumiseen, turvallisiin istuntoihin, QR-skannaukseen, push-ilmoituksiin, tapahtumahistoriaan ja tukipyyntöihin. Sovellus ei käytä markkinointievästeitä.",
      error: "Hyväksynnän tallennus epäonnistui. Yritä uudelleen.",
      eyebrow: "Tietosuoja",
      title: "Hyväksy tietosuoja ja käyttöehdot ennen kirjautumista",
    };
  }

  return {
    action: "Accept and continue",
    body:
      "OmaLeima uses essential app and device data for sign-in, secure sessions, QR scanning, push notifications, event history, and support requests. The app does not use marketing cookies.",
    error: "Saving the acknowledgement failed. Please try again.",
    eyebrow: "Privacy",
    title: "Accept privacy and terms before signing in",
  };
};

export const MobileConsentCard = ({ language, onAccepted }: MobileConsentCardProps) => {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const copy = getConsentCopy(language);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAcceptPress = async (): Promise<void> => {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      await writeMobileLegalConsentAsync(language);
      onAccepted();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal animationType="fade" onRequestClose={() => undefined} transparent visible>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.iconBubble}>
              <AppIcon color={theme.colors.lime} name="info" size={19} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
              <Text style={styles.title}>{copy.title}</Text>
            </View>
          </View>
          <Text style={styles.bodyText}>{copy.body}</Text>
          <LegalLinksCard language={language} />
          <Pressable
            accessibilityState={{ disabled: isSaving }}
            disabled={isSaving}
            onPress={() => void handleAcceptPress()}
            style={({ pressed }) => [
              styles.acceptButton,
              isSaving ? styles.acceptButtonDisabled : null,
              pressed ? styles.acceptButtonPressed : null,
            ]}
          >
            {isSaving ? <ActivityIndicator color={theme.colors.actionPrimaryText} size="small" /> : null}
            <Text style={styles.acceptButtonText}>{copy.action}</Text>
          </Pressable>
          {errorMessage !== null ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    acceptButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      flexDirection: "row",
      gap: 10,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    acceptButtonDisabled: {
      opacity: 0.8,
    },
    acceptButtonPressed: {
      transform: [{ translateY: 1 }, { scale: 0.992 }],
    },
    acceptButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    backdrop: {
      alignItems: "center",
      backgroundColor: theme.mode === "dark" ? "rgba(0, 0, 0, 0.66)" : "rgba(12, 16, 10, 0.42)",
      flex: 1,
      justifyContent: "center",
      padding: 20,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.body,
    },
    card: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card + 8,
      borderWidth: 1,
      gap: 16,
      maxWidth: 430,
      padding: 20,
      width: "100%",
    },
    errorText: {
      color: theme.colors.danger,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
    },
    iconBubble: {
      alignItems: "center",
      backgroundColor: theme.colors.limeSurface,
      borderRadius: 999,
      height: 38,
      justifyContent: "center",
      width: 38,
    },
    eyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.4,
      textTransform: "uppercase",
    },
    headerCopy: {
      flex: 1,
      gap: 2,
    },
    headerRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
  });
