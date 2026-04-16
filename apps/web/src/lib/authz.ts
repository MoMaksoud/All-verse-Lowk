import type { FirestoreOrder } from '@/lib/types/firestore';

export type OrderActorRole = 'buyer' | 'seller' | 'none';

export function isOrderBuyer(order: FirestoreOrder, userId: string): boolean {
  return order.buyerId === userId;
}

export function isOrderSeller(order: FirestoreOrder, userId: string): boolean {
  if (Array.isArray(order.sellerIds) && order.sellerIds.includes(userId)) {
    return true;
  }
  return order.items.some((item) => item.sellerId === userId);
}

export function getOrderActorRole(order: FirestoreOrder, userId: string): OrderActorRole {
  if (isOrderBuyer(order, userId)) return 'buyer';
  if (isOrderSeller(order, userId)) return 'seller';
  return 'none';
}

export function canAccessOrder(order: FirestoreOrder, userId: string): boolean {
  return getOrderActorRole(order, userId) !== 'none';
}

export type AllowedOrderStatus = FirestoreOrder['status'];

export function canTransitionOrderStatus(
  currentStatus: AllowedOrderStatus,
  nextStatus: AllowedOrderStatus,
  actorRole: OrderActorRole
): boolean {
  if (currentStatus === nextStatus) return true;
  if (actorRole === 'none') return false;

  // Buyer actions: cancel pending order, or confirm delivery for shipped order.
  if (actorRole === 'buyer') {
    return (
      (currentStatus === 'pending' && nextStatus === 'cancelled') ||
      (currentStatus === 'shipped' && nextStatus === 'delivered')
    );
  }

  // Seller action: mark paid order as shipped.
  if (actorRole === 'seller') {
    return currentStatus === 'paid' && nextStatus === 'shipped';
  }

  return false;
}

export function canCreateShippingLabel(order: FirestoreOrder, userId: string): boolean {
  if (!isOrderSeller(order, userId)) return false;
  return order.status === 'paid' || order.status === 'shipped' || order.status === 'delivered';
}

export function isDevOrTestRouteAllowed(
  nodeEnv: string | undefined,
  providedToken: string | null,
  requiredToken: string | undefined
): boolean {
  if (nodeEnv === 'production') return false;
  if (!requiredToken?.trim()) return true;
  return providedToken === requiredToken.trim();
}
