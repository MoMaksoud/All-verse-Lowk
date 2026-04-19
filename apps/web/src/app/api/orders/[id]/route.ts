import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { UpdateOrderInput } from "@/lib/types/firestore";
import { getOrderAdmin, updateOrderAdmin } from "@/lib/server/adminOrders";
import { canAccessOrder, canTransitionOrderStatus, getOrderActorRole } from "@/lib/authz";
import { fail, ok } from "@/lib/api/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req: NextRequest & { userId: string }, { params }: { params: { id: string } }) => {
  try {
    const order = await getOrderAdmin(params.id);
    if (!order) {
      return fail({ status: 404, code: "ORDER_NOT_FOUND", message: "Order not found" });
    }

    if (!canAccessOrder(order as any, req.userId)) {
      return fail({ status: 403, code: "FORBIDDEN", message: "You don't have permission to view this order" });
    }

    return ok({ order });
  } catch (err) {
    console.error('Error fetching order:', err);
    return fail({ status: 500, code: "ORDER_FETCH_FAILED", message: "Failed to fetch order" });
  }
});

export const PATCH = withApi(async (req: NextRequest & { userId: string }, { params }: { params: { id: string } }) => {
  try {
    const order = await getOrderAdmin(params.id);
    if (!order) {
      return fail({ status: 404, code: "ORDER_NOT_FOUND", message: "Order not found" });
    }

    if (!canAccessOrder(order as any, req.userId)) {
      return fail({ status: 403, code: "FORBIDDEN", message: "You don't have permission to update this order" });
    }

    const updates = await req.json() as UpdateOrderInput;
    // Restrict mutable fields from this endpoint to a single status transition.
    const updateKeys = Object.keys(updates || {});
    if (updateKeys.length !== 1 || !('status' in updates) || !updates.status) {
      return fail({
        status: 400,
        code: "INVALID_ORDER_PATCH",
        message: "Only order status updates are allowed from this endpoint",
      });
    }

    const actorRole = getOrderActorRole(order as any, req.userId);
    const canTransition = canTransitionOrderStatus(order.status as any, updates.status, actorRole);
    if (!canTransition) {
      return fail({
        status: 403,
        code: "INVALID_ORDER_TRANSITION",
        message: "You don't have permission for this status transition",
      });
    }

    await updateOrderAdmin(params.id, { status: updates.status });

    const updatedOrder = await getOrderAdmin(params.id);
    return ok({ order: updatedOrder as any });
  } catch (err) {
    console.error('Error updating order:', err);
    return fail({ status: 400, code: "ORDER_UPDATE_FAILED", message: "Failed to update order" });
  }
});
