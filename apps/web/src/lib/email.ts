import sgMail from '@sendgrid/mail';

const sendgridApiKey = process.env.SENDGRID_API_KEY;
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
}

const REQUIRED_SENDGRID_ENV = [
  'SENDGRID_API_KEY',
  'SENDGRID_FROM_EMAIL',
  'SENDGRID_VERIFICATION_TEMPLATE_ID',
  'SENDGRID_ORDER_TEMPLATE_ID',
  'SENDGRID_SELLER_TEMPLATE_ID',
] as const;

function getMissingSendGridEnv(): string[] {
  return REQUIRED_SENDGRID_ENV.filter((key) => !process.env[key]?.trim());
}

function assertSendGridConfig(): { ok: false; error: string } | { ok: true } {
  const missing = getMissingSendGridEnv();
  if (missing.length) {
    return {
      ok: false,
      error: `SendGrid not configured. Missing: ${missing.join(', ')}. Set these in .env.local.`,
    };
  }
  if (sendgridApiKey) sgMail.setApiKey(sendgridApiKey);
  return { ok: true };
}

export function isSendGridConfigured(): boolean {
  return getMissingSendGridEnv().length === 0 && !!sendgridApiKey;
}

// ============================================================================
// VERIFICATION EMAIL (link-based, template only)
// ============================================================================

export async function sendVerificationEmail(
  to: string,
  verificationUrl: string
): Promise<{ success: boolean; error?: string }> {
  const config = assertSendGridConfig();
  if (!config.ok) {
    return { success: false, error: (config as { ok: false; error: string }).error };
  }

  const templateId = process.env.SENDGRID_VERIFICATION_TEMPLATE_ID!;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL!;

  try {
    await sgMail.send({
      to,
      from: fromEmail,
      templateId,
      dynamicTemplateData: {
        verification_url: verificationUrl,
      },
    });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

// ============================================================================
// ORDER CONFIRMATION (buyer) – template only
// ============================================================================

export interface OrderConfirmationData {
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  items: Array<{ title: string; qty: number; unitPrice: number }>;
  subtotal: number;
  tax: number;
  fees: number;
  total: number;
  shippingAddress: unknown;
}

export async function sendOrderConfirmationEmail(
  data: OrderConfirmationData
): Promise<{ success: boolean; error?: string }> {
  const config = assertSendGridConfig();
  if (!config.ok) {
    return { success: false, error: (config as { ok: false; error: string }).error };
  }

  const templateId = process.env.SENDGRID_ORDER_TEMPLATE_ID!;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL!;

  try {
    await sgMail.send({
      to: data.buyerEmail,
      from: fromEmail,
      templateId,
      dynamicTemplateData: {
        orderId: data.orderId,
        orderIdShort: data.orderId.slice(0, 8),
        buyerName: data.buyerName,
        items: data.items.map((i) => ({
          title: i.title,
          qty: i.qty,
          unitPrice: i.unitPrice,
        })),
        subtotal: data.subtotal,
        tax: data.tax,
        fees: data.fees,
        total: data.total,
        shippingAddress: data.shippingAddress,
      },
    });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

// ============================================================================
// SELLER NOTIFICATION – template only
// ============================================================================

export interface SellerNotificationData {
  sellerName: string;
  sellerEmail: string;
  buyerName: string;
  itemTitle: string;
  quantity: number;
  unitPrice: number;
  total: number;
  orderId: string;
}

export async function sendSellerNotificationEmail(
  data: SellerNotificationData
): Promise<{ success: boolean; error?: string }> {
  const config = assertSendGridConfig();
  if (!config.ok) {
    return { success: false, error: (config as { ok: false; error: string }).error };
  }

  const templateId = process.env.SENDGRID_SELLER_TEMPLATE_ID!;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL!;

  try {
    await sgMail.send({
      to: data.sellerEmail,
      from: fromEmail,
      templateId,
      dynamicTemplateData: {
        sellerName: data.sellerName,
        buyerName: data.buyerName,
        itemTitle: data.itemTitle,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        total: data.total,
        orderId: data.orderId,
        orderIdShort: data.orderId.slice(0, 8),
      },
    });
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
