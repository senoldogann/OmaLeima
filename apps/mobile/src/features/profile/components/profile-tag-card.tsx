import { Pressable, StyleSheet, Text, View } from "react-native";

import { StatusBadge } from "@/components/status-badge";
import { interactiveSurfaceShadowStyle, mobileTheme } from "@/features/foundation/theme";
import type { StudentProfileTag } from "@/features/profile/types";

type ProfileTagCardProps = {
  tag: StudentProfileTag;
  isBusy: boolean;
  onSetPrimary: (tag: StudentProfileTag) => void;
  onRemove: (tag: StudentProfileTag) => void;
};

const createSourceLabel = (tag: StudentProfileTag): string => (tag.isOfficial ? "official" : "custom");

const createMetaLabel = (tag: StudentProfileTag): string => {
  const locationParts = [tag.universityName, tag.city].filter((part): part is string => part !== null && part.length > 0);

  if (locationParts.length === 0) {
    return tag.slug;
  }

  return `${locationParts.join(" · ")} · ${tag.slug}`;
};

export const ProfileTagCard = ({ tag, isBusy, onSetPrimary, onRemove }: ProfileTagCardProps) => (
  <View style={styles.card}>
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text selectable style={styles.title}>
          {tag.title}
        </Text>
        <Text selectable style={styles.meta}>
          {createMetaLabel(tag)}
        </Text>
      </View>
      <View style={styles.badges}>
        {tag.isPrimary ? <StatusBadge label="primary" state="ready" /> : null}
        <StatusBadge label={createSourceLabel(tag)} state={tag.isOfficial ? "loading" : "pending"} />
      </View>
    </View>

    <View style={styles.actions}>
      <Pressable
        disabled={isBusy || tag.isPrimary}
        onPress={() => onSetPrimary(tag)}
        style={[styles.secondaryButton, isBusy || tag.isPrimary ? styles.disabledButton : null]}
      >
        <Text style={styles.secondaryButtonText}>{tag.isPrimary ? "Primary tag" : "Set as primary"}</Text>
      </Pressable>
      <Pressable
        disabled={isBusy}
        onPress={() => onRemove(tag)}
        style={[styles.removeButton, isBusy ? styles.disabledButton : null]}
      >
        <Text style={styles.removeButtonText}>Remove</Text>
      </Pressable>
    </View>
  </View>
);

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: mobileTheme.colors.cardBackgroundSoft,
    borderColor: mobileTheme.colors.cardBorder,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 16,
    ...interactiveSurfaceShadowStyle,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  meta: {
    color: mobileTheme.colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  removeButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.dangerSurface,
    borderColor: "rgba(255, 159, 138, 0.28)",
    borderRadius: mobileTheme.radius.button,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  removeButtonText: {
    color: mobileTheme.colors.accentCoral,
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.actionNeutral,
    borderColor: mobileTheme.colors.actionNeutralBorder,
    borderRadius: mobileTheme.radius.button,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  secondaryButtonText: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  title: {
    color: mobileTheme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
