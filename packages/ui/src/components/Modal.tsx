import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal as RNModal, ViewStyle, TextStyle } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../theme';
import { getSpacing, getFontSize, getBorderRadius, toFontWeight } from '../utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

const modalSizes = {
  sm: { width: '80%' as const, maxWidth: 400 },
  md: { width: '90%' as const, maxWidth: 600 },
  lg: { width: '95%' as const, maxWidth: 800 },
  full: { width: '100%' as const, height: '100%' as const },
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  style,
  contentStyle,
}) => {
  useEffect(() => {
    // Handle escape key or back button
    const handleBackdropPress = () => {
      onClose();
    };

    return () => {
      // Cleanup if needed
    };
  }, [onClose]);

  const overlayStyle: ViewStyle = {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: getSpacing(4),
  };

  const modalStyle: ViewStyle = {
    backgroundColor: colors.light.background,
    borderRadius: getBorderRadius('lg'),
    padding: getSpacing(4),
    maxHeight: '80%',
    ...modalSizes[size],
    ...style,
  };

  const headerStyle: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: title ? getSpacing(4) : 0,
  };

  const titleStyle: TextStyle = {
    fontSize: getFontSize('lg'),
    fontWeight: toFontWeight(typography.fontWeights.semibold),
    color: colors.gray[900],
    flex: 1,
  };

  const closeButtonStyle: ViewStyle = {
    padding: getSpacing(2),
    marginLeft: getSpacing(2),
  };

  const contentContainerStyle: ViewStyle = {
    ...contentStyle,
  };

  return (
    <RNModal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={overlayStyle}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={modalStyle}
          activeOpacity={1}
          onPress={() => {}}
        >
                      {(title || !!onClose) && (
              <View style={headerStyle}>
                {title && <Text style={titleStyle}>{title}</Text>}
                {onClose && (
                  <TouchableOpacity style={closeButtonStyle} onPress={onClose}>
                    <Text style={{ fontSize: getFontSize('lg'), color: colors.gray[500] }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          
          <View style={contentContainerStyle}>
            {children}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </RNModal>
  );
};
