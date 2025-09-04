// Utility functions for React Native compatibility

/**
 * Converts CSS-style string values to React Native numeric values
 * Examples: '0.75rem' -> 12, '1rem' -> 16, '9999px' -> 9999
 */
export function toNumber(value: string | number): number {
  if (typeof value === 'number') return value;
  
  // Handle rem values (1rem = 16px typically)
  if (value.includes('rem')) {
    const remValue = parseFloat(value);
    return Math.round(remValue * 16);
  }
  
  // Handle px values
  if (value.includes('px')) {
    return parseInt(value, 10);
  }
  
  // Handle em values (1em = 16px typically)
  if (value.includes('em')) {
    const emValue = parseFloat(value);
    return Math.round(emValue * 16);
  }
  
  // Handle percentage (convert to number, but this might not work well in RN)
  if (value.includes('%')) {
    return parseFloat(value);
  }
  
  // Try to parse as number
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Converts font weight strings to React Native font weight numbers
 */
export function toFontWeight(value: string): 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' {
  const weightMap: Record<string, 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'> = {
    '100': '100',
    '200': '200',
    '300': '300',
    '400': '400',
    'normal': 'normal',
    '500': '500',
    '600': '600',
    '700': '700',
    'bold': 'bold',
    '800': '800',
    '900': '900',
  };
  
  return weightMap[value] || 'normal';
}

/**
 * Creates a numeric spacing value from theme spacing
 */
export function getSpacing(value: keyof typeof import('./theme').spacing): number {
  const spacing = {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    24: 96,
    32: 128,
    40: 160,
    48: 192,
    56: 224,
    64: 256,
  };
  
  return spacing[value] || 0;
}

/**
 * Creates a numeric font size from theme typography
 */
export function getFontSize(value: keyof typeof import('./theme').typography.fontSizes): number {
  const fontSizes = {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  };
  
  return fontSizes[value] || 16;
}

/**
 * Creates a numeric border radius from theme
 */
export function getBorderRadius(value: keyof typeof import('./theme').borderRadius): number {
  const borderRadius = {
    none: 0,
    sm: 2,
    base: 4,
    md: 6,
    lg: 8,
    xl: 12,
    '2xl': 16,
    '3xl': 24,
    full: 9999,
  };
  
  return borderRadius[value] || 0;
}
