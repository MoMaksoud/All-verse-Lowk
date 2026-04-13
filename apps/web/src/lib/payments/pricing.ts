export const DEFAULT_TAX_RATE = 0.08;

export function calculateStripeFees(amount: number): number {
  const percentageFee = amount * 0.029;
  const fixedFee = 0.3;
  return percentageFee + fixedFee;
}

export function calculateCheckoutTotals(
  subtotal: number,
  shipping: number = 0,
  taxRate: number = DEFAULT_TAX_RATE
): {
  subtotal: number;
  tax: number;
  fees: number;
  shipping: number;
  total: number;
} {
  const tax = subtotal * taxRate;
  const taxableAmount = subtotal + shipping + tax;
  const fees = calculateStripeFees(taxableAmount);
  const total = subtotal + shipping + tax + fees;

  return {
    subtotal,
    tax,
    fees,
    shipping,
    total,
  };
}
