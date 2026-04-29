import type { PropsWithChildren } from "react";
import type { ImageSourcePropType, ImageStyle, StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";

import { Image as ExpoImage } from "expo-image";

import { mobileTheme } from "@/features/foundation/theme";

type CoverImageSurfaceProps = PropsWithChildren<{
  imageStyle?: StyleProp<ImageStyle>;
  source: ImageSourcePropType | null | undefined;
  style?: StyleProp<ViewStyle>;
}>;

export const CoverImageSurface = ({
  children,
  imageStyle,
  source,
  style,
}: CoverImageSurfaceProps) => (
  <View style={style}>
    {source ? (
      <ExpoImage
        cachePolicy="memory-disk"
        contentFit="cover"
        source={source}
        style={[styles.image, imageStyle]}
        transition={180}
      />
    ) : (
      <View style={styles.fallback} />
    )}
    {children}
  </View>
);

const styles = StyleSheet.create({
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: mobileTheme.colors.surfaceL2,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
});
