import { Pressable, StyleSheet, Text } from "react-native";

import { InfoCard } from "@/components/info-card";
import { SignOutButton } from "@/features/auth/components/sign-out-button";

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
}: AccessIssueCardProps) => (
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

const styles = StyleSheet.create({
  bodyText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: "#1D4ED8",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
  },
});
