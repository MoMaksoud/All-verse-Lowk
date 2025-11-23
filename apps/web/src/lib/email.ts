import sgMail from '@sendgrid/mail';
import twilio from 'twilio';

// Initialize SendGrid
const sendgridApiKey = process.env.SENDGRID_API_KEY;
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
} else {
  console.warn('⚠️ SENDGRID_API_KEY not configured. Email sending will be disabled.');
}

// Initialize Twilio
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const twilioClient = twilioAccountSid && twilioAuthToken
  ? twilio(twilioAccountSid, twilioAuthToken)
  : null;

if (!twilioClient) {
  console.warn('⚠️ Twilio credentials not configured. Verification codes will be disabled.');
}

// Email templates
const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@marketplace.com';

// ============================================================================
// VERIFICATION CODE FUNCTIONS (Twilio)
// ============================================================================

export interface SendVerificationCodeResult {
  success: boolean;
  error?: string;
}

export async function sendVerificationCode(
  email: string,
  channel: 'email' | 'sms' = 'email'
): Promise<SendVerificationCodeResult> {
  if (!twilioClient || !twilioServiceSid) {
    return {
      success: false,
      error: 'Twilio service not configured',
    };
  }

  try {
    const verification = await twilioClient.verify.v2
      .services(twilioServiceSid)
      .verifications
      .create({
        to: email,
        channel: channel === 'email' ? 'email' : 'sms',
      });

    if (verification.status === 'pending' || verification.status === 'sent') {
      return { success: true };
    }

    return {
      success: false,
      error: `Verification failed with status: ${verification.status}`,
    };
  } catch (error: any) {
    console.error('Error sending verification code:', error);
    return {
      success: false,
      error: error.message || 'Failed to send verification code',
    };
  }
}

export interface VerifyCodeResult {
  success: boolean;
  error?: string;
}

export async function verifyCode(
  email: string,
  code: string
): Promise<VerifyCodeResult> {
  if (!twilioClient || !twilioServiceSid) {
    return {
      success: false,
      error: 'Twilio service not configured',
    };
  }

  try {
    const verificationCheck = await twilioClient.verify.v2
      .services(twilioServiceSid)
      .verificationChecks
      .create({
        to: email,
        code: code,
      });

    if (verificationCheck.status === 'approved') {
      return { success: true };
    }

    return {
      success: false,
      error: 'Invalid or expired verification code',
    };
  } catch (error: any) {
    console.error('Error verifying code:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify code',
    };
  }
}

// ============================================================================
// ORDER EMAIL FUNCTIONS (SendGrid)
// ============================================================================

export interface OrderConfirmationEmailParams {
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  items: Array<{
    title: string;
    qty: number;
    unitPrice: number;
  }>;
  subtotal: number;
  tax: number;
  fees: number;
  total: number;
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
}

export async function sendOrderConfirmationEmail(
  params: OrderConfirmationEmailParams
): Promise<void> {
  if (!sendgridApiKey) {
    console.warn('⚠️ SendGrid not configured. Skipping order confirmation email.');
    return;
  }

  const itemsList = params.items
    .map(item => `- ${item.title} (Qty: ${item.qty}) - $${(item.unitPrice * item.qty).toFixed(2)}`)
    .join('\n');

  const shippingAddressText = params.shippingAddress
    ? `
Shipping Address:
${params.shippingAddress.street || ''}
${params.shippingAddress.city || ''}, ${params.shippingAddress.state || ''} ${params.shippingAddress.zip || ''}
${params.shippingAddress.country || ''}
`
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Confirmation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4F46E5;">Order Confirmation</h1>
        <p>Hi ${params.buyerName},</p>
        <p>Thank you for your order! We've received your payment and your order is being processed.</p>
        
        <h2 style="color: #4F46E5; margin-top: 30px;">Order Details</h2>
        <p><strong>Order ID:</strong> ${params.orderId}</p>
        
        <h3 style="margin-top: 20px;">Items:</h3>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px;">${itemsList}</pre>
        
        <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 5px;">
          <p><strong>Subtotal:</strong> $${params.subtotal.toFixed(2)}</p>
          <p><strong>Tax:</strong> $${params.tax.toFixed(2)}</p>
          <p><strong>Fees:</strong> $${params.fees.toFixed(2)}</p>
          <p style="font-size: 18px; font-weight: bold; margin-top: 10px;">
            <strong>Total:</strong> $${params.total.toFixed(2)}
          </p>
        </div>
        
        ${shippingAddressText}
        
        <p style="margin-top: 30px;">We'll send you another email when your order ships.</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        
        <p style="margin-top: 30px;">Best regards,<br>The Marketplace Team</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Order Confirmation

Hi ${params.buyerName},

Thank you for your order! We've received your payment and your order is being processed.

Order Details:
Order ID: ${params.orderId}

Items:
${itemsList}

Subtotal: $${params.subtotal.toFixed(2)}
Tax: $${params.tax.toFixed(2)}
Fees: $${params.fees.toFixed(2)}
Total: $${params.total.toFixed(2)}

${shippingAddressText}

We'll send you another email when your order ships.
If you have any questions, please don't hesitate to contact us.

Best regards,
The Marketplace Team
  `;

  try {
    await sgMail.send({
      to: params.buyerEmail,
      from: fromEmail,
      subject: `Order Confirmation - ${params.orderId}`,
      text,
      html,
    });
    console.log(`✅ Order confirmation email sent to ${params.buyerEmail}`);
  } catch (error: any) {
    console.error('Error sending order confirmation email:', error);
    throw error;
  }
}

export interface SellerNotificationEmailParams {
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
  params: SellerNotificationEmailParams
): Promise<void> {
  if (!sendgridApiKey) {
    console.warn('⚠️ SendGrid not configured. Skipping seller notification email.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Sale Notification</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #10B981;">New Sale! 🎉</h1>
        <p>Hi ${params.sellerName},</p>
        <p>Great news! Someone just purchased your item.</p>
        
        <h2 style="color: #10B981; margin-top: 30px;">Sale Details</h2>
        <div style="padding: 15px; background: #f9f9f9; border-radius: 5px; margin-top: 20px;">
          <p><strong>Item:</strong> ${params.itemTitle}</p>
          <p><strong>Quantity:</strong> ${params.quantity}</p>
          <p><strong>Unit Price:</strong> $${params.unitPrice.toFixed(2)}</p>
          <p style="font-size: 18px; font-weight: bold; margin-top: 10px;">
            <strong>Total Sale:</strong> $${params.total.toFixed(2)}
          </p>
          <p><strong>Buyer:</strong> ${params.buyerName}</p>
          <p><strong>Order ID:</strong> ${params.orderId}</p>
        </div>
        
        <p style="margin-top: 30px;">Please prepare the item for shipment. You'll receive shipping instructions shortly.</p>
        
        <p style="margin-top: 30px;">Best regards,<br>The Marketplace Team</p>
      </div>
    </body>
    </html>
  `;

  const text = `
New Sale! 🎉

Hi ${params.sellerName},

Great news! Someone just purchased your item.

Sale Details:
Item: ${params.itemTitle}
Quantity: ${params.quantity}
Unit Price: $${params.unitPrice.toFixed(2)}
Total Sale: $${params.total.toFixed(2)}
Buyer: ${params.buyerName}
Order ID: ${params.orderId}

Please prepare the item for shipment. You'll receive shipping instructions shortly.

Best regards,
The Marketplace Team
  `;

  try {
    await sgMail.send({
      to: params.sellerEmail,
      from: fromEmail,
      subject: `New Sale: ${params.itemTitle}`,
      text,
      html,
    });
    console.log(`✅ Seller notification email sent to ${params.sellerEmail}`);
  } catch (error: any) {
    console.error('Error sending seller notification email:', error);
    throw error;
  }
}
