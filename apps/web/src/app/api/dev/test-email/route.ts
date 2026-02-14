import { sendOrderConfirmationEmail } from '@/lib/email';

export async function GET() {
  try {
    const result = await sendOrderConfirmationEmail({
      orderId: "TEST1234",
      buyerName: "Mo",
      buyerEmail: "YOUR_REAL_EMAIL@gmail.com",
      items: [],
      subtotal: 1,
      tax: 0,
      fees: 0,
      total: 1,
      shippingAddress: {},
    });

    console.log("[DEV TEST EMAIL RESULT]", result);

    return Response.json(result);
  } catch (err) {
    console.error("[DEV TEST EMAIL ERROR]", err);
    return Response.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
