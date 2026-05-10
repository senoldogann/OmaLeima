import { useEffect, useRef, useState } from "react";
import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Image as ExpoImage } from "expo-image";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
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
    returnTo: string | null;
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

const readSafeReturnTo = (returnTo: string | null): Href | null => {
    if (returnTo === null) {
        return null;
    }

    if (!returnTo.startsWith("/")) {
        return null;
    }

    if (
        !returnTo.startsWith("/student") &&
        !returnTo.startsWith("/business") &&
        !returnTo.startsWith("/club")
    ) {
        return null;
    }

    return returnTo as Href;
};

export const AnnouncementDetailScreen = ({ announcementId, backHref, returnTo }: AnnouncementDetailScreenProps) => {
    const router = useRouter();
    const styles = useThemeStyles(createStyles);
    const { language, localeTag, theme } = useUiPreferences();
    const { session } = useSession();
    const userId = session?.user.id ?? null;
    const [interactionError, setInteractionError] = useState<string | null>(null);
    const [isImageZoomVisible, setIsImageZoomVisible] = useState(false);
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
        markRead: language === "fi" ? "Merkitse luetuksi" : "Mark as read",
        platform: "OmaLeima Support",
        retry: language === "fi" ? "Yritä uudelleen" : "Retry",
        senderLabel: language === "fi" ? "Lähettäjä" : "Sender",
        unavailableBody:
            language === "fi"
                ? "Tiedote ei ole enää saatavilla tälle tilille tai se on poistunut näkyvistä."
                : "This update is no longer available for this account or is no longer visible.",
        unavailableTitle: language === "fi" ? "Tiedotetta ei löytynyt" : "Update not found",
        zoomImage: language === "fi" ? "Avaa kuva" : "Open image",
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
        const safeReturnTo = readSafeReturnTo(returnTo);

        if (safeReturnTo !== null) {
            router.replace(safeReturnTo);
            return;
        }

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
                <Text style={styles.topBarTitle}>{labels.detailTitle}</Text>
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
                            <Text style={styles.title}>{announcement.title}</Text>
                        </View>
                        {announcement.imageUrl !== null ? (
                            <Pressable
                                accessibilityLabel={labels.zoomImage}
                                accessibilityRole="imagebutton"
                                onPress={() => setIsImageZoomVisible(true)}
                                style={styles.zoomHotspot}
                            />
                        ) : null}
                    </CoverImageSurface>

                    <View style={styles.copyStack}>
                        <View style={styles.accentDivider} />
                        <View style={styles.dateRow}>
                            <AppIcon color={theme.colors.textMuted} name="calendar" size={13} />
                            <Text style={styles.metaText}>{formatDetailDate(localeTag, announcement.startsAt)}</Text>
                        </View>
                        <View style={styles.sourceRow}>
                            <AppIcon color={theme.colors.textMuted} name="user" size={13} />
                            <Text style={styles.sourceLabel}>{labels.senderLabel}</Text>
                            <Text style={styles.sourceValue}>{announcement.clubName ?? labels.platform}</Text>
                        </View>
                        <Text selectable style={styles.bodyText}>{announcement.body}</Text>

                        <View style={styles.actionRow}>
                            {!announcement.isRead ? (
                                <Pressable
                                    disabled={acknowledgeMutation.isPending}
                                    onPress={() => void handleMarkReadPress()}
                                    style={[styles.secondaryButton, acknowledgeMutation.isPending ? styles.disabledButton : null]}
                                >
                                    <AppIcon color={theme.colors.textPrimary} name="circle" size={15} />
                                    <Text style={styles.secondaryButtonText}>{labels.markRead}</Text>
                                </Pressable>
                            ) : null}
                            {announcement.ctaUrl !== null ? (
                                <Pressable onPress={() => void handleCtaPress()} style={styles.primaryButton}>
                                    <Text style={styles.primaryButtonText}>{announcement.ctaLabel ?? labels.ctaFallback}</Text>
                                    <AppIcon color={theme.colors.lime} name="chevron-right" size={15} />
                                </Pressable>
                            ) : null}
                        </View>

                        {interactionError !== null ? <Text selectable style={styles.errorText}>{interactionError}</Text> : null}
                    </View>
                </View>
            ) : null}

            <Modal
                animationType="fade"
                onRequestClose={() => setIsImageZoomVisible(false)}
                transparent
                visible={isImageZoomVisible && announcement?.imageUrl !== null}
            >
                <View style={styles.zoomBackdrop}>
                    <Pressable onPress={() => setIsImageZoomVisible(false)} style={styles.zoomCloseButton}>
                        <AppIcon color="#F8FAF5" name="x" size={20} />
                    </Pressable>
                    {announcement?.imageUrl !== null && typeof announcement?.imageUrl !== "undefined" ? (
                        <ExpoImage
                            cachePolicy="memory-disk"
                            contentFit="contain"
                            source={{ uri: announcement.imageUrl }}
                            style={styles.zoomImage}
                            transition={180}
                        />
                    ) : null}
                </View>
            </Modal>
        </AppScreen>
    );
};

const createStyles = (theme: MobileTheme) =>
    StyleSheet.create({
        accentDivider: {
            backgroundColor: theme.colors.lime,
            borderRadius: 999,
            height: 3,
            width: 40,
        },
        actionRow: {
            flexDirection: "row",
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
            borderRadius: theme.radius.scene,
            overflow: "visible",
        },
        dateRow: {
            alignItems: "center",
            flexDirection: "row",
            gap: 6,
            justifyContent: "space-between",
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
            width: "100%",
            borderRadius: theme.radius.card,
            height: 280,
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
            borderRadius: theme.radius.card,
        },
        heroOverlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: theme.mode === "light" ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.42)",
            zIndex: 1,
        },
        zoomBackdrop: {
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.9)",
            flex: 1,
            justifyContent: "center",
            padding: 18,
        },
        zoomCloseButton: {
            alignItems: "center",
            backgroundColor: "rgba(255,255,255,0.14)",
            borderRadius: 999,
            height: 46,
            justifyContent: "center",
            position: "absolute",
            right: 18,
            top: 58,
            width: 46,
            zIndex: 3,
        },
        zoomHotspot: {
            ...StyleSheet.absoluteFillObject,
            zIndex: 3,
        },
        zoomImage: {
            borderRadius: 0,
            height: "100%",
            width: "100%",
        },
        metaText: {
            color: theme.colors.textMuted,
            fontFamily: theme.typography.families.medium,
            fontSize: theme.typography.sizes.bodySmall,
            lineHeight: theme.typography.lineHeights.bodySmall,
        },
        primaryButton: {
            alignItems: "center",
            backgroundColor: "transparent",
            borderColor: theme.colors.limeBorder,
            borderRadius: theme.radius.button,
            borderWidth: 1,
            flex: 1,
            flexDirection: "row",
            gap: 7,
            justifyContent: "center",
            minHeight: 44,
            paddingHorizontal: 15,
            paddingVertical: 12,
        },
        primaryButtonText: {
            color: theme.colors.lime,
            fontFamily: theme.typography.families.extrabold,
            fontSize: theme.typography.sizes.bodySmall,
            lineHeight: theme.typography.lineHeights.bodySmall,
            textAlign: "center",
        },
        secondaryButton: {
            alignItems: "center",
            backgroundColor: theme.colors.surfaceL2,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radius.button,
            borderWidth: 1,
            flexDirection: "row",
            gap: 7,
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
        sourceLabel: {
            color: theme.colors.textMuted,
            fontFamily: theme.typography.families.bold,
            fontSize: theme.typography.sizes.bodySmall,
            lineHeight: theme.typography.lineHeights.bodySmall,
            textTransform: "uppercase",
        },
        sourceRow: {
            alignItems: "center",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
        },
        sourceValue: {
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.families.semibold,
            fontSize: theme.typography.sizes.body,
            lineHeight: theme.typography.lineHeights.body,
        },
        title: {
            color: "#F8FAF5",
            fontFamily: theme.typography.families.extrabold,
            fontSize: theme.typography.sizes.title,
            lineHeight: theme.typography.lineHeights.title,
        },
        topBar: {
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 2,
        },
        topBarTitle: {
            color: theme.colors.textMuted,
            fontFamily: theme.typography.families.semibold,
            fontSize: theme.typography.sizes.bodySmall,
            lineHeight: theme.typography.lineHeights.bodySmall,
        },
    });
