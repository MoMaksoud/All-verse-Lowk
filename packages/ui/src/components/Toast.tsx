import React, { useEffect, useState } from 'react';
import { View, Text, Animated, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { getSpacing, getFontSize, getBorderRadius, toFontWeight } from '../utils';

export interface ToastProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose?: () => void;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  messageStyle?: TextStyle;
}

const toastTypes = {
  success: {
    backgroundColor: colors.success[50],
    borderColor: colors.success[200],
    icon: '✓',
    iconColor: colors.success[600],
  },
  error: {
    backgroundColor: colors.error[50],
    borderColor: colors.error[200],
    icon: '✕',
    iconColor: colors.error[600],
  },
  warning: {
    backgroundColor: colors.warning[50],
    borderColor: colors.warning[200],
    icon: '⚠',
    iconColor: colors.warning[600],
  },
  info: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[200],
    icon: 'ℹ',
    iconColor: colors.primary[600],
  },
};

export const Toast: React.FC<ToastProps> = ({
  type = 'info',
  title,
  message,
  duration = 5000,
  onClose,
  style,
  titleStyle,
  messageStyle,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, fadeAnim, slideAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose?.();
    });
  };

  const toastType = toastTypes[type];

  const containerStyle: ViewStyle = {
    position: 'absolute',
    top: getSpacing(4),
    left: getSpacing(4),
    right: getSpacing(4),
    backgroundColor: toastType.backgroundColor,
    borderWidth: 1,
    borderColor: toastType.borderColor,
    borderRadius: getBorderRadius('lg'),
    padding: getSpacing(4),
    shadowColor: colors.gray[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
    ...style,
  };

  const headerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const iconStyle: TextStyle = {
    fontSize: getFontSize('lg'),
    color: toastType.iconColor,
    marginRight: getSpacing(3),
  };

  const titleStyleObj: TextStyle = {
    fontSize: getFontSize('lg'),
    fontWeight: toFontWeight(typography.fontWeights.semibold),
    color: colors.gray[900],
    flex: 1,
    ...titleStyle,
  };

  const messageStyleObj: TextStyle = {
    fontSize: getFontSize('sm'),
    color: colors.gray[600],
    marginTop: getSpacing(1),
    ...messageStyle,
  };

  const closeButtonStyle: ViewStyle = {
    padding: getSpacing(1),
    marginLeft: getSpacing(2),
  };

  return (
    <Animated.View
      style={[
        containerStyle,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={headerStyle}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Text style={iconStyle}>{toastType.icon}</Text>
          <Text style={titleStyleObj}>{title}</Text>
        </View>
        
        {onClose && (
          <TouchableOpacity style={closeButtonStyle} onPress={handleClose}>
            <Text style={{ fontSize: getFontSize('sm'), color: colors.gray[500] }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {message && <Text style={messageStyleObj}>{message}</Text>}
    </Animated.View>
  );
};
