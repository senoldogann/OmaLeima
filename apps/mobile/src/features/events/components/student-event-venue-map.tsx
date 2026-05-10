import { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { CoverImageSurface } from "@/components/cover-image-surface";
import { EmptyStateCard } from "@/components/empty-state-card";
import type { EventVenueSummary } from "@/features/events/types";
import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles, useUiPreferences } from "@/features/preferences/ui-preferences-provider";

type StudentEventVenueMapProps = {
    venues: EventVenueSummary[];
};

type CoordinateBounds = {
    minLatitude: number;
    maxLatitude: number;
    minLongitude: number;
    maxLongitude: number;
};

type VenuePin = {
    leftPercent: number;
    topPercent: number;
    venue: EventVenueSummary;
};

type EventVenueWithCoordinates = EventVenueSummary & {
    latitude: number;
    longitude: number;
};

const clampPercent = (value: number): number => Math.min(Math.max(value, 10), 90);

const hasVenueCoordinates = (venue: EventVenueSummary): venue is EventVenueWithCoordinates =>
    venue.latitude !== null && venue.longitude !== null;

const createCoordinateBounds = (venues: EventVenueSummary[]): CoordinateBounds | null => {
    const coordinateVenues = venues.filter(hasVenueCoordinates);

    if (coordinateVenues.length === 0) {
        return null;
    }

    const latitudes = coordinateVenues.map((venue) => venue.latitude);
    const longitudes = coordinateVenues.map((venue) => venue.longitude);

    return {
        minLatitude: Math.min(...latitudes),
        maxLatitude: Math.max(...latitudes),
        minLongitude: Math.min(...longitudes),
        maxLongitude: Math.max(...longitudes),
    };
};

const createFallbackPosition = (index: number, totalCount: number): { leftPercent: number; topPercent: number } => {
    if (totalCount <= 1) {
        return { leftPercent: 50, topPercent: 50 };
    }

    const angleRadians = (index * 137.5 * Math.PI) / 180;
    const radius = Math.min(34, 18 + (index % 3) * 8);

    return {
        leftPercent: clampPercent(50 + Math.cos(angleRadians) * radius),
        topPercent: clampPercent(50 + Math.sin(angleRadians) * radius),
    };
};

const createCoordinatePosition = (
    venue: EventVenueWithCoordinates,
    bounds: CoordinateBounds
): { leftPercent: number; topPercent: number } => {
    const latitudeSpan = bounds.maxLatitude - bounds.minLatitude;
    const longitudeSpan = bounds.maxLongitude - bounds.minLongitude;
    const leftPercent =
        longitudeSpan === 0
            ? 50
            : 12 + ((venue.longitude - bounds.minLongitude) / longitudeSpan) * 76;
    const topPercent =
        latitudeSpan === 0
            ? 50
            : 88 - ((venue.latitude - bounds.minLatitude) / latitudeSpan) * 76;

    return {
        leftPercent: clampPercent(leftPercent),
        topPercent: clampPercent(topPercent),
    };
};

const createVenuePins = (venues: EventVenueSummary[]): VenuePin[] => {
    const bounds = createCoordinateBounds(venues);

    return venues.map((venue, index) => {
        const position =
            bounds !== null && hasVenueCoordinates(venue)
                ? createCoordinatePosition(venue, bounds)
                : createFallbackPosition(index, venues.length);

        return {
            ...position,
            venue,
        };
    });
};

export const createVenueAddressLine = (venue: EventVenueSummary): string => {
    const parts = [venue.address, venue.city, venue.country].filter((part) => part.trim().length > 0);

    return parts.join(", ");
};

export const createExternalMapUrl = (venue: EventVenueSummary): string => {
    const query = encodeURIComponent([venue.name, createVenueAddressLine(venue)].filter(Boolean).join(", "));

    if (venue.latitude !== null && venue.longitude !== null) {
        return `https://maps.apple.com/?ll=${venue.latitude},${venue.longitude}&q=${query}`;
    }

    return `https://maps.apple.com/?q=${query}`;
};

export const openExternalVenueMapAsync = async (venue: EventVenueSummary): Promise<void> => {
    const url = createExternalMapUrl(venue);
    const canOpenUrl = await Linking.canOpenURL(url);

    if (!canOpenUrl) {
        throw new Error("VENUE_MAP_OPEN_FAILED");
    }

    await Linking.openURL(url);
};

export const createVenueMapOpenErrorMessage = (error: unknown, language: "fi" | "en"): string => {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("VENUE_MAP_OPEN_FAILED") || message.includes("Could not open map URL")) {
        return language === "fi"
            ? "Karttasovellusta ei voitu avata tällä laitteella."
            : "The map app could not be opened on this device.";
    }

    return message.length > 0
        ? message
        : language === "fi"
            ? "Karttaa ei voitu avata."
            : "Could not open the map.";
};

export const StudentEventVenueMap = ({ venues }: StudentEventVenueMapProps) => {
    const { language, theme } = useUiPreferences();
    const styles = useThemeStyles(createStyles);
    const [openMapError, setOpenMapError] = useState<string | null>(null);
    const pins = useMemo(() => createVenuePins(venues), [venues]);

    const handleVenuePress = (venue: EventVenueSummary): void => {
        setOpenMapError(null);
        openExternalVenueMapAsync(venue).catch((error: unknown) => {
            setOpenMapError(createVenueMapOpenErrorMessage(error, language));
        });
    };

    if (venues.length === 0) {
        return (
            <EmptyStateCard
                body={
                    language === "fi"
                        ? "Kun järjestäjä lisää tapahtuman pisteet, ne näkyvät tässä kartassa."
                        : "When the organizer adds venues, they will appear on this map."
                }
                iconName="map-pin"
                title={language === "fi" ? "Pisteitä ei ole vielä" : "No venues yet"}
            />
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.mapSurface}>
                <View style={[styles.mapPath, styles.mapPathPrimary]} />
                <View style={[styles.mapPath, styles.mapPathSecondary]} />
                <View style={[styles.mapBlock, styles.mapBlockTop]} />
                <View style={[styles.mapBlock, styles.mapBlockBottom]} />

                {pins.map((pin) => (
                    <Pressable
                        key={pin.venue.id}
                        onPress={() => handleVenuePress(pin.venue)}
                        style={[
                            styles.pin,
                            {
                                left: `${pin.leftPercent}%`,
                                top: `${pin.topPercent}%`,
                            },
                        ]}
                    >
                        <View style={styles.pinStem} />
                        <CoverImageSurface
                            imageStyle={styles.pinLogoImage}
                            source={pin.venue.logoUrl === null ? null : { uri: pin.venue.logoUrl }}
                            style={styles.pinLogoSurface}
                        >
                            {pin.venue.logoUrl === null ? (
                                <AppIcon color={theme.colors.textPrimary} name="business" size={17} />
                            ) : null}
                        </CoverImageSurface>
                    </Pressable>
                ))}
            </View>

            {openMapError !== null ? <Text style={styles.errorText}>{openMapError}</Text> : null}

            <View style={styles.venueList}>
                {venues.map((venue) => (
                    <Pressable key={venue.id} onPress={() => handleVenuePress(venue)} style={styles.venueRow}>
                        <CoverImageSurface
                            imageStyle={styles.venueLogoImage}
                            source={venue.logoUrl === null ? null : { uri: venue.logoUrl }}
                            style={styles.venueLogoSurface}
                        >
                            {venue.logoUrl === null ? (
                                <AppIcon color={theme.colors.textPrimary} name="business" size={17} />
                            ) : null}
                        </CoverImageSurface>
                        <View style={styles.venueCopy}>
                            <Text style={styles.venueTitle}>{venue.name}</Text>
                            <Text style={styles.venueAddress}>{createVenueAddressLine(venue)}</Text>
                        </View>
                        <AppIcon color={theme.colors.lime} name="map-pin" size={18} />
                    </Pressable>
                ))}
            </View>
        </View>
    );
};

const createStyles = (theme: MobileTheme) =>
    StyleSheet.create({
        bodyText: {
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.families.regular,
            fontSize: theme.typography.sizes.bodySmall,
            lineHeight: theme.typography.lineHeights.bodySmall,
        },
        container: {
            gap: 14,
        },
        emptyCard: {
            backgroundColor: theme.colors.surfaceL2,
            borderColor: theme.colors.borderDefault,
            borderRadius: theme.radius.card,
            borderWidth: 1,
            gap: 8,
            padding: 16,
        },
        emptyTitle: {
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.families.bold,
            fontSize: theme.typography.sizes.body,
            lineHeight: theme.typography.lineHeights.body,
        },
        errorText: {
            color: theme.colors.danger,
            fontFamily: theme.typography.families.medium,
            fontSize: theme.typography.sizes.caption,
            lineHeight: theme.typography.lineHeights.caption,
        },
        mapBlock: {
            backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.42)",
            borderColor: theme.colors.borderSubtle,
            borderRadius: theme.radius.inner,
            borderWidth: 1,
            position: "absolute",
        },
        mapBlockBottom: {
            bottom: 20,
            height: 70,
            right: 24,
            width: 104,
        },
        mapBlockTop: {
            height: 76,
            left: 18,
            top: 18,
            width: 122,
        },
        mapPath: {
            backgroundColor: theme.mode === "dark" ? "rgba(151, 210, 88, 0.2)" : "rgba(45, 89, 39, 0.12)",
            borderRadius: 999,
            height: 9,
            left: -16,
            position: "absolute",
            right: -16,
        },
        mapPathPrimary: {
            top: 88,
            transform: [{ rotate: "-12deg" }],
        },
        mapPathSecondary: {
            top: 154,
            transform: [{ rotate: "15deg" }],
        },
        mapSurface: {
            backgroundColor: theme.mode === "dark" ? "#182018" : "#DCE8D4",
            borderColor: theme.colors.borderDefault,
            borderRadius: theme.radius.scene,
            borderWidth: 1,
            height: 258,
            overflow: "hidden",
            position: "relative",
        },
        pin: {
            alignItems: "center",
            height: 50,
            justifyContent: "center",
            marginLeft: -22,
            marginTop: -34,
            position: "absolute",
            width: 44,
            zIndex: 3,
        },
        pinLogoImage: {
            borderRadius: 999,
        },
        pinLogoSurface: {
            alignItems: "center",
            backgroundColor: theme.colors.surfaceL1,
            borderColor: theme.colors.limeBorder,
            borderRadius: 999,
            borderWidth: 2,
            height: 38,
            justifyContent: "center",
            overflow: "hidden",
            width: 38,
        },
        pinStem: {
            backgroundColor: theme.colors.lime,
            borderRadius: 999,
            bottom: 6,
            height: 18,
            position: "absolute",
            width: 5,
            zIndex: -1,
        },
        venueAddress: {
            color: theme.colors.textMuted,
            fontFamily: theme.typography.families.regular,
            fontSize: theme.typography.sizes.caption,
            lineHeight: theme.typography.lineHeights.caption,
        },
        venueCopy: {
            flex: 1,
            gap: 3,
            minWidth: 0,
        },
        venueList: {
            gap: 8,
        },
        venueLogoImage: {
            borderRadius: 999,
        },
        venueLogoSurface: {
            alignItems: "center",
            backgroundColor: theme.colors.surfaceL2,
            borderColor: theme.colors.borderDefault,
            borderRadius: 999,
            borderWidth: 1,
            height: 40,
            justifyContent: "center",
            overflow: "hidden",
            width: 40,
        },
        venueRow: {
            alignItems: "center",
            backgroundColor: theme.colors.surfaceL2,
            borderColor: theme.colors.borderSubtle,
            borderRadius: theme.radius.inner,
            borderWidth: theme.mode === "light" ? 1 : 0,
            flexDirection: "row",
            gap: 10,
            padding: 12,
        },
        venueTitle: {
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.families.semibold,
            fontSize: theme.typography.sizes.bodySmall,
            lineHeight: theme.typography.lineHeights.bodySmall,
        },
    });
