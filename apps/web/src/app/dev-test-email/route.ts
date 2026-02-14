import { sendOrderConfirmationEmail } from '@/lib/email';

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return Response.json({ error: 'Not allowed' }, { status: 403 });
  }

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

  return Response.json(result);
}
