import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const hasTextValue = (value: string | null): value is string =>
    value !== null && value.trim().length > 0;

const normalizeExternalUrl = (url: string): string =>
    /^https?:\/\//i.test(url) ? url : `https://${url}`;

export const PublicClubDirectorySection = ({ isEnabled }: PublicClubDirectorySectionProps) => {
    const { language, theme } = useUiPreferences();
    const { height: windowHeight, width: windowWidth } = useWindowDimensions();
    const safeAreaInsets = useSafeAreaInsets();
    const styles = useThemeStyles(createStyles);
    const clubDirectoryQuery = usePublicClubDirectoryQuery({ isEnabled });
    const [selectedClub, setSelectedClub] = useState<PublicClubDirectoryItem | null>(null);
    const [contactActionError, setContactActionError] = useState<string | null>(null);
    const clubCardWidth = Math.min(360, Math.max(280, windowWidth - 88));
    const availableSheetHeight = Math.max(280, windowHeight - safeAreaInsets.top - safeAreaInsets.bottom - 48);
    const preferredSheetHeight = Math.max(280, windowHeight - safeAreaInsets.top - safeAreaInsets.bottom - 96);
    const infoSheetHeight = Math.min(availableSheetHeight, preferredSheetHeight);

    const labels = {
        body:
            language === "fi"
                ? "Tutustu järjestäjiin, yhteystietoihin ja opiskelijayhteisöihin tapahtumien takana."
                : "Explore organizers, contact details, and the student communities behind the events.",
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
        phone: language === "fi" ? "Puhelin" : "Phone",
        address: language === "fi" ? "Osoite" : "Address",
        website: language === "fi" ? "Verkkosivu" : "Website",
        instagram: "Instagram",
        announcement: language === "fi" ? "Tiedote" : "Announcement",
        openLinkFailed:
            language === "fi"
                ? "Linkkiä ei voitu avata tällä laitteella."
                : "Could not open the link on this device.",
        empty:
            language === "fi"
                ? "Aktiivisia opiskelijaklubeja ei ole vielä näkyvissä."
                : "No active student clubs are visible yet.",
        eyebrow: language === "fi" ? "Yhteisö" : "Community",
        infoEyebrow: language === "fi" ? "Klubitiedot" : "Club details",
        loading: language === "fi" ? "Ladataan aktiivisia klubeja." : "Loading active clubs.",
        metaFallback: language === "fi" ? "OmaLeima-klubi" : "OmaLeima club",
        openInfo: language === "fi" ? "Avaa tiedot" : "Open details",
        detailButton: language === "fi" ? "Tiedot" : "Detail",
        university: language === "fi" ? "Yliopisto" : "University",
        city: language === "fi" ? "Kaupunki" : "City",
        country: language === "fi" ? "Maa" : "Country",
        notProvided: language === "fi" ? "Ei lisätty" : "Not added",
        title: language === "fi" ? "Opiskelijaklubit" : "Student clubs",
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

    const handleExternalLinkPress = async (url: string): Promise<void> => {
        setContactActionError(null);

        try {
            const canOpen = await Linking.canOpenURL(url);

            if (!canOpen) {
                setContactActionError(labels.openLinkFailed);
                return;
            }

            await Linking.openURL(url);
        } catch (error) {
            setContactActionError(error instanceof Error ? error.message : labels.openLinkFailed);
        }
    };

    const handleClubFooterPress = (club: PublicClubDirectoryItem): void => {
        if (club.contactEmail === null) {
            handleClubInfoPress(club);
            return;
        }

        void handleEmailPress(club.contactEmail);
    };

    return (
        <InfoCard
            eyebrow={labels.eyebrow}
            showBorder={false}
            title={labels.title}
        >
            {clubDirectoryQuery.isLoading ? <Text style={styles.bodyText}>{labels.loading}</Text> : null}

            {clubDirectoryQuery.error ? (
                <Text selectable style={styles.errorText}>{clubDirectoryQuery.error.message}</Text>
            ) : null}

            {!clubDirectoryQuery.isLoading && !clubDirectoryQuery.error ? (
                <>
                    <Text style={styles.sectionIntroText}>{labels.body}</Text>
                    {clubDirectoryQuery.data !== undefined && clubDirectoryQuery.data.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clubRail}>
                            {clubDirectoryQuery.data.map((club) => {
                                const meta = createClubMeta(club);

                                return (
                                    <View key={club.clubId} style={[styles.clubCard, { width: clubCardWidth }]}>
                                        <CoverImageSurface
                                            imageStyle={styles.clubCoverImage}
                                            source={getEventCoverSourceWithFallback(club.coverImageUrl ?? club.logoUrl, "clubControl")}
                                            style={styles.clubCover}
                                        >
                                            <View style={styles.clubCoverOverlay} />
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
                                            {hasTextValue(club.announcement) ? (
                                                <Text numberOfLines={1} style={styles.clubAnnouncement}>
                                                    {club.announcement}
                                                </Text>
                                            ) : null}
                                        </View>

                                        <View style={styles.ticketActionColumn}>
                                            <View style={styles.ticketCutTop} />
                                            <View style={styles.ticketPerforation} />
                                            <View style={styles.ticketCutBottom} />
                                            <Pressable
                                                accessibilityLabel={`${labels.openInfo}: ${club.clubName}`}
                                                accessibilityRole="button"
                                                onPress={() => handleClubInfoPress(club)}
                                                style={({ pressed }) => [
                                                    styles.ticketIconButton,
                                                    pressed ? styles.clubFooterRowPressed : null,
                                                ]}
                                            >
                                                <AppIcon color={theme.colors.lime} name="info" size={16} />
                                            </Pressable>
                                            <Pressable
                                                accessibilityLabel={club.contactEmail !== null ? labels.email : labels.openInfo}
                                                accessibilityRole="button"
                                                onPress={() => handleClubFooterPress(club)}
                                                style={({ pressed }) => [
                                                    styles.ticketTextButton,
                                                    pressed ? styles.clubFooterRowPressed : null,
                                                ]}
                                            >
                                                <AppIcon
                                                    color={theme.colors.lime}
                                                    name={club.contactEmail !== null ? "mail" : "chevron-right"}
                                                    size={17}
                                                />
                                            </Pressable>
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
                <Pressable
                    onPress={handleCloseClubInfo}
                    style={[
                        styles.infoBackdrop,
                        {
                            paddingBottom: safeAreaInsets.bottom + 20,
                            paddingTop: safeAreaInsets.top + 20,
                        },
                    ]}
                >
                    {selectedClub !== null ? (
                        <Pressable onPress={() => undefined} style={[styles.infoSheet, { height: infoSheetHeight }]}>
                            <View style={styles.infoStickyHeader}>
                                <View style={styles.infoHeaderCopy}>
                                    <Text style={styles.infoEyebrow}>{labels.infoEyebrow}</Text>
                                    <Text numberOfLines={2} style={styles.infoTitle}>{selectedClub.clubName}</Text>
                                </View>
                                <Pressable onPress={handleCloseClubInfo} style={styles.infoCloseButton}>
                                    <Text style={styles.infoCloseText}>{labels.close}</Text>
                                </Pressable>
                            </View>

                            <ScrollView
                                bounces
                                contentContainerStyle={styles.infoScrollContent}
                                scrollIndicatorInsets={{ bottom: 10, top: 10 }}
                                showsVerticalScrollIndicator
                                style={styles.infoScrollView}
                            >
                                <CoverImageSurface
                                    imageStyle={styles.infoCoverImage}
                                    source={getEventCoverSourceWithFallback(selectedClub.coverImageUrl ?? selectedClub.logoUrl, "clubControl")}
                                    style={styles.infoCover}
                                >
                                    <View style={styles.infoCoverOverlay} />
                                    <View style={styles.infoLogoBubble}>
                                        {selectedClub.logoUrl !== null ? (
                                            <CoverImageSurface
                                                imageStyle={styles.infoLogoImage}
                                                source={getEventCoverSourceWithFallback(selectedClub.logoUrl, "clubControl")}
                                                style={styles.infoLogoSurface}
                                            />
                                        ) : (
                                            <AppIcon color={theme.colors.lime} name="business" size={28} />
                                        )}
                                    </View>
                                </CoverImageSurface>

                                <View style={styles.infoBody}>
                                    {hasTextValue(selectedClub.announcement) ? (
                                        <View style={styles.announcementBox}>
                                            <Text style={styles.infoLabel}>{labels.announcement}</Text>
                                            <Text selectable style={styles.infoValue}>{selectedClub.announcement}</Text>
                                        </View>
                                    ) : null}
                                    <View style={styles.detailGrid}>
                                        <View style={styles.infoBlock}>
                                            <Text style={styles.infoLabel}>{labels.university}</Text>
                                            <Text selectable style={styles.infoValue}>
                                                {selectedClub.universityName ?? labels.notProvided}
                                            </Text>
                                        </View>
                                        <View style={styles.infoBlock}>
                                            <Text style={styles.infoLabel}>{labels.city}</Text>
                                            <Text selectable style={styles.infoValue}>{selectedClub.city ?? labels.notProvided}</Text>
                                        </View>
                                        <View style={styles.infoBlock}>
                                            <Text style={styles.infoLabel}>{labels.country}</Text>
                                            <Text selectable style={styles.infoValue}>{selectedClub.country ?? labels.notProvided}</Text>
                                        </View>
                                        <View style={styles.infoBlock}>
                                            <Text style={styles.infoLabel}>{labels.address}</Text>
                                            <Text selectable style={styles.infoValue}>{selectedClub.address ?? labels.notProvided}</Text>
                                        </View>
                                    </View>

                                    {(() => {
                                        const contactEmail = selectedClub.contactEmail;

                                        if (contactEmail === null) {
                                            return null;
                                        }

                                        return (
                                            <Pressable onPress={() => void handleEmailPress(contactEmail)} style={styles.contactButton}>
                                                <View style={styles.contactIconWrap}>
                                                    <AppIcon color={theme.colors.lime} name="mail" size={16} />
                                                </View>
                                                <View style={styles.contactCopy}>
                                                    <Text style={styles.infoLabel}>{labels.email}</Text>
                                                    <Text ellipsizeMode="tail" numberOfLines={2} selectable style={styles.contactValue}>{contactEmail}</Text>
                                                </View>
                                                <AppIcon color={theme.colors.textMuted} name="chevron-right" size={16} />
                                            </Pressable>
                                        );
                                    })()}

                                    {(() => {
                                        const phone = selectedClub.phone;

                                        if (!hasTextValue(phone)) {
                                            return null;
                                        }

                                        return (
                                            <Pressable onPress={() => void handleExternalLinkPress(`tel:${phone}`)} style={styles.contactButton}>
                                                <View style={styles.contactIconWrap}>
                                                    <AppIcon color={theme.colors.lime} name="support" size={16} />
                                                </View>
                                                <View style={styles.contactCopy}>
                                                    <Text style={styles.infoLabel}>{labels.phone}</Text>
                                                    <Text ellipsizeMode="tail" numberOfLines={2} selectable style={styles.contactValue}>{phone}</Text>
                                                </View>
                                                <AppIcon color={theme.colors.textMuted} name="chevron-right" size={16} />
                                            </Pressable>
                                        );
                                    })()}

                                    {(() => {
                                        const websiteUrl = selectedClub.websiteUrl;

                                        if (!hasTextValue(websiteUrl)) {
                                            return null;
                                        }

                                        return (
                                            <Pressable onPress={() => void handleExternalLinkPress(normalizeExternalUrl(websiteUrl))} style={styles.contactButton}>
                                                <View style={styles.contactIconWrap}>
                                                    <AppIcon color={theme.colors.lime} name="globe" size={16} />
                                                </View>
                                                <View style={styles.contactCopy}>
                                                    <Text style={styles.infoLabel}>{labels.website}</Text>
                                                    <Text ellipsizeMode="tail" numberOfLines={2} selectable style={styles.contactValue}>{websiteUrl}</Text>
                                                </View>
                                                <AppIcon color={theme.colors.textMuted} name="chevron-right" size={16} />
                                            </Pressable>
                                        );
                                    })()}

                                    {(() => {
                                        const instagramUrl = selectedClub.instagramUrl;

                                        if (!hasTextValue(instagramUrl)) {
                                            return null;
                                        }

                                        return (
                                            <Pressable onPress={() => void handleExternalLinkPress(normalizeExternalUrl(instagramUrl))} style={styles.contactButton}>
                                                <View style={styles.contactIconWrap}>
                                                    <AppIcon color={theme.colors.lime} name="star" size={16} />
                                                </View>
                                                <View style={styles.contactCopy}>
                                                    <Text style={styles.infoLabel}>{labels.instagram}</Text>
                                                    <Text ellipsizeMode="tail" numberOfLines={2} selectable style={styles.contactValue}>{instagramUrl}</Text>
                                                </View>
                                                <AppIcon color={theme.colors.textMuted} name="chevron-right" size={16} />
                                            </Pressable>
                                        );
                                    })()}

                                    {selectedClub.contactEmail === null
                                    && !hasTextValue(selectedClub.phone)
                                    && !hasTextValue(selectedClub.websiteUrl)
                                    && !hasTextValue(selectedClub.instagramUrl) ? (
                                        <Text style={styles.bodyText}>{labels.contactUnavailable}</Text>
                                    ) : null}
                                    {contactActionError !== null ? <Text style={styles.errorText}>{contactActionError}</Text> : null}
                                </View>
                            </ScrollView>
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
        sectionIntroText: {
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.families.medium,
            fontSize: theme.typography.sizes.bodySmall,
            lineHeight: theme.typography.lineHeights.bodySmall,
        },
        clubAnnouncement: {
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.families.medium,
            fontSize: theme.typography.sizes.caption,
            lineHeight: theme.typography.lineHeights.caption,
        },
        clubCard: {
            backgroundColor: theme.colors.surfaceL1,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radius.card,
            borderWidth: 1,
            flexDirection: "row",
            gap: 12,
            minHeight: 136,
            overflow: "visible",
            padding: 10,
        },
        clubCardBody: {
            flex: 1,
            gap: 7,
            justifyContent: "center",
            minWidth: 0,
            paddingVertical: 4,
        },
        clubCover: {
            alignSelf: "center",
            borderRadius: theme.radius.inner,
            height: 112,
            overflow: "hidden",
            position: "relative",
            width: 104,
        },
        clubCoverImage: {
            borderRadius: theme.radius.inner,
        },
        clubCoverOverlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: theme.mode === "light" ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.34)",
        },
        clubFooterRow: {
            alignItems: "center",
            backgroundColor: theme.colors.surfaceL1,
            borderColor: theme.colors.borderDefault,
            borderRadius: 999,
            borderWidth: theme.mode === "light" ? 1 : 0,
            flexDirection: "row",
            gap: 6,
            justifyContent: "space-between",
            paddingHorizontal: 11,
            paddingVertical: 8,
        },
        clubFooterRowPressed: {
            opacity: 0.82,
            transform: [{ translateY: 1 }],
        },
        clubLogoBubble: {
            alignItems: "center",
            backgroundColor: theme.colors.surfaceL1,
            borderColor: theme.colors.borderDefault,
            borderRadius: 999,
            borderWidth: theme.mode === "light" ? 1 : 0,
            bottom: 8,
            height: 40,
            justifyContent: "center",
            left: 8,
            overflow: "hidden",
            position: "absolute",
            width: 40,
        },
        clubLogoImage: {
            borderRadius: 999,
        },
        clubLogoSurface: {
            borderRadius: 999,
            height: 40,
            overflow: "hidden",
            width: 40,
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
            flexShrink: 1,
            gap: 4,
        },
        contactValue: {
            color: theme.colors.textPrimary,
            flexShrink: 1,
            fontFamily: theme.typography.families.medium,
            fontSize: theme.typography.sizes.body,
            lineHeight: theme.typography.lineHeights.body,
        },
        contactIconWrap: {
            alignItems: "center",
            backgroundColor: theme.colors.limeSurface,
            borderRadius: 999,
            height: 32,
            justifyContent: "center",
            width: 32,
        },
        announcementBox: {
            backgroundColor: theme.colors.surfaceL2,
            borderColor: theme.colors.borderDefault,
            borderRadius: 18,
            borderWidth: theme.mode === "light" ? 1 : 0,
            gap: 6,
            padding: 14,
        },
        detailGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
        },
        infoBackdrop: {
            alignItems: "center",
            backgroundColor: theme.mode === "dark" ? "rgba(0, 0, 0, 0.66)" : "rgba(12, 16, 12, 0.22)",
            flex: 1,
            justifyContent: "center",
            paddingHorizontal: 20,
        },
        infoBlock: {
            backgroundColor: theme.colors.surfaceL2,
            borderColor: theme.colors.borderDefault,
            borderRadius: 18,
            borderWidth: theme.mode === "light" ? 1 : 0,
            flexGrow: 1,
            gap: 4,
            minWidth: "46%",
            padding: 14,
        },
        infoBody: {
            gap: 14,
        },
        ticketActionColumn: {
            alignItems: "center",
            alignSelf: "stretch",
            justifyContent: "center",
            paddingLeft: 12,
            position: "relative",
            width: 86,
        },
        ticketCutBottom: {
            backgroundColor: theme.colors.screenBase,
            borderColor: theme.colors.borderDefault,
            borderRadius: 999,
            borderWidth: 1,
            bottom: -23,
            height: 30,
            left: -3,
            position: "absolute",
            width: 30,
            zIndex: 2,
        },
        ticketCutTop: {
            backgroundColor: theme.colors.screenBase,
            borderColor: theme.colors.borderDefault,
            borderRadius: 999,
            borderWidth: 1,
            height: 30,
            left: -3,
            position: "absolute",
            top: -23,
            width: 30,
            zIndex: 2,
        },
        ticketIconButton: {
            alignItems: "center",
            backgroundColor: theme.colors.surfaceL2,
            borderColor: theme.colors.borderDefault,
            borderRadius: 999,
            borderWidth: theme.mode === "light" ? 1 : 0,
            height: 36,
            justifyContent: "center",
            marginBottom: 8,
            width: 36,
        },
        ticketPerforation: {
            borderColor: theme.colors.borderDefault,
            borderLeftWidth: 1,
            borderStyle: "dashed",
            bottom: 0,
            left: 12,
            position: "absolute",
            top: 0,
        },
        ticketTextButton: {
            alignItems: "center",
            backgroundColor: theme.colors.surfaceL2,
            borderColor: theme.colors.borderDefault,
            borderRadius: 999,
            borderWidth: theme.mode === "light" ? 1 : 0,
            justifyContent: "center",
            height: 36,
            width: 36,
        },
        infoCloseButton: {
            alignItems: "center",
            backgroundColor: theme.colors.surfaceL2,
            borderRadius: 999,
            flexShrink: 0,
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
        infoCover: {
            borderRadius: 22,
            height: 178,
            overflow: "hidden",
            position: "relative",
        },
        infoCoverImage: {
            borderRadius: 22,
        },
        infoCoverOverlay: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: theme.mode === "light" ? "rgba(0,0,0,0.14)" : "rgba(0,0,0,0.28)",
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
        infoLogoBubble: {
            alignItems: "center",
            backgroundColor: theme.colors.surfaceL1,
            borderColor: theme.colors.borderDefault,
            borderRadius: 999,
            borderWidth: 1,
            bottom: 14,
            height: 70,
            justifyContent: "center",
            left: 14,
            overflow: "hidden",
            position: "absolute",
            width: 70,
        },
        infoLogoImage: {
            borderRadius: 999,
        },
        infoLogoSurface: {
            borderRadius: 999,
            height: 70,
            overflow: "hidden",
            width: 70,
        },
        infoScrollContent: {
            gap: 16,
            padding: 18,
            paddingBottom: 26,
        },
        infoScrollView: {
            flex: 1,
        },
        infoSheet: {
            backgroundColor: theme.colors.surfaceL1,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radius.card,
            borderWidth: 1,
            overflow: "hidden",
            width: "100%",
        },
        infoStickyHeader: {
            alignItems: "center",
            borderBottomColor: theme.colors.borderDefault,
            borderBottomWidth: 1,
            flexDirection: "row",
            gap: 12,
            justifyContent: "space-between",
            paddingHorizontal: 18,
            paddingVertical: 14,
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
