import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a phone number input to (000) 000-0000 pattern
 * - Strips all non-numeric characters
 * - Limits to 10 digits maximum
 * - Formats based on length:
 *   1-3 digits: (xxx
 *   4-6 digits: (xxx) xxx
 *   7-10 digits: (xxx) xxx-xxxx
 * 
 * @param value - The raw input value (may contain formatting characters)
 * @returns Formatted phone number string
 */
export function formatPhoneNumber(value: string): string {
  // Strip all non-numeric characters
  const digits = value.replace(/\D/g, '');
  
  // Limit to 10 digits
  const limitedDigits = digits.slice(0, 10);
  
  // Format based on length
  if (limitedDigits.length === 0) {
    return '';
  } else if (limitedDigits.length <= 3) {
    return `(${limitedDigits}`;
  } else if (limitedDigits.length <= 6) {
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
  } else {
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
  }
}