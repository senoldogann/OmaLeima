import { Pressable, StyleSheet, Text, View } from "react-native";

import { StatusBadge } from "@/components/status-badge";
import type { MobileTheme } from "@/features/foundation/theme";
import { interactiveSurfaceShadowStyle } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import type { StudentProfileTag } from "@/features/profile/types";

type ProfileTagCardProps = {
  tag: StudentProfileTag;
  isBusy: boolean;
  onSetPrimary: (tag: StudentProfileTag) => void;
  onRemove: (tag: StudentProfileTag) => void;
};

const createSourceLabel = (tag: StudentProfileTag, language: "fi" | "en"): string =>
  tag.isOfficial ? (language === "fi" ? "virallinen" : "official") : language === "fi" ? "oma" : "custom";

const createMetaLabel = (tag: StudentProfileTag): string => {
  const locationParts = [tag.universityName, tag.city].filter((part): part is string => part !== null && part.length > 0);

  if (locationParts.length === 0) {
    return tag.slug;
  }

  return `${locationParts.join(" · ")} · ${tag.slug}`;
};

export const ProfileTagCard = ({ tag, isBusy, onSetPrimary, onRemove }: ProfileTagCardProps) => {
  const { language } = useUiPreferences();
  const styles = useThemeStyles(createStyles);

  return (
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
        {tag.isPrimary ? <StatusBadge label={language === "fi" ? "aktiivinen" : "active"} state="ready" /> : null}
        <StatusBadge label={createSourceLabel(tag, language)} state={tag.isOfficial ? "loading" : "pending"} />
      </View>
    </View>

    <View style={styles.actions}>
      <Pressable
        disabled={isBusy || tag.isPrimary}
        onPress={() => onSetPrimary(tag)}
        style={[styles.secondaryButton, isBusy || tag.isPrimary ? styles.disabledButton : null]}
      >
        <Text style={styles.secondaryButtonText}>
          {tag.isPrimary
            ? language === "fi"
              ? "Aktiivinen"
              : "Active"
            : language === "fi"
              ? "Aseta aktiiviseksi"
              : "Set active"}
        </Text>
      </Pressable>
      <Pressable
        disabled={isBusy}
        onPress={() => onRemove(tag)}
        style={[styles.removeButton, isBusy ? styles.disabledButton : null]}
      >
        <Text style={styles.removeButtonText}>{language === "fi" ? "Poista" : "Remove"}</Text>
      </Pressable>
    </View>
  </View>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: theme.colors.surfaceL2,
    borderRadius: theme.radius.card,
    gap: 12,
    padding: 14,
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
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 17,
  },
  removeButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceL3,
    borderRadius: theme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  removeButtonText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.actionNeutral,
    borderRadius: theme.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
