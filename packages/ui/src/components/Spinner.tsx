import React from 'react';
import { View, ActivityIndicator, Text, ViewStyle, TextStyle } from 'react-native';
import { colors, typography, spacing } from '../theme';
import { getSpacing, getFontSize } from '../utils';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const spinnerSizes = {
  sm: 16,
  md: 24,
  lg: 32,
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = colors.primary[500],
  text,
  style,
  textStyle,
}) => {
  const containerStyle: ViewStyle = {
    alignItems: 'center',
    justifyContent: 'center',
    padding: getSpacing(4),
    ...style,
  };

  const textStyleObj: TextStyle = {
    fontSize: getFontSize('sm'),
    color: colors.gray[600],
    marginTop: getSpacing(3),
    textAlign: 'center',
    ...textStyle,
  };

  return (
    <View style={containerStyle}>
      <ActivityIndicator
        size={spinnerSizes[size]}
        color={color}
      />
      {text && <Text style={textStyleObj}>{text}</Text>}
    </View>
  );
};
