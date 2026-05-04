import { useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type { ImageSourcePropType, ImageStyle, StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";

import { Image as ExpoImage } from "expo-image";

import type { MobileTheme } from "@/features/foundation/theme";
import {
  getRemoteImageSourceUri,
  isKnownBrokenRemoteImageSource,
  markRemoteImageUrlBroken,
} from "@/features/media/remote-image-health";
import { useThemeStyles } from "@/features/preferences/ui-preferences-provider";

type CoverImageSurfaceProps = PropsWithChildren<{
  fallbackSource?: ImageSourcePropType | null;
  imageStyle?: StyleProp<ImageStyle>;
  source: ImageSourcePropType | null | undefined;
  style?: StyleProp<ViewStyle>;
}>;

const createSourceKey = (source: ImageSourcePropType | null | undefined): string => {
  if (source === null || source === undefined) {
    return "empty";
  }

  if (typeof source === "number") {
    return `asset:${source}`;
  }

  if (Array.isArray(source)) {
    return source.map((sourceItem) => createSourceKey(sourceItem)).join("|");
  }

  if (typeof source.uri === "string") {
    return source.uri;
  }

  return JSON.stringify(source);
};

export const CoverImageSurface = ({
  children,
  fallbackSource,
  imageStyle,
  source,
  style,
}: CoverImageSurfaceProps) => {
  const styles = useThemeStyles(createStyles);
  const sourceKey = useMemo(() => createSourceKey(source), [source]);
  const [hasImageError, setHasImageError] = useState(false);
  const shouldRenderImage = source !== null && source !== undefined && !hasImageError && !isKnownBrokenRemoteImageSource(source);

  useEffect(() => {
    setHasImageError(false);
  }, [sourceKey]);

  return (
    <View style={style}>
      <View style={styles.fallback} />
      {fallbackSource !== null && fallbackSource !== undefined ? (
        <ExpoImage
          cachePolicy="memory-disk"
          contentFit="cover"
          source={fallbackSource}
          style={[styles.image, imageStyle]}
        />
      ) : null}
      {shouldRenderImage ? (
        <ExpoImage
          cachePolicy="memory-disk"
          contentFit="cover"
          onError={() => {
            const remoteSourceUri = getRemoteImageSourceUri(source);

            if (remoteSourceUri !== null) {
              markRemoteImageUrlBroken(remoteSourceUri);
            }

            setHasImageError(true);
          }}
          source={source}
          style={[styles.image, imageStyle]}
          transition={180}
        />
      ) : null}
      {children}
    </View>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    fallback: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.surfaceL2,
    },
    image: {
      ...StyleSheet.absoluteFillObject,
    },
  });
