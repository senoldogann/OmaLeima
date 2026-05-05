import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  type LayoutChangeEvent,
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
  shouldAdaptHeight?: boolean;
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
  shouldAdaptHeight,
  showsIndicators,
}: AutoAdvancingRailProps<TItem>) => {
  const styles = useThemeStyles(createStyles);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [itemHeightsByKey, setItemHeightsByKey] = useState<Record<string, number>>({});
  const [lastInteractionAt, setLastInteractionAt] = useState<number>(Date.now());
  const itemKeys = useMemo(
    () => items.map((item, index) => keyExtractor(item, index)),
    [items, keyExtractor]
  );
  const itemKeySignature = itemKeys.join("\u001f");
  const activeItemKey = itemKeys[Math.min(activeIndex, Math.max(0, itemKeys.length - 1))] ?? null;
  const activeItemHeight = activeItemKey === null ? null : (itemHeightsByKey[activeItemKey] ?? null);
  const shouldUseAdaptiveHeight = shouldAdaptHeight !== false;
  const adaptiveViewportStyle =
    shouldUseAdaptiveHeight && activeItemHeight !== null
      ? [styles.scrollViewport, { height: activeItemHeight }]
      : styles.scrollViewport;

  useEffect(() => {
    setActiveIndex(0);
    setItemHeightsByKey({});
    scrollViewRef.current?.scrollTo({ animated: false, x: 0, y: 0 });
  }, [itemKeySignature]);

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

  const handleItemLayout = useCallback((itemKey: string, event: LayoutChangeEvent): void => {
    const itemHeight = Math.ceil(event.nativeEvent.layout.height);

    if (itemHeight <= 0) {
      return;
    }

    setItemHeightsByKey((currentHeights) => {
      if (currentHeights[itemKey] === itemHeight) {
        return currentHeights;
      }

      return {
        ...currentHeights,
        [itemKey]: itemHeight,
      };
    });
  }, []);

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
        style={adaptiveViewportStyle}
      >
        {items.map((item, index) => {
          const itemKey = itemKeys[index] ?? keyExtractor(item, index);

          return (
            <View
              key={itemKey}
              onLayout={(event) => handleItemLayout(itemKey, event)}
              style={[styles.itemWrap, { marginRight: index === items.length - 1 ? 0 : itemGap, width: itemWidth }]}
            >
              {renderItem(item, index)}
            </View>
          );
        })}
      </ScrollView>

      {items.length > 1 ? (
        <View style={styles.indicatorRow}>
          {items.map((item, index) => (
            <View
              key={`${itemKeys[index] ?? keyExtractor(item, index)}-dot`}
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
      alignSelf: "flex-start",
      flexShrink: 0,
    },
    scrollViewport: {
      overflow: "hidden",
    },
  });
