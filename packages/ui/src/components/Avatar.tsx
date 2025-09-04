import React from 'react';
import { View, Text, Image, ViewStyle, TextStyle } from 'react-native';
import { getInitials } from '@marketplace/lib';
import { colors, typography, borderRadius } from '../theme';
import { getFontSize, getBorderRadius, toFontWeight } from '../utils';

export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const avatarSizes = {
  sm: {
    width: 32,
    height: 32,
    fontSize: getFontSize('xs'),
  },
  md: {
    width: 40,
    height: 40,
    fontSize: getFontSize('sm'),
  },
  lg: {
    width: 48,
    height: 48,
    fontSize: getFontSize('base'),
  },
  xl: {
    width: 64,
    height: 64,
    fontSize: getFontSize('lg'),
  },
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'md',
  fallback,
  style,
  textStyle,
}) => {
  const sizeConfig = avatarSizes[size];
  const initials = fallback ? getInitials(fallback) : (alt ? getInitials(alt) : '?');

  const containerStyle: ViewStyle = {
    width: sizeConfig.width,
    height: sizeConfig.height,
    borderRadius: getBorderRadius('full'),
    backgroundColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...style,
  };

  const textStyleObj: TextStyle = {
    fontSize: sizeConfig.fontSize,
    fontWeight: toFontWeight(typography.fontWeights.medium),
    color: colors.gray[700],
    textAlign: 'center',
    ...textStyle,
  };

  if (src) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: src }}
          style={{
            width: sizeConfig.width,
            height: sizeConfig.height,
            borderRadius: getBorderRadius('full'),
          }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Text style={textStyleObj}>{initials}</Text>
    </View>
  );
};
