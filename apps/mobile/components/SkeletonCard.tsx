import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, ViewStyle } from 'react-native';
import { colors, spacing, radii } from '../constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 56) / 2; // mirrors ListingCard grid width
const CARD_IMAGE_HEIGHT = CARD_WIDTH * 1.1;

interface SkeletonBlockProps {
  width?: ViewStyle['width'];
  height?: ViewStyle['height'];
  radius?: number;
  style?: ViewStyle;
}

/**
 * Single animated skeleton block. Wraps the web Skeleton's `animate-pulse`
 * in an Animated loop since RN has no CSS animations.
 */
function SkeletonBlock({ width: w = '100%', height = 16, radius = radii.md, style }: SkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: w,
          height,
          borderRadius: radius,
          backgroundColor: colors.bg.raised,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Mobile port of apps/web/src/components/SkeletonLoader.tsx#SkeletonCard.
 * Matches the grid dimensions of ListingCard so the initial loading state
 * doesn't cause layout shift when real listings arrive.
 */
export default function SkeletonCard() {
  return (
    <View style={[styles.card, { width: CARD_WIDTH }]}>
      <SkeletonBlock
        width="100%"
        height={CARD_IMAGE_HEIGHT}
        radius={0}
      />
      <View style={styles.content}>
        <SkeletonBlock width="80%" height={16} />
        <SkeletonBlock width="100%" height={12} />
        <SkeletonBlock width="60%" height={12} />
        <View style={styles.footer}>
          <SkeletonBlock width={56} height={16} />
          <SkeletonBlock width={28} height={28} radius={radii.full} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  content: {
    padding: spacing.md + 2,
    gap: spacing.sm,
    minHeight: 120,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
});
