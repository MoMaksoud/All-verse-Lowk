import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { firestoreServices } from "@/lib/services/firestore";
import { success, error } from "@/lib/response";
import { badRequest, unauthorized } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req: NextRequest) => {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return error(unauthorized("User ID is required"));
    }

    const url = new URL(req.url);
    const role = url.searchParams.get('role') || 'buyer'; // 'buyer' or 'seller'

    let orders;
    if (role === 'buyer') {
      orders = await firestoreServices.orders.getOrdersByBuyer(userId);
    } else if (role === 'seller') {
      orders = await firestoreServices.orders.getOrdersBySeller(userId);
    } else {
      return error(badRequest("Invalid role parameter. Must be 'buyer' or 'seller'"));
    }

    // Transform Firestore orders to include proper date formatting
    const transformedOrders = orders.map(order => ({
      id: order.id,
      buyerId: order.buyerId,
      items: order.items,
      subtotal: order.subtotal,
      fees: order.fees,
      tax: order.tax,
      total: order.total,
      currency: order.currency,
      status: order.status,
      paymentIntentId: order.paymentIntentId,
      createdAt: order.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: order.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      shippingAddress: order.shippingAddress,
    }));

    return success(transformedOrders);
  } catch (err) {
    console.error('Error fetching orders:', err);
    return error(badRequest("Failed to fetch orders"));
  }
});

export const POST = withApi(async (req: NextRequest) => {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return error(unauthorized("User ID is required"));
    }

    const body = await req.json();
    const { items, subtotal, fees, tax, total, currency, paymentIntentId, shippingAddress } = body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return error(badRequest("Items are required"));
    }
    if (!subtotal || !fees || !tax || !total || !currency || !paymentIntentId || !shippingAddress) {
      return error(badRequest("Missing required fields: subtotal, fees, tax, total, currency, paymentIntentId, shippingAddress"));
    }

    const orderData = {
      buyerId: userId,
      items,
      subtotal,
      fees,
      tax,
      total,
      currency,
      paymentIntentId,
      shippingAddress,
    };

    const orderId = await firestoreServices.orders.createOrder(orderData);
    
    return success({ orderId }, { status: 201 });
  } catch (err) {
    console.error('Error creating order:', err);
    return error(badRequest("Failed to create order"));
  }
});