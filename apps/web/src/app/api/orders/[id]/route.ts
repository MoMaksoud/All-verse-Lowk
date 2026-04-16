import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { firestoreServices } from "@/lib/services/firestore";
import { success, error } from "@/lib/response";
import { notFound, badRequest, unauthorized } from "@marketplace/shared-logic";
import { UpdateOrderInput } from "@/lib/types/firestore";
import { canAccessOrder, canTransitionOrderStatus, getOrderActorRole } from "@/lib/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req: NextRequest & { userId: string }, { params }: { params: { id: string } }) => {
  try {
    const order = await firestoreServices.orders.getOrder(params.id);
    if (!order) {
      return error(notFound("Order not found"));
    }

    if (!canAccessOrder(order as any, req.userId)) {
      return error(unauthorized("You don't have permission to view this order"));
    }

    return success(order);
  } catch (err) {
    console.error('Error fetching order:', err);
    return error(notFound("Order not found"));
  }
});

export const PATCH = withApi(async (req: NextRequest & { userId: string }, { params }: { params: { id: string } }) => {
  try {
    const order = await firestoreServices.orders.getOrder(params.id);
    if (!order) {
      return error(notFound("Order not found"));
    }

    if (!canAccessOrder(order as any, req.userId)) {
      return error(unauthorized("You don't have permission to update this order"));
    }

    const updates = await req.json() as UpdateOrderInput;
    // Restrict mutable fields from this endpoint to a single status transition.
    const updateKeys = Object.keys(updates || {});
    if (updateKeys.length !== 1 || !('status' in updates) || !updates.status) {
      return error(badRequest("Only order status updates are allowed from this endpoint"));
    }

    const actorRole = getOrderActorRole(order as any, req.userId);
    const canTransition = canTransitionOrderStatus(order.status as any, updates.status, actorRole);
    if (!canTransition) {
      return error(unauthorized("You don't have permission for this status transition"));
    }

    await firestoreServices.orders.updateOrder(params.id, { status: updates.status });
    
    const updatedOrder = await firestoreServices.orders.getOrder(params.id);
    return success(updatedOrder);
  } catch (err) {
    console.error('Error updating order:', err);
    return error(badRequest("Failed to update order"));
  }
});
