import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { colors, typography, spacing } from '../theme';
import { getSpacing, getFontSize, toFontWeight, toNumber } from '../utils';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  descriptionStyle?: TextStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  style,
  titleStyle,
  descriptionStyle,
}) => {
  const containerStyle: ViewStyle = {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: getSpacing(6),
    paddingVertical: getSpacing(12),
    ...style,
  };

  const iconStyle: ViewStyle = {
    marginBottom: getSpacing(6),
    opacity: 0.5,
  };

  const titleStyleObj: TextStyle = {
    fontSize: getFontSize('xl'),
    fontWeight: toFontWeight(typography.fontWeights.semibold),
    color: colors.gray[700],
    textAlign: 'center',
    marginBottom: getSpacing(3),
    ...titleStyle,
  };

  const descriptionStyleObj: TextStyle = {
    fontSize: getFontSize('base'),
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: toNumber(typography.lineHeights.relaxed),
    marginBottom: action ? getSpacing(6) : 0,
    ...descriptionStyle,
  };

  const actionStyle: ViewStyle = {
    alignItems: 'center',
  };

  return (
    <View style={containerStyle}>
      {icon && <View style={iconStyle}>{icon}</View>}
      
      <Text style={titleStyleObj}>{title}</Text>
      
      {description && (
        <Text style={descriptionStyleObj}>{description}</Text>
      )}
      
      {action && <View style={actionStyle}>{action}</View>}
    </View>
  );
};
