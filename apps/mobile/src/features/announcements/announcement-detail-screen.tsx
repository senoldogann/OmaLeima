import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { StatusBadge } from "@/components/status-badge";
import {
    useAcknowledgeAnnouncementMutation,
    useAnnouncementDetailQuery,
    useRecordAnnouncementImpressionsMutation,
} from "@/features/announcements/announcements";
import { getFallbackCoverSource } from "@/features/events/event-visuals";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";
import { useSession } from "@/providers/session-provider";

type AnnouncementDetailScreenProps = {
    announcementId: string | null;
    backHref: AnnouncementBackHref;
};

type AnnouncementBackHref = "/business/updates" | "/club/announcements" | "/student/updates";

const formatDetailDate = (localeTag: string, value: string): string =>
    new Intl.DateTimeFormat(localeTag, {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));

export const AnnouncementDetailScreen = ({ announcementId, backHref }: AnnouncementDetailScreenProps) => {
    const router = useRouter();
    const styles = useThemeStyles(createStyles);
    const { language, localeTag, theme } = useUiPreferences();
    const { session } = useSession();
    const userId = session?.user.id ?? null;
    const [interactionError, setInteractionError] = useState<string | null>(null);
    const detailQuery = useAnnouncementDetailQuery({
        announcementId: announcementId ?? "",
        isEnabled: userId !== null && announcementId !== null,
        userId: userId ?? "",
    });
    const acknowledgeMutation = useAcknowledgeAnnouncementMutation();
    const impressionMutation = useRecordAnnouncementImpressionsMutation();
    const recordedAnnouncementIdRef = useRef<string | null>(null);
    const announcement = detailQuery.data ?? null;

    const labels = {
        back: language === "fi" ? "Takaisin" : "Back",
        ctaFallback: language === "fi" ? "Avaa linkki" : "Open link",
        detailTitle: language === "fi" ? "Tiedote" : "Update",
        loading: language === "fi" ? "Haetaan tiedotetta." : "Loading update.",
        markRead: language === "fi" ? "Merkitse luetuksi" : "Mark read",
        platform: "OmaLeima",
        read: language === "fi" ? "Luettu" : "Read",
        retry: language === "fi" ? "Yritä uudelleen" : "Retry",
        unavailableBody:
            language === "fi"
                ? "Tiedote ei ole enää saatavilla tälle tilille tai se on poistunut näkyvistä."
                : "This update is no longer available for this account or is no longer visible.",
        unavailableTitle: language === "fi" ? "Tiedotetta ei löytynyt" : "Update not found",
        unread: language === "fi" ? "Uusi" : "New",
    };

    useEffect(() => {
        if (userId === null || announcementId === null || announcement === null) {
            return;
        }

        if (recordedAnnouncementIdRef.current === announcementId) {
            return;
        }

        recordedAnnouncementIdRef.current = announcementId;

        void impressionMutation
            .mutateAsync({
                announcementIds: [announcementId],
                userId,
            })
            .catch((error: unknown) => {
                console.warn("announcement_detail_impression_record_failed", {
                    announcementId,
                    userId,
                    error: error instanceof Error ? error.message : String(error),
                });
            });
    }, [announcement, announcementId, impressionMutation, userId]);

    const handleBackPress = (): void => {
        if (router.canGoBack()) {
            router.back();
            return;
        }

        router.replace(backHref);
    };

    const handleMarkReadPress = async (): Promise<void> => {
        if (userId === null || announcement === null || announcement.isRead) {
            return;
        }

        setInteractionError(null);

        try {
            await acknowledgeMutation.mutateAsync({
                announcementId: announcement.announcementId,
                userId,
            });
        } catch (error) {
            console.warn("announcement_detail_cta_open_failed", {
                announcementId: announcement.announcementId,
                ctaUrl: announcement.ctaUrl,
                error: error instanceof Error ? error.message : String(error),
            });
            setInteractionError(error instanceof Error ? error.message : labels.retry);
        }
    };

    const handleCtaPress = async (): Promise<void> => {
        if (announcement?.ctaUrl === null || typeof announcement?.ctaUrl === "undefined") {
            return;
        }

        setInteractionError(null);

        try {
            const canOpenUrl = await Linking.canOpenURL(announcement.ctaUrl);

            if (!canOpenUrl) {
                throw new Error(language === "fi" ? "Linkkiä ei voitu avata." : "Could not open the link.");
            }

            await Linking.openURL(announcement.ctaUrl);
        } catch (error) {
            setInteractionError(error instanceof Error ? error.message : labels.retry);
        }
    };

    return (
        <AppScreen>
            <View style={styles.topBar}>
                <Pressable accessibilityRole="button" onPress={handleBackPress} style={styles.backButton}>
                    <AppIcon color={theme.colors.textPrimary} name="chevron-left" size={18} />
                    <Text style={styles.backButtonText}>{labels.back}</Text>
                </Pressable>
            </View>

            {userId === null ? (
                <InfoCard eyebrow={labels.detailTitle} title={labels.unavailableTitle}>
                    <Text style={styles.bodyText}>{labels.unavailableBody}</Text>
                </InfoCard>
            ) : null}

            {userId !== null && detailQuery.isLoading ? (
                <InfoCard eyebrow={labels.detailTitle} title={labels.loading}>
                    <Text style={styles.bodyText}>{labels.loading}</Text>
                </InfoCard>
            ) : null}

            {detailQuery.error ? (
                <InfoCard eyebrow={labels.detailTitle} title={labels.unavailableTitle}>
                    <Text selectable style={styles.errorText}>{detailQuery.error.message}</Text>
                    <Pressable onPress={() => void detailQuery.refetch()} style={styles.secondaryButton}>
                        <Text style={styles.secondaryButtonText}>{labels.retry}</Text>
                    </Pressable>
                </InfoCard>
            ) : null}

            {!detailQuery.isLoading && !detailQuery.error && announcement === null ? (
                <InfoCard eyebrow={labels.detailTitle} title={labels.unavailableTitle}>
                    <Text style={styles.bodyText}>{labels.unavailableBody}</Text>
                </InfoCard>
            ) : null}

            {announcement !== null ? (
                <View style={styles.detailCard}>
                    <CoverImageSurface
                        fallbackSource={getFallbackCoverSource("eventDiscovery")}
                        imageStyle={styles.heroImage}
                        source={announcement.imageUrl === null ? null : { uri: announcement.imageUrl }}
                        style={styles.hero}
                    >
                        <View style={styles.heroOverlay} />
                        <View style={styles.heroContent}>
                            <StatusBadge label={announcement.isRead ? labels.read : labels.unread} state={announcement.isRead ? "pending" : "ready"} />
                            <Text style={styles.sourceText}>{announcement.clubName ?? labels.platform}</Text>
                            <Text style={styles.title}>{announcement.title}</Text>
                        </View>
                    </CoverImageSurface>

                    <View style={styles.copyStack}>
                        <Text style={styles.metaText}>{formatDetailDate(localeTag, announcement.startsAt)}</Text>
                        <Text selectable style={styles.bodyText}>{announcement.body}</Text>

                        <View style={styles.actionRow}>
                            <Pressable
                                disabled={announcement.isRead || acknowledgeMutation.isPending}
                                onPress={() => void handleMarkReadPress()}
                                style={[styles.secondaryButton, announcement.isRead || acknowledgeMutation.isPending ? styles.disabledButton : null]}
                            >
                                <Text style={styles.secondaryButtonText}>{announcement.isRead ? labels.read : labels.markRead}</Text>
                            </Pressable>
                            {announcement.ctaUrl !== null ? (
                                <Pressable onPress={() => void handleCtaPress()} style={styles.primaryButton}>
                                    <Text style={styles.primaryButtonText}>{announcement.ctaLabel ?? labels.ctaFallback}</Text>
                                    <AppIcon color={theme.colors.actionPrimaryText} name="chevron-right" size={15} />
                                </Pressable>
                            ) : null}
                        </View>

                        {interactionError !== null ? <Text selectable style={styles.errorText}>{interactionError}</Text> : null}
                    </View>
                </View>
            ) : null}
        </AppScreen>
    );
};

const createStyles = (theme: MobileTheme) =>
    StyleSheet.create({
        actionRow: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
        },
        backButton: {
            alignItems: "center",
            alignSelf: "flex-start",
            backgroundColor: theme.colors.surfaceL2,
            borderColor: theme.colors.borderDefault,
            borderRadius: 999,
            borderWidth: 1,
            flexDirection: "row",
            gap: 8,
            minHeight: 42,
            paddingHorizontal: 14,
        },
        backButtonText: {
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.families.semibold,
            fontSize: theme.typography.sizes.bodySmall,
            lineHeight: theme.typography.lineHeights.bodySmall,
        },
        bodyText: {
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.families.medium,
            fontSize: theme.typography.sizes.body,
            lineHeight: theme.typography.lineHeights.body,
        },
        copyStack: {
            gap: 16,
            padding: 18,
        },
        detailCard: {
            backgroundColor: theme.colors.surfaceL1,
            borderColor: theme.colors.borderDefault,
            borderRadius: theme.radius.scene,
            borderWidth: 1,
            overflow: "hidden",
        },
        disabledButton: {
            opacity: 0.56,
        },
        errorText: {
            color: theme.colors.danger,
            fontFamily: theme.typography.families.medium,
            fontSize: theme.typography.sizes.bodySmall,
            lineHeight: theme.typography.lineHeights.bodySmall,
        },
        hero: {
            minHeight: 250,
            overflow: "hidden",
        },
        heroContent: {
            bottom: 18,
            gap: 8,
            left: 18,
            position: "absolute",
            right: 18,
            zIndex: 2,
        },
        heroImage: {
            borderRadius: 0,
        },
        heroOverlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: theme.mode === "light" ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.42)",
            zIndex: 1,
        },
        metaText: {
            color: theme.colors.textMuted,
            fontFamily: theme.typography.families.medium,
            fontSize: theme.typography.sizes.bodySmall,
            lineHeight: theme.typography.lineHeights.bodySmall,
        },
        primaryButton: {
            alignItems: "center",
            backgroundColor: theme.colors.lime,
            borderRadius: theme.radius.button,
            flexDirection: "row",
            gap: 7,
            justifyContent: "center",
            minHeight: 44,
            paddingHorizontal: 15,
            paddingVertical: 12,
        },
        primaryButtonText: {
            color: theme.colors.actionPrimaryText,
            fontFamily: theme.typography.families.extrabold,
            fontSize: theme.typography.sizes.bodySmall,
            lineHeight: theme.typography.lineHeights.bodySmall,
            textAlign: "center",
        },
        secondaryButton: {
            alignItems: "center",
            backgroundColor: theme.colors.surfaceL2,
            borderColor: theme.colors.borderDefault,
            borderRadius: theme.radius.button,
            borderWidth: 1,
            justifyContent: "center",
            minHeight: 44,
            paddingHorizontal: 15,
            paddingVertical: 12,
        },
        secondaryButtonText: {
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.families.semibold,
            fontSize: theme.typography.sizes.bodySmall,
            lineHeight: theme.typography.lineHeights.bodySmall,
            textAlign: "center",
        },
        sourceText: {
            color: "rgba(248, 250, 245, 0.82)",
            fontFamily: theme.typography.families.semibold,
            fontSize: theme.typography.sizes.bodySmall,
            lineHeight: theme.typography.lineHeights.bodySmall,
        },
        title: {
            color: "#F8FAF5",
            fontFamily: theme.typography.families.extrabold,
            fontSize: theme.typography.sizes.title,
            lineHeight: theme.typography.lineHeights.title,
        },
        topBar: {
            alignItems: "flex-start",
            flexDirection: "row",
            marginBottom: 2,
        },
    });