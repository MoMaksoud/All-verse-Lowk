import React, { forwardRef } from 'react';
import { TextInput, View, Text, ViewStyle, TextStyle } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { getSpacing, getFontSize, getBorderRadius, toFontWeight, toNumber } from '../utils';

export interface InputProps {
  value?: string;
  placeholder?: string;
  onChangeText?: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(({
  value,
  placeholder,
  onChangeText,
  onFocus,
  onBlur,
  label,
  error,
  disabled = false,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  leftIcon,
  rightIcon,
  style,
  inputStyle,
  containerStyle,
}, ref) => {
  const hasError = !!error;
  const isDisabled = disabled;

  const containerStyles: ViewStyle = {
    marginBottom: getSpacing(4),
    ...containerStyle,
  };

  const inputContainerStyles: ViewStyle = {
    flexDirection: 'row',
    alignItems: multiline ? 'flex-start' : 'center',
    borderWidth: 1,
    borderColor: hasError ? colors.error[500] : colors.gray[300],
    borderRadius: getBorderRadius('lg'),
    backgroundColor: isDisabled ? colors.gray[100] : colors.light.background,
    paddingHorizontal: getSpacing(4),
    paddingVertical: multiline ? getSpacing(3) : getSpacing(3),
    minHeight: multiline ? numberOfLines * 24 + getSpacing(6) : 48,
    ...style,
  };

  const inputStyles: TextStyle = {
    flex: 1,
    fontSize: getFontSize('base'),
    color: isDisabled ? colors.gray[500] : colors.gray[900],
    lineHeight: toNumber(typography.lineHeights.normal),
    ...inputStyle,
  };

  const labelStyles: TextStyle = {
    fontSize: getFontSize('sm'),
    fontWeight: toFontWeight(typography.fontWeights.medium),
    color: colors.gray[700],
    marginBottom: getSpacing(2),
  };

  const errorStyles: TextStyle = {
    fontSize: getFontSize('sm'),
    color: colors.error[600],
    marginTop: getSpacing(1),
  };

  const placeholderColor = isDisabled ? colors.gray[400] : colors.gray[500];

  return (
    <View style={containerStyles}>
      {label && (
        <Text style={labelStyles}>{label}</Text>
      )}
      
      <View style={inputContainerStyles}>
        {leftIcon && (
          <View style={{ marginRight: getSpacing(3), marginTop: multiline ? getSpacing(1) : 0 }}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          ref={ref}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          editable={!isDisabled}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          style={inputStyles}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        
        {rightIcon && (
          <View style={{ marginLeft: getSpacing(3), marginTop: multiline ? getSpacing(1) : 0 }}>
            {rightIcon}
          </View>
        )}
      </View>
      
      {hasError && (
        <Text style={errorStyles}>{error}</Text>
      )}
    </View>
  );
});

Input.displayName = 'Input';
