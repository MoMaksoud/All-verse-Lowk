import type { FirestoreOrder } from '@/lib/types/firestore';

export type OrderActorRole = 'buyer' | 'seller' | 'system' | 'none';
export type AllowedOrderStatus = FirestoreOrder['status'];

export const ORDER_STATE_TRANSITIONS: Record<
  AllowedOrderStatus,
  Partial<Record<Exclude<OrderActorRole, 'none'>, AllowedOrderStatus[]>>
> = {
  pending: {
    buyer: ['cancelled'],
    system: ['paid', 'cancelled'],
  },
  paid: {
    seller: ['shipped'],
  },
  shipped: {
    buyer: ['delivered'],
  },
  delivered: {},
  cancelled: {},
};

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

export function canTransitionOrderStatus(
  currentStatus: AllowedOrderStatus,
  nextStatus: AllowedOrderStatus,
  actorRole: OrderActorRole
): boolean {
  if (currentStatus === nextStatus) return true;
  if (actorRole === 'none') return false;
  const allowed = ORDER_STATE_TRANSITIONS[currentStatus][actorRole] || [];
  return allowed.includes(nextStatus);
}

export function getPrimarySellerId(order: FirestoreOrder): string | null {
  return order.items[0]?.sellerId ?? null;
}

export function canCreateShippingLabel(order: FirestoreOrder, userId: string): boolean {
  const primarySellerId = getPrimarySellerId(order);
  if (!primarySellerId || userId !== primarySellerId) return false;
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
