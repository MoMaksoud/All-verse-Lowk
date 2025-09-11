import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { firestoreServices } from "@/lib/services/firestore";
import { success, error } from "@/lib/response";
import { notFound, badRequest, unauthorized } from "@/lib/errors";
import { UpdateOrderInput } from "@/lib/types/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return error(unauthorized("User ID is required"));
    }

    const order = await firestoreServices.orders.getOrder(params.id);
    if (!order) {
      return error(notFound("Order not found"));
    }

    // Check if user has permission to view this order
    if (order.buyerId !== userId && !order.items.some(item => item.sellerId === userId)) {
      return error(unauthorized("You don't have permission to view this order"));
    }

    return success(order);
  } catch (err) {
    console.error('Error fetching order:', err);
    return error(notFound("Order not found"));
  }
});

export const PATCH = withApi(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return error(unauthorized("User ID is required"));
    }

    const order = await firestoreServices.orders.getOrder(params.id);
    if (!order) {
      return error(notFound("Order not found"));
    }

    // Check if user has permission to update this order
    if (order.buyerId !== userId && !order.items.some(item => item.sellerId === userId)) {
      return error(unauthorized("You don't have permission to update this order"));
    }

    const updates = await req.json() as UpdateOrderInput;
    await firestoreServices.orders.updateOrder(params.id, updates);
    
    const updatedOrder = await firestoreServices.orders.getOrder(params.id);
    return success(updatedOrder);
  } catch (err) {
    console.error('Error updating order:', err);
    return error(badRequest("Failed to update order"));
  }
});
