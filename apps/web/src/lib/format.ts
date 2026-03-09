/**
 * Format a number as USD price with commas for thousands and 2 decimal places.
 * e.g. 1899 -> "$1,899.00", 699.5 -> "$699.50"
 */
export function formatPrice(value: number | string): string {
  const num =
    typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  if (Number.isNaN(num)) return '$0.00';
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Format a number with commas (no decimals by default).
 * e.g. 12345 -> "12,345"
 */
export function formatNumber(value: number | string, decimals = 0): string {
  const num =
    typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  if (Number.isNaN(num)) return decimals > 0 ? '0.' + '0'.repeat(decimals) : '0';
  if (decimals > 0) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return Math.round(num).toLocaleString('en-US');
}
