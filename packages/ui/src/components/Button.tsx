import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { cn } from '@marketplace/lib';
import { colors, typography, spacing, borderRadius } from '../theme';
import { getSpacing, getFontSize, getBorderRadius, toFontWeight } from '../utils';

export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const buttonVariants = {
  primary: {
    container: {
      backgroundColor: colors.primary[600],
      borderColor: colors.primary[600],
    },
    text: {
      color: colors.light.background,
    },
    disabled: {
      backgroundColor: colors.gray[300],
      borderColor: colors.gray[300],
    },
    disabledText: {
      color: colors.gray[500],
    },
  },
  secondary: {
    container: {
      backgroundColor: colors.gray[100],
      borderColor: colors.gray[200],
    },
    text: {
      color: colors.gray[900],
    },
    disabled: {
      backgroundColor: colors.gray[100],
      borderColor: colors.gray[200],
    },
    disabledText: {
      color: colors.gray[400],
    },
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderColor: colors.gray[300],
      borderWidth: 1,
    },
    text: {
      color: colors.gray[700],
    },
    disabled: {
      backgroundColor: 'transparent',
      borderColor: colors.gray[200],
      borderWidth: 1,
    },
    disabledText: {
      color: colors.gray[400],
    },
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
    text: {
      color: colors.gray[700],
    },
    disabled: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
    disabledText: {
      color: colors.gray[400],
    },
  },
  destructive: {
    container: {
      backgroundColor: colors.error[600],
      borderColor: colors.error[600],
    },
    text: {
      color: colors.light.background,
    },
    disabled: {
      backgroundColor: colors.error[200],
      borderColor: colors.error[200],
    },
    disabledText: {
      color: colors.error[400],
    },
  },
};

const buttonSizes = {
  sm: {
    container: {
      paddingHorizontal: getSpacing(3),
      paddingVertical: getSpacing(2),
      borderRadius: getBorderRadius('md'),
    },
    text: {
      fontSize: getFontSize('sm'),
      fontWeight: toFontWeight(typography.fontWeights.medium),
    },
  },
  md: {
    container: {
      paddingHorizontal: getSpacing(4),
      paddingVertical: getSpacing(3),
      borderRadius: getBorderRadius('lg'),
    },
    text: {
      fontSize: getFontSize('base'),
      fontWeight: toFontWeight(typography.fontWeights.medium),
    },
  },
  lg: {
    container: {
      paddingHorizontal: getSpacing(6),
      paddingVertical: getSpacing(4),
      borderRadius: getBorderRadius('xl'),
    },
    text: {
      fontSize: getFontSize('lg'),
      fontWeight: toFontWeight(typography.fontWeights.semibold),
    },
  },
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onPress,
  style,
  textStyle,
  fullWidth = false,
  leftIcon,
  rightIcon,
}) => {
  const variantStyles = buttonVariants[variant];
  const sizeStyles = buttonSizes[size];
  
  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...sizeStyles.container,
    ...(disabled ? variantStyles.disabled : variantStyles.container),
    ...(fullWidth && { width: '100%' }),
    ...style,
  };

  const textStyleObj: TextStyle = {
    ...sizeStyles.text,
    ...(disabled ? variantStyles.disabledText : variantStyles.text),
    textAlign: 'center',
    ...textStyle,
  };

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={disabled ? colors.gray[400] : variantStyles.text.color}
          style={{ marginRight: getSpacing(2) }}
        />
      ) : (
        <>
          {leftIcon && (
            <Text style={{ marginRight: getSpacing(2) }}>{leftIcon}</Text>
          )}
        </>
      )}
      
      <Text style={textStyleObj}>{children}</Text>
      
      {!loading && rightIcon && (
        <Text style={{ marginLeft: getSpacing(2) }}>{rightIcon}</Text>
      )}
    </TouchableOpacity>
  );
};
