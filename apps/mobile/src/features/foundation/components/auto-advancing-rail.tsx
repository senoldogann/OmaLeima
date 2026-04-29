import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import type { MobileTheme } from "@/features/foundation/theme";
import { useThemeStyles } from "@/features/preferences/ui-preferences-provider";

type AutoAdvancingRailProps<TItem> = {
  contentContainerStyle?: StyleProp<ViewStyle>;
  intervalMs: number;
  itemGap: number;
  itemWidth: number;
  items: readonly TItem[];
  keyExtractor: (item: TItem, index: number) => string;
  railStyle?: StyleProp<ViewStyle>;
  renderItem: (item: TItem, index: number) => ReactNode;
  showsIndicators: boolean;
};

const createOffset = (index: number, itemWidth: number, itemGap: number): number =>
  index * (itemWidth + itemGap);

const getNearestIndex = (offsetX: number, itemWidth: number, itemGap: number, itemCount: number): number => {
  if (itemCount <= 1) {
    return 0;
  }

  const rawIndex = Math.round(offsetX / (itemWidth + itemGap));
  const clampedIndex = Math.max(0, Math.min(rawIndex, itemCount - 1));

  return clampedIndex;
};

export const AutoAdvancingRail = <TItem,>({
  contentContainerStyle,
  intervalMs,
  itemGap,
  itemWidth,
  items,
  keyExtractor,
  railStyle,
  renderItem,
  showsIndicators,
}: AutoAdvancingRailProps<TItem>) => {
  const styles = useThemeStyles(createStyles);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [lastInteractionAt, setLastInteractionAt] = useState<number>(Date.now());

  useEffect(() => {
    setActiveIndex(0);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) {
      return;
    }

    const intervalId = setInterval(() => {
      if (Date.now() - lastInteractionAt < intervalMs) {
        return;
      }

      setActiveIndex((currentIndex) => {
        const nextIndex = currentIndex >= items.length - 1 ? 0 : currentIndex + 1;

        scrollViewRef.current?.scrollTo({
          animated: true,
          x: createOffset(nextIndex, itemWidth, itemGap),
          y: 0,
        });

        return nextIndex;
      });
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [intervalMs, itemGap, itemWidth, items.length, lastInteractionAt]);

  const handleInteraction = (): void => {
    setLastInteractionAt(Date.now());
  };

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const nextIndex = getNearestIndex(
      event.nativeEvent.contentOffset.x,
      itemWidth,
      itemGap,
      items.length
    );

    setActiveIndex(nextIndex);
    handleInteraction();
  };

  return (
    <View style={railStyle}>
      <ScrollView
        contentContainerStyle={contentContainerStyle}
        decelerationRate="fast"
        horizontal
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollBeginDrag={handleInteraction}
        onScrollEndDrag={handleInteraction}
        ref={scrollViewRef}
        showsHorizontalScrollIndicator={showsIndicators}
        snapToAlignment="start"
        snapToInterval={itemWidth + itemGap}
      >
        {items.map((item, index) => (
          <View
            key={keyExtractor(item, index)}
            style={[styles.itemWrap, { marginRight: index === items.length - 1 ? 0 : itemGap, width: itemWidth }]}
          >
            {renderItem(item, index)}
          </View>
        ))}
      </ScrollView>

      {items.length > 1 ? (
        <View style={styles.indicatorRow}>
          {items.map((item, index) => (
            <View
              key={`${keyExtractor(item, index)}-dot`}
              style={[styles.indicatorDot, index === activeIndex ? styles.indicatorDotActive : null]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const createStyles = (theme: MobileTheme) =>
  StyleSheet.create({
    indicatorDot: {
      backgroundColor: theme.colors.borderStrong,
      borderRadius: 999,
      height: 6,
      width: 6,
    },
    indicatorDotActive: {
      backgroundColor: theme.colors.lime,
      width: 18,
    },
    indicatorRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
      justifyContent: "center",
      marginTop: 12,
    },
    itemWrap: {
      flexShrink: 0,
    },
  });
