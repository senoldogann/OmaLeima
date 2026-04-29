import type { PropsWithChildren } from "react";
import type { ImageSourcePropType, ImageStyle, StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";

import { Image as ExpoImage } from "expo-image";

import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles } from "@/features/preferences/ui-preferences-provider";

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
}: CoverImageSurfaceProps) => {
  const styles = useThemeStyles(createStyles);

  return (
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
