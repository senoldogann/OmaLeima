import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { InfoCard } from "@/components/info-card";
import { type PublicClubDirectoryItem, usePublicClubDirectoryQuery } from "@/features/club/public-club-directory";
import { getEventCoverSourceWithFallback } from "@/features/events/event-visuals";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";

type PublicClubDirectorySectionProps = {
    isEnabled: boolean;
};

const createClubMeta = (club: PublicClubDirectoryItem): string =>
    [club.universityName, club.city].filter((value): value is string => value !== null && value.length > 0).join(" · ");

export const PublicClubDirectorySection = ({ isEnabled }: PublicClubDirectorySectionProps) => {
    const { language, theme } = useUiPreferences();
    const { width: windowWidth } = useWindowDimensions();
    const styles = useThemeStyles(createStyles);
    const clubDirectoryQuery = usePublicClubDirectoryQuery({ isEnabled });
    const clubCount = clubDirectoryQuery.data?.length ?? 0;
    const [selectedClub, setSelectedClub] = useState<PublicClubDirectoryItem | null>(null);
    const [contactActionError, setContactActionError] = useState<string | null>(null);
    const clubCardWidth = Math.min(360, Math.max(280, windowWidth - 88));
    const clubCoverHeight = Math.round(clubCardWidth * 0.56);

    const labels = {
        body:
            language === "fi"
                ? `${clubCount} aktiivista opiskelijaklubia mukana OmaLeima-verkostossa.`
                : `${clubCount} active student clubs are visible in the OmaLeima network.`,
        close: language === "fi" ? "Sulje" : "Close",
        contactAvailable:
            language === "fi" ? "Avaa tiedot ja sähköposti" : "Open info and email",
        contactUnavailable:
            language === "fi" ? "Klubi ei ole lisännyt yhteystietoja." : "This club has not added contact details.",
        email: language === "fi" ? "Sähköposti" : "Email",
        emailOpenFailed:
            language === "fi"
                ? "Sähköpostia ei voitu avata tällä laitteella."
                : "Could not open email on this device.",
        empty:
            language === "fi"
                ? "Aktiivisia opiskelijaklubeja ei ole vielä näkyvissä."
                : "No active student clubs are visible yet.",
        eyebrow: language === "fi" ? "Yhteisö" : "Community",
        infoEyebrow: language === "fi" ? "Klubitiedot" : "Club details",
        loading: language === "fi" ? "Ladataan aktiivisia klubeja." : "Loading active clubs.",
        metaFallback: language === "fi" ? "OmaLeima-klubi" : "OmaLeima club",
        openInfo: language === "fi" ? "Avaa tiedot" : "Open details",
        university: language === "fi" ? "Yliopisto" : "University",
        city: language === "fi" ? "Kaupunki" : "City",
        notProvided: language === "fi" ? "Ei lisätty" : "Not added",
        title: language === "fi" ? `Opiskelijaklubit · ${clubCount}` : `Student clubs · ${clubCount}`,
    };

    const handleClubInfoPress = (club: PublicClubDirectoryItem): void => {
        setContactActionError(null);
        setSelectedClub(club);
    };

    const handleCloseClubInfo = (): void => {
        setContactActionError(null);
        setSelectedClub(null);
    };

    const handleEmailPress = async (email: string): Promise<void> => {
        const emailUrl = `mailto:${encodeURIComponent(email)}`;
        setContactActionError(null);

        try {
            const canOpen = await Linking.canOpenURL(emailUrl);

            if (!canOpen) {
                setContactActionError(labels.emailOpenFailed);
                return;
            }

            await Linking.openURL(emailUrl);
        } catch (error) {
            setContactActionError(error instanceof Error ? error.message : labels.emailOpenFailed);
        }
    };

    return (
        <InfoCard eyebrow={labels.eyebrow} title={labels.title}>
            {clubDirectoryQuery.isLoading ? <Text style={styles.bodyText}>{labels.loading}</Text> : null}

            {clubDirectoryQuery.error ? (
                <Text selectable style={styles.errorText}>{clubDirectoryQuery.error.message}</Text>
            ) : null}

            {!clubDirectoryQuery.isLoading && !clubDirectoryQuery.error ? (
                <>
                    <Text style={styles.bodyText}>{labels.body}</Text>

                    {clubDirectoryQuery.data !== undefined && clubDirectoryQuery.data.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clubRail}>
                            {clubDirectoryQuery.data.map((club) => {
                                const meta = createClubMeta(club);

                                return (
                                    <View key={club.clubId} style={[styles.clubCard, { width: clubCardWidth }]}>
                                        <CoverImageSurface
                                            imageStyle={styles.clubCoverImage}
                                            source={getEventCoverSourceWithFallback(club.coverImageUrl ?? club.logoUrl, "clubControl")}
                                            style={[styles.clubCover, { height: clubCoverHeight }]}
                                        >
                                            <View style={styles.clubCoverOverlay} />
                                            <Pressable
                                                accessibilityLabel={`${labels.openInfo}: ${club.clubName}`}
                                                onPress={() => handleClubInfoPress(club)}
                                                style={styles.infoButton}
                                            >
                                                <AppIcon color={theme.colors.textPrimary} name="info" size={16} />
                                            </Pressable>
                                            <View style={styles.clubLogoBubble}>
                                                {club.logoUrl !== null ? (
                                                    <CoverImageSurface
                                                        imageStyle={styles.clubLogoImage}
                                                        source={getEventCoverSourceWithFallback(club.logoUrl, "clubControl")}
                                                        style={styles.clubLogoSurface}
                                                    />
                                                ) : (
                                                    <AppIcon color={theme.colors.lime} name="business" size={24} />
                                                )}
                                            </View>
                                        </CoverImageSurface>

                                        <View style={styles.clubCardBody}>
                                            <Text numberOfLines={2} style={styles.clubTitle}>{club.clubName}</Text>
                                            <Text numberOfLines={2} style={styles.clubMeta}>{meta.length > 0 ? meta : labels.metaFallback}</Text>
                                            <Text numberOfLines={1} style={styles.clubHint}>
                                                {club.contactEmail !== null ? labels.contactAvailable : labels.openInfo}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    ) : (
                        <Text style={styles.bodyText}>{labels.empty}</Text>
                    )}
                </>
            ) : null}

            <Modal
                animationType="fade"
                onRequestClose={handleCloseClubInfo}
                transparent
                visible={selectedClub !== null}
            >
                <Pressable onPress={handleCloseClubInfo} style={styles.infoBackdrop}>
                    {selectedClub !== null ? (
                        <Pressable onPress={() => undefined} style={styles.infoSheet}>
                            <View style={styles.infoHeader}>
                                <View style={styles.infoHeaderCopy}>
                                    <Text style={styles.infoEyebrow}>{labels.infoEyebrow}</Text>
                                    <Text style={styles.infoTitle}>{selectedClub.clubName}</Text>
                                </View>
                                <Pressable onPress={handleCloseClubInfo} style={styles.infoCloseButton}>
                                    <Text style={styles.infoCloseText}>{labels.close}</Text>
                                </Pressable>
                            </View>

                            <View style={styles.infoBody}>
                                <View style={styles.infoBlock}>
                                    <Text style={styles.infoLabel}>{labels.university}</Text>
                                    <Text style={styles.infoValue}>
                                        {selectedClub.universityName ?? labels.notProvided}
                                    </Text>
                                </View>
                                <View style={styles.infoBlock}>
                                    <Text style={styles.infoLabel}>{labels.city}</Text>
                                    <Text style={styles.infoValue}>{selectedClub.city ?? labels.notProvided}</Text>
                                </View>
                                {selectedClub.contactEmail !== null ? (
                                    <Pressable onPress={() => void handleEmailPress(selectedClub.contactEmail ?? "")} style={styles.contactButton}>
                                        <View style={styles.contactIconWrap}>
                                            <AppIcon color={theme.colors.lime} name="mail" size={16} />
                                        </View>
                                        <View style={styles.contactCopy}>
                                            <Text style={styles.infoLabel}>{labels.email}</Text>
                                            <Text style={styles.infoValue}>{selectedClub.contactEmail}</Text>
                                        </View>
                                        <AppIcon color={theme.colors.textMuted} name="chevron-right" size={16} />
                                    </Pressable>
                                ) : (
                                    <Text style={styles.bodyText}>{labels.contactUnavailable}</Text>
                                )}
                                {contactActionError !== null ? <Text style={styles.errorText}>{contactActionError}</Text> : null}
                            </View>
                        </Pressable>
                    ) : null}
                </Pressable>
            </Modal>
        </InfoCard>
    );
};

const createStyles = (theme: MobileTheme) =>
    StyleSheet.create({
        bodyText: {
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.families.medium,
            fontSize: theme.typography.sizes.body,
            lineHeight: theme.typography.lineHeights.body,
        },
        clubCard: {
            backgroundColor: theme.colors.surfaceL2,
            borderColor: theme.colors.borderDefault,
            borderRadius: theme.radius.inner,
            borderWidth: theme.mode === "light" ? 1 : 0,
            height: 320,
            overflow: "hidden",
        },
        clubCardBody: {
            flex: 1,
            gap: 8,
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 14,
        },
        clubHint: {
            color: theme.colors.textMuted,
            fontFamily: theme.typography.families.semibold,
            fontSize: theme.typography.sizes.caption,
            lineHeight: theme.typography.lineHeights.caption,
        },
        clubCover: {
            borderTopLeftRadius: theme.radius.inner,
            borderTopRightRadius: theme.radius.inner,
            overflow: "hidden",
            position: "relative",
        },
        clubCoverImage: {
            borderTopLeftRadius: theme.radius.inner,
            borderTopRightRadius: theme.radius.inner,
        },
        clubCoverOverlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: theme.mode === "light" ? "rgba(0,0,0,0.16)" : "rgba(0,0,0,0.28)",
        },
        clubLogoBubble: {
            alignItems: "center",
            backgroundColor: theme.colors.surfaceL1,
            borderColor: theme.colors.borderDefault,
            borderRadius: 999,
            borderWidth: theme.mode === "light" ? 1 : 0,
            bottom: 12,
            height: 54,
            justifyContent: "center",
            left: 12,
            overflow: "hidden",
            position: "absolute",
            width: 54,
        },
        clubLogoImage: {
            borderRadius: 999,
        },
        clubLogoSurface: {
            borderRadius: 999,
            height: 54,
            overflow: "hidden",
            width: 54,
        },
        clubMeta: {
            color: theme.colors.textMuted,
            fontFamily: theme.typography.families.medium,
            fontSize: theme.typography.sizes.bodySmall,
            lineHeight: theme.typography.lineHeights.bodySmall,
        },
        clubRail: {
            gap: 12,
            paddingRight: 4,
        },
        clubTitle: {
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.families.extrabold,
            fontSize: theme.typography.sizes.body,
            lineHeight: theme.typography.lineHeights.body,
        },
        errorText: {
            color: theme.colors.danger,
            fontFamily: theme.typography.families.medium,
            fontSize: theme.typography.sizes.bodySmall,
            lineHeight: theme.typography.lineHeights.bodySmall,
        },
        contactButton: {
            alignItems: "center",
            backgroundColor: theme.colors.surfaceL2,
            borderColor: theme.colors.borderDefault,
            borderRadius: 18,
            borderWidth: theme.mode === "light" ? 1 : 0,
            flexDirection: "row",
            gap: 12,
            justifyContent: "space-between",
            paddingHorizontal: 14,
            paddingVertical: 12,
        },
        contactCopy: {
            flex: 1,
            gap: 4,
        },
        contactIconWrap: {
            alignItems: "center",
            backgroundColor: theme.colors.limeSurface,
            borderRadius: 999,
            height: 32,
            justifyContent: "center",
            width: 32,
        },
        infoBackdrop: {
            backgroundColor: theme.mode === "dark" ? "rgba(0, 0, 0, 0.66)" : "rgba(12, 16, 12, 0.22)",
            flex: 1,
            justifyContent: "center",
            paddingHorizontal: 20,
        },
        infoBlock: {
            gap: 4,
        },
        infoBody: {
            gap: 14,
        },
        infoButton: {
            alignItems: "center",
            backgroundColor: theme.colors.surfaceL1,
            borderColor: theme.colors.borderDefault,
            borderRadius: 999,
            borderWidth: theme.mode === "light" ? 1 : 0,
            height: 34,
            justifyContent: "center",
            position: "absolute",
            right: 12,
            top: 12,
            width: 34,
        },
        infoCloseButton: {
            alignItems: "center",
            backgroundColor: theme.colors.surfaceL2,
            borderRadius: 999,
            justifyContent: "center",
            paddingHorizontal: 14,
            paddingVertical: 10,
        },
        infoCloseText: {
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.families.semibold,
            fontSize: theme.typography.sizes.bodySmall,
            lineHeight: theme.typography.lineHeights.bodySmall,
        },
        infoEyebrow: {
            color: theme.colors.textMuted,
            fontFamily: theme.typography.families.bold,
            fontSize: theme.typography.sizes.eyebrow,
            letterSpacing: 1,
            textTransform: "uppercase",
        },
        infoHeader: {
            alignItems: "center",
            flexDirection: "row",
            gap: 12,
            justifyContent: "space-between",
        },
        infoHeaderCopy: {
            flex: 1,
            gap: 4,
        },
        infoLabel: {
            color: theme.colors.textMuted,
            fontFamily: theme.typography.families.bold,
            fontSize: theme.typography.sizes.caption,
            lineHeight: theme.typography.lineHeights.caption,
            textTransform: "uppercase",
        },
        infoSheet: {
            backgroundColor: theme.colors.surfaceL1,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radius.card,
            borderWidth: 1,
            gap: 16,
            padding: 18,
        },
        infoTitle: {
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.families.semibold,
            fontSize: theme.typography.sizes.subtitle,
            lineHeight: theme.typography.lineHeights.subtitle,
        },
        infoValue: {
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.families.medium,
            fontSize: theme.typography.sizes.body,
            lineHeight: theme.typography.lineHeights.body,
        },
    });