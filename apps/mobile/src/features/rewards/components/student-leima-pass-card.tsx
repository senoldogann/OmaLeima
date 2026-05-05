import { StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { CoverImageSurface } from "@/components/cover-image-surface";
import type { EventVenueSummary } from "@/features/events/types";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";

type StudentLeimaPassCardProps = {
    minimumStampsRequired: number;
    venues: EventVenueSummary[];
};

type LeimaSlot = {
    key: string;
    venue: EventVenueSummary | null;
};

const compareCollectedVenues = (left: EventVenueSummary, right: EventVenueSummary): number => {
    const leftTime = left.stampedAt === null ? Number.MAX_SAFE_INTEGER : new Date(left.stampedAt).getTime();
    const rightTime = right.stampedAt === null ? Number.MAX_SAFE_INTEGER : new Date(right.stampedAt).getTime();

    if (leftTime !== rightTime) {
        return leftTime - rightTime;
    }

    return (left.venueOrder ?? Number.MAX_SAFE_INTEGER) - (right.venueOrder ?? Number.MAX_SAFE_INTEGER);
};

const createLeimaSlots = (minimumStampsRequired: number, venues: EventVenueSummary[]): LeimaSlot[] => {
    const slotCount = Math.max(minimumStampsRequired, 1);
    const collectedVenues = venues
        .filter((venue) => venue.stampStatus === "COLLECTED")
        .sort(compareCollectedVenues)
        .slice(0, slotCount);

    return Array.from({ length: slotCount }, (_, slotIndex) => ({
        key: `leima-slot:${slotIndex}`,
        venue: collectedVenues[slotIndex] ?? null,
    }));
};

export const StudentLeimaPassCard = ({ minimumStampsRequired, venues }: StudentLeimaPassCardProps) => {
    const { language, theme } = useUiPreferences();
    const styles = useThemeStyles(createStyles);
    const leimaSlots = createLeimaSlots(minimumStampsRequired, venues);
    const collectedCount = leimaSlots.filter((slot) => slot.venue !== null).length;

    return (
        <View style={styles.passCard}>
            <View style={styles.passHeader}>
                <View style={styles.passHeaderCopy}>
                    <Text style={styles.passEyebrow}>{language === "fi" ? "Leimapassi" : "Leima pass"}</Text>
                    <Text style={styles.passTitle}>
                        {collectedCount}/{leimaSlots.length} {language === "fi" ? "leimaa" : "leimas"}
                    </Text>
                </View>
                <View style={styles.passBadge}>
                    <Text style={styles.passBadgeText}>LEIMA</Text>
                </View>
            </View>

            <View style={styles.slotGrid}>
                {leimaSlots.map((slot) => {
                    const venue = slot.venue;
                    const isCollected = venue !== null;

                    return (
                        <View key={slot.key} style={[styles.slot, isCollected ? styles.slotCollected : null]}>
                            {isCollected ? (
                                <CoverImageSurface
                                    imageStyle={styles.slotLogoImage}
                                    source={venue.logoUrl === null ? null : { uri: venue.logoUrl }}
                                    style={styles.slotLogoSurface}
                                >
                                    {venue.logoUrl === null ? (
                                        <AppIcon color={theme.colors.textPrimary} name="business" size={19} />
                                    ) : null}
                                </CoverImageSurface>
                            ) : (
                                <View style={styles.slotEmptyDot} />
                            )}
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

const createStyles = (theme: MobileTheme) =>
    StyleSheet.create({
        passBadge: {
            backgroundColor: theme.colors.lime,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 7,
        },
        passBadgeText: {
            color: theme.colors.actionPrimaryText,
            fontFamily: theme.typography.families.extrabold,
            fontSize: theme.typography.sizes.caption,
            lineHeight: theme.typography.lineHeights.caption,
        },
        passCard: {
            backgroundColor: theme.colors.surfaceL2,
            borderColor: theme.colors.borderDefault,
            borderRadius: theme.radius.card,
            borderWidth: 1,
            gap: 16,
            padding: 16,
        },
        passEyebrow: {
            color: theme.colors.textMuted,
            fontFamily: theme.typography.families.bold,
            fontSize: theme.typography.sizes.eyebrow,
            lineHeight: theme.typography.lineHeights.eyebrow,
            textTransform: "uppercase",
        },
        passHeader: {
            alignItems: "center",
            flexDirection: "row",
            gap: 12,
            justifyContent: "space-between",
        },
        passHeaderCopy: {
            flex: 1,
            gap: 3,
            minWidth: 0,
        },
        passTitle: {
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.families.extrabold,
            fontSize: theme.typography.sizes.subtitle,
            lineHeight: theme.typography.lineHeights.subtitle,
        },
        slot: {
            alignItems: "center",
            backgroundColor: theme.colors.surfaceL1,
            borderColor: theme.colors.borderStrong,
            borderRadius: 999,
            borderStyle: "dashed",
            borderWidth: 1,
            height: 56,
            justifyContent: "center",
            overflow: "hidden",
            width: 56,
        },
        slotCollected: {
            backgroundColor: theme.colors.limeSurface,
            borderColor: theme.colors.limeBorder,
            borderStyle: "solid",
        },
        slotGrid: {
            alignContent: "center",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
            width: "100%",
        },
        slotLogoImage: {
            borderRadius: 999,
        },
        slotLogoSurface: {
            alignItems: "center",
            borderRadius: 999,
            height: "100%",
            justifyContent: "center",
            overflow: "hidden",
            width: "100%",
        },
        slotEmptyDot: {
            backgroundColor: theme.colors.borderStrong,
            borderRadius: 999,
            height: 8,
            width: 8,
        },
    });