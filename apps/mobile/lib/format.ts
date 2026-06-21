/**
 * Single source of truth for money formatting across the app.
 *
 * Rule: whole-dollar amounts render without cents ($1,250); amounts with cents
 * render with two decimals ($1,250.50). Always grouped with thousands commas.
 * Use this everywhere a price is shown so cards, detail, cart, checkout, orders,
 * and the assistant all agree.
 */
export function formatPrice(value: number): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  const hasCents = Math.round(n * 100) % 100 !== 0;
  return (
    '$' +
    n.toLocaleString('en-US', {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}
