import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles } from "@/features/preferences/ui-preferences-provider";

type SkeletonBlockProps = {
  height?: number;
  width?: number | `${number}%`;
  borderRadius?: number;
};

const SkeletonRow = ({ height = 16, width = "100%", borderRadius = 6 }: SkeletonBlockProps) => {
  const shimmer = useRef(new Animated.Value(0)).current;
  const styles = useThemeStyles(createStyles);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });

  return (
    <Animated.View
      style={[styles.bone, { height, width, borderRadius, opacity }]}
    />
  );
};

type SkeletonCardProps = {
  rows?: number;
  hasHeader?: boolean;
};

export const SkeletonCard = ({ rows = 3, hasHeader = true }: SkeletonCardProps) => {
  const styles = useThemeStyles(createStyles);

  return (
    <View style={styles.card}>
      {hasHeader ? (
        <View style={styles.headerRow}>
          <SkeletonRow height={12} width="45%" borderRadius={4} />
          <SkeletonRow height={20} width="70%" borderRadius={6} />
        </View>
      ) : null}
      <View style={styles.bodyRows}>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            height={14}
            width={i === rows - 1 ? "60%" : "100%"}
          />
        ))}
      </View>
    </View>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    bone: {
      backgroundColor: theme.colors.surfaceL2,
    },
    bodyRows: {
      gap: 10,
    },
    card: {
      backgroundColor: theme.colors.surfaceL1,
      borderColor: theme.colors.borderSubtle,
      borderRadius: theme.radius.scene,
      borderWidth: 1,
      gap: 14,
      padding: 18,
    },
    headerRow: {
      gap: 6,
    },
  });
