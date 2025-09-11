import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { firestoreServices } from "@/lib/services/firestore";
import { success, error } from "@/lib/response";
import { badRequest, unauthorized } from "@/lib/errors";
import { CreateOrderInput } from "@/lib/types/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req: NextRequest) => {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return error(unauthorized("User ID is required"));
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'buyer' or 'seller'
    const status = searchParams.get('status');

    let orders;
    if (type === 'seller') {
      orders = await firestoreServices.orders.getOrdersBySeller(userId);
    } else {
      orders = await firestoreServices.orders.getOrdersByBuyer(userId);
    }

    // Filter by status if provided
    if (status) {
      orders = orders.filter(order => order.status === status);
    }

    return success({
      orders,
      total: orders.length,
      page: 1,
      limit: 100,
      hasMore: false
    });
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

    const body = await req.json() as CreateOrderInput;
    
    // Validate required fields
    if (!body.items || !body.shippingAddress || !body.paymentIntentId) {
      return error(badRequest("Missing required fields: items, shippingAddress, paymentIntentId"));
    }

    // Set buyer ID from authenticated user
    const orderData = {
      ...body,
      buyerId: userId,
    };

    const orderId = await firestoreServices.orders.createOrder(orderData);
    const order = await firestoreServices.orders.getOrder(orderId);
    
    return success(order, { status: 201 });
  } catch (err) {
    console.error('Error creating order:', err);
    return error(badRequest("Failed to create order"));
  }
});
