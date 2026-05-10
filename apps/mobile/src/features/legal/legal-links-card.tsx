import { useState } from "react";
import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import type { MobileTheme } from "@/features/foundation/theme";
import { useAppTheme, useThemeStyles } from "@/features/preferences/ui-preferences-provider";

type LegalLinkKind = "privacy" | "terms";

type LegalLink = {
  kind: LegalLinkKind;
  label: string;
  url: string;
};

type LegalLinksCardProps = {
  language: "fi" | "en";
};

type LegalLinksModalProps = {
  isVisible: boolean;
  language: "fi" | "en";
  onClose: () => void;
};

const createLegalLinks = (language: "fi" | "en"): LegalLink[] => {
  if (language === "fi") {
    return [
      {
        kind: "privacy",
        label: "Tietosuojaseloste",
        url: "https://omaleima.fi/privacy",
      },
      {
        kind: "terms",
        label: "Käyttöehdot",
        url: "https://omaleima.fi/terms",
      },
    ];
  }

  return [
    {
      kind: "privacy",
      label: "Privacy notice",
      url: "https://omaleima.fi/en/privacy",
    },
    {
      kind: "terms",
      label: "Terms of use",
      url: "https://omaleima.fi/en/terms",
    },
  ];
};

const openLegalUrlAsync = async (url: string): Promise<void> => {
  const canOpenUrl = await Linking.canOpenURL(url);

  if (!canOpenUrl) {
    throw new Error(`Device cannot open legal URL ${url}.`);
  }

  await Linking.openURL(url);
};

export const LegalLinksModal = ({ isVisible, language, onClose }: LegalLinksModalProps) => {
  const theme = useAppTheme();
  const styles = useThemeStyles(createStyles);
  const labels = {
    close: language === "fi" ? "Sulje" : "Close",
    eyebrow: language === "fi" ? "Tietosuoja" : "Privacy",
    title: language === "fi" ? "Tietosuoja ja käyttöehdot" : "Privacy and terms",
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={isVisible}>
      <Pressable onPress={onClose} style={styles.modalBackdrop}>
        <Pressable onPress={() => undefined} style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIcon}>
              <AppIcon color={theme.colors.lime} name="info" size={18} />
            </View>
            <View style={styles.modalHeaderCopy}>
              <Text style={styles.modalEyebrow}>{labels.eyebrow}</Text>
              <Text style={styles.modalTitle}>{labels.title}</Text>
            </View>
          </View>
          <LegalLinksCard language={language} />
          <Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed ? styles.closeButtonPressed : null]}>
            <Text style={styles.closeButtonText}>{labels.close}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export const LegalLinksCard = ({ language }: LegalLinksCardProps) => {
  const styles = useThemeStyles(createStyles);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const legalLinks = createLegalLinks(language);

  const handlePressAsync = async (url: string): Promise<void> => {
    setErrorMessage(null);

    try {
      await openLegalUrlAsync(url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `Could not open legal URL ${url}.`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.linkRow}>
        {legalLinks.map((link, index) => (
          <View key={link.kind} style={styles.linkItem}>
            {index > 0 ? <Text style={styles.divider}>·</Text> : null}
            <Pressable
              onPress={() => void handlePressAsync(link.url)}
              style={({ pressed }) => (pressed ? styles.linkPressed : undefined)}
            >
              <Text style={styles.linkText}>{link.label}</Text>
            </Pressable>
          </View>
        ))}
      </View>
      {errorMessage !== null ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      paddingBottom: 8,
      paddingHorizontal: 4,
      paddingTop: 4,
    },
    divider: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.regular,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      paddingHorizontal: 6,
    },
    errorText: {
      color: theme.colors.danger,
      fontFamily: theme.typography.families.semibold,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      marginTop: 6,
      textAlign: "center",
    },
    linkItem: {
      alignItems: "center",
      flexDirection: "row",
    },
    linkPressed: {
      opacity: 0.5,
    },
    linkRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
    },
    linkText: {
      color: theme.colors.textMuted,
      fontFamily: theme.typography.families.medium,
      fontSize: theme.typography.sizes.caption,
      lineHeight: theme.typography.lineHeights.caption,
      textDecorationLine: "underline",
    },
    closeButton: {
      alignItems: "center",
      backgroundColor: theme.colors.lime,
      borderRadius: theme.radius.button,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    closeButtonPressed: {
      opacity: 0.8,
    },
    closeButtonText: {
      color: theme.colors.actionPrimaryText,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.bodySmall,
      lineHeight: theme.typography.lineHeights.bodySmall,
    },
    modalBackdrop: {
      alignItems: "center",
      backgroundColor: theme.mode === "dark" ? "rgba(0, 0, 0, 0.66)" : "rgba(12, 16, 10, 0.42)",
      flex: 1,
      justifyContent: "center",
      padding: 20,
    },
    modalCard: {
      backgroundColor: theme.colors.surfaceL2,
      borderColor: theme.colors.borderDefault,
      borderRadius: theme.radius.card + 8,
      borderWidth: 1,
      gap: 16,
      maxWidth: 420,
      padding: 20,
      width: "100%",
    },
    modalEyebrow: {
      color: theme.colors.lime,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.eyebrow,
      letterSpacing: 1.4,
      textTransform: "uppercase",
    },
    modalHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
    },
    modalHeaderCopy: {
      flex: 1,
      gap: 2,
    },
    modalIcon: {
      alignItems: "center",
      backgroundColor: theme.colors.limeSurface,
      borderRadius: 999,
      height: 38,
      justifyContent: "center",
      width: 38,
    },
    modalTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.families.bold,
      fontSize: theme.typography.sizes.body,
      lineHeight: theme.typography.lineHeights.body,
    },
  });
