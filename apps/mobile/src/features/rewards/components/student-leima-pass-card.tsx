import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";

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
    const collectedVenueSlots = venues
        .filter((venue) => venue.stampStatus === "COLLECTED")
        .sort(compareCollectedVenues)
        .flatMap((venue) =>
            Array.from({ length: venue.collectedStampCount }, (_, stampIndex) => ({
                key: `${venue.id}:stamp:${stampIndex}`,
                venue,
            }))
        )
        .slice(0, slotCount);

    return Array.from({ length: slotCount }, (_, slotIndex) => ({
        key: collectedVenueSlots[slotIndex]?.key ?? `leima-slot:${slotIndex}`,
        venue: collectedVenueSlots[slotIndex]?.venue ?? null,
    }));
};

export const StudentLeimaPassCard = ({ minimumStampsRequired, venues }: StudentLeimaPassCardProps) => {
    const { language, localeTag, theme } = useUiPreferences();
    const styles = useThemeStyles(createStyles);
    const leimaSlots = createLeimaSlots(minimumStampsRequired, venues);
    const collectedCount = leimaSlots.filter((slot) => slot.venue !== null).length;
    const [selectedVenue, setSelectedVenue] = useState<EventVenueSummary | null>(null);
    const stampedAtFormatter = new Intl.DateTimeFormat(localeTag, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <>
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
                            <Pressable
                                disabled={!isCollected}
                                key={slot.key}
                                onPress={() => setSelectedVenue(venue)}
                                style={[styles.slot, isCollected ? styles.slotCollected : null]}
                            >
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
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            <Modal
                animationType="fade"
                onRequestClose={() => setSelectedVenue(null)}
                transparent
                visible={selectedVenue !== null}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalSheet}>
                        {selectedVenue !== null ? (
                            <>
                                <View style={styles.modalHeader}>
                                    <View style={styles.modalHeaderCopy}>
                                        <Text style={styles.passEyebrow}>{language === "fi" ? "Leima" : "Leima"}</Text>
                                        <Text style={styles.passTitle}>{selectedVenue.name}</Text>
                                    </View>
                                    <Pressable onPress={() => setSelectedVenue(null)} style={styles.closeButton}>
                                        <AppIcon color={theme.colors.textPrimary} name="x" size={18} />
                                    </Pressable>
                                </View>

                                <Text style={styles.modalMeta}>
                                    {selectedVenue.city}
                                    {selectedVenue.country.length > 0 ? `, ${selectedVenue.country}` : ""}
                                </Text>
                                {selectedVenue.stampedAt !== null ? (
                                    <Text style={styles.modalMeta}>
                                        {language === "fi"
                                            ? `Leima haettu ${stampedAtFormatter.format(new Date(selectedVenue.stampedAt))}`
                                            : `Stamped ${stampedAtFormatter.format(new Date(selectedVenue.stampedAt))}`}
                                    </Text>
                                ) : null}
                                {selectedVenue.stampLabel ? (
                                    <Text style={styles.modalMeta}>
                                        {language === "fi" ? "Leiman nimi" : "Stamp label"}: {selectedVenue.stampLabel}
                                    </Text>
                                ) : null}
                            </>
                        ) : null}
                    </View>
                </View>
            </Modal>
        </>
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
        closeButton: {
            alignItems: "center",
            backgroundColor: theme.colors.surfaceL1,
            borderColor: theme.colors.borderDefault,
            borderRadius: 999,
            borderWidth: 1,
            height: 40,
            justifyContent: "center",
            width: 40,
        },
        modalBackdrop: {
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.72)",
            flex: 1,
            justifyContent: "center",
            paddingHorizontal: 18,
        },
        modalHeader: {
            alignItems: "flex-start",
            flexDirection: "row",
            gap: 12,
            justifyContent: "space-between",
        },
        modalHeaderCopy: {
            flex: 1,
            gap: 4,
            minWidth: 0,
        },
        modalMeta: {
            color: theme.colors.textMuted,
            fontFamily: theme.typography.families.medium,
            fontSize: theme.typography.sizes.bodySmall,
            lineHeight: theme.typography.lineHeights.bodySmall,
        },
        modalSheet: {
            backgroundColor: theme.colors.surfaceL2,
            borderColor: theme.colors.borderDefault,
            borderRadius: theme.radius.card,
            borderWidth: 1,
            gap: 10,
            padding: 18,
            width: "100%",
        },
        slotEmptyDot: {
            backgroundColor: theme.colors.borderStrong,
            borderRadius: 999,
            height: 8,
            width: 8,
        },
    });
