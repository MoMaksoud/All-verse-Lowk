import type { FirestoreOrder, OrderShippingSelection } from '@/lib/types/firestore';

/** Narrow view of order fields used by checkout and webhooks (avoid `as any` at boundaries). */
export type OrderCheckoutView = Pick<
  FirestoreOrder,
  'buyerId' | 'total' | 'currency' | 'items' | 'status' | 'shippingAddress' | 'shipping'
> & { id: string };

export function pickShippingForRequote(
  shipping: OrderShippingSelection | undefined
): Pick<OrderShippingSelection, 'rateId' | 'carrier' | 'serviceName'> | undefined {
  if (!shipping) return undefined;
  return {
    rateId: shipping.rateId,
    carrier: shipping.carrier,
    serviceName: shipping.serviceName,
  };
}
