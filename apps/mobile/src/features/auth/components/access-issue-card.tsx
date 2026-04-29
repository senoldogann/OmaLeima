import { Pressable, StyleSheet, Text } from "react-native";

import { InfoCard } from "@/components/info-card";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles } from "@/features/preferences/ui-preferences-provider";

type AccessIssueCardProps = {
  title: string;
  detail: string;
  retryLabel: string | null;
  onRetry: (() => void) | null;
};

export const AccessIssueCard = ({
  title,
  detail,
  retryLabel,
  onRetry,
}: AccessIssueCardProps) => {
  const styles = useThemeStyles(createStyles);

  return (
    <InfoCard eyebrow="Access" title={title}>
      <Text selectable style={styles.bodyText}>
        {detail}
      </Text>
      {retryLabel !== null && onRetry !== null ? (
        <Pressable onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>{retryLabel}</Text>
        </Pressable>
      ) : null}
      <SignOutButton />
    </InfoCard>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    bodyText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    retryButton: {
      alignItems: "center",
      backgroundColor: theme.colors.actionPrimary,
      borderRadius: 8,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    retryButtonText: {
      color: theme.colors.screenBase,
      fontSize: 14,
      fontWeight: "700",
    },
  });
