import React from 'react';
import { View, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../theme';
import { getSpacing, getBorderRadius } from '../utils';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  onPress?: () => void;
}

const cardVariants = {
  default: {
    backgroundColor: colors.light.background,
    borderColor: colors.gray[200],
    borderWidth: 1,
    shadowColor: colors.gray[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  elevated: {
    backgroundColor: colors.light.background,
    borderColor: 'transparent',
    borderWidth: 0,
    shadowColor: colors.gray[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  outlined: {
    backgroundColor: colors.light.background,
    borderColor: colors.gray[300],
    borderWidth: 1,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};

const cardPadding = {
  none: 0,
  sm: getSpacing(3),
  md: getSpacing(4),
  lg: getSpacing(6),
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  style,
  onPress,
}) => {
  const variantStyles = cardVariants[variant];
  const paddingValue = cardPadding[padding];

  const cardStyle: ViewStyle = {
    borderRadius: getBorderRadius('lg'),
    ...variantStyles,
    ...(onPress && {
      // Add press feedback styles if needed
    }),
    ...style,
  };

  const contentStyle: ViewStyle = {
    padding: paddingValue,
  };

  if (onPress) {
    return (
      <View style={cardStyle} onTouchEnd={onPress}>
        <View style={contentStyle}>{children}</View>
      </View>
    );
  }

  return (
    <View style={cardStyle}>
      <View style={contentStyle}>{children}</View>
    </View>
  );
};
