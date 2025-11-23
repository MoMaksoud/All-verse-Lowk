<<<<<<< HEAD
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
=======
import twilio from 'twilio';
import sgMail from '@sendgrid/mail';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

if (!accountSid || !authToken || !verifyServiceSid) {
  throw new Error(
    'Twilio credentials are not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID in your .env.local file.'
  );
}

const twilioClient = twilio(accountSid, authToken);

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Send verification code via email using Twilio Verify
export async function sendVerificationCode(
  email: string,
  channel: 'email' | 'sms' = 'email'
): Promise<{ success: boolean; error?: string; sid?: string }> {
  try {
    const verification = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: email,
        channel: channel === 'sms' ? 'sms' : 'email',
      });

    return {
      success: true,
      sid: verification.sid,
>>>>>>> 7bb93c1e272c8fb88c98b6f0db9164e9d170a217
    };
  } catch (error: any) {
    console.error('Error sending verification code:', error);
    return {
      success: false,
      error: error.message || 'Failed to send verification code',
    };
  }
}

<<<<<<< HEAD
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
=======
// Verify code with Twilio
export async function verifyCode(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const verificationCheck = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
>>>>>>> 7bb93c1e272c8fb88c98b6f0db9164e9d170a217
        to: email,
        code: code,
      });

    if (verificationCheck.status === 'approved') {
      return { success: true };
<<<<<<< HEAD
    }

    return {
      success: false,
      error: 'Invalid or expired verification code',
    };
=======
    } else {
      return {
        success: false,
        error: 'Invalid or expired verification code',
      };
    }
>>>>>>> 7bb93c1e272c8fb88c98b6f0db9164e9d170a217
  } catch (error: any) {
    console.error('Error verifying code:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify code',
    };
  }
}

<<<<<<< HEAD
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
=======
// Order confirmation email data interface
interface OrderConfirmationData {
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  items: Array<{ title: string; qty: number; unitPrice: number }>;
>>>>>>> 7bb93c1e272c8fb88c98b6f0db9164e9d170a217
  subtotal: number;
  tax: number;
  fees: number;
  total: number;
<<<<<<< HEAD
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
=======
  shippingAddress: any;
}

// Send order confirmation email to buyer
export async function sendOrderConfirmationEmail(
  data: OrderConfirmationData
): Promise<void> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('⚠️ SendGrid API key not configured, skipping email');
      return;
    }

    const msg = {
      to: data.buyerEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@allversemarketplace.com',
      subject: `Order Confirmation - Order #${data.orderId.slice(0, 8)}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Confirmation</title>
          </head>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px 10px 0 0;">
              <h1 style="background: #4CAF50; color: white; padding: 20px; margin: 0; border-radius: 10px 10px 0 0;">Order Confirmed! 🎉</h1>
            </div>
            <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-top: none;">
              <p style="padding: 20px;">Hi ${data.buyerName},</p>
              <p style="padding: 0 20px;">Thank you for your order! We've received your payment and your order is being processed.</p>
              
              <div style="margin: 20px; padding: 20px; background: #f9f9f9; border-radius: 5px;">
                <h2 style="margin-top: 0;">Order Details</h2>
                <p><strong>Order ID:</strong> ${data.orderId.slice(0, 8)}</p>
                ${data.items
                  .map(
                    (item) => `
                  <p><strong>${item.title}</strong> - Qty: ${item.qty} × $${item.unitPrice.toFixed(2)}</p>
                `
                  )
                  .join('')}
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p><strong>Subtotal:</strong> $${data.subtotal.toFixed(2)}</p>
                <p><strong>Tax:</strong> $${data.tax.toFixed(2)}</p>
                <p><strong>Fees:</strong> $${data.fees.toFixed(2)}</p>
                <p style="font-size: 18px; font-weight: bold;"><strong>Total:</strong> $${data.total.toFixed(2)}</p>
              </div>

              <p style="padding: 0 20px;">We'll send you another email when your order ships.</p>
            </div>
            <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="padding: 20px; margin: 0; font-size: 12px; color: #666;">© ${new Date().getFullYear()} AllVerse Marketplace. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
    };

    await sgMail.send(msg);
    return;
  } catch (error: any) {
    console.error('Error sending order confirmation email:', error);
    return;
  }
}

// Seller notification email data interface
interface SellerNotificationData {
>>>>>>> 7bb93c1e272c8fb88c98b6f0db9164e9d170a217
  sellerName: string;
  sellerEmail: string;
  buyerName: string;
  itemTitle: string;
  quantity: number;
  unitPrice: number;
  total: number;
  orderId: string;
}

<<<<<<< HEAD
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
=======
// Send notification to seller
export async function sendSellerNotificationEmail(
  data: SellerNotificationData
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('⚠️ SendGrid API key not configured, skipping email');
      return { success: false, error: 'SendGrid not configured' };
    }

    const msg = {
      to: data.sellerEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@allversemarketplace.com',
      subject: `New Sale! 🎉 ${data.itemTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Sale Notification</title>
          </head>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px 10px 0 0;">
              <h1 style="background: #2196F3; color: white; padding: 20px; margin: 0; border-radius: 10px 10px 0 0;">New Sale! 🎉</h1>
            </div>
            <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-top: none;">
              <p style="padding: 20px;">Hi ${data.sellerName},</p>
              <p style="padding: 0 20px;">Great news! Someone just purchased your item!</p>
              
              <div style="margin: 20px; padding: 20px; background: #f9f9f9; border-radius: 5px;">
                <h2 style="margin-top: 0;">Sale Details</h2>
                <p><strong>Item:</strong> ${data.itemTitle}</p>
                <p><strong>Quantity:</strong> ${data.quantity}</p>
                <p><strong>Unit Price:</strong> $${data.unitPrice.toFixed(2)}</p>
                <p><strong>Total:</strong> <span style="font-size: 18px; font-weight: bold;">$${data.total.toFixed(2)}</span></p>
                <p><strong>Buyer:</strong> ${data.buyerName}</p>
                <p><strong>Order ID:</strong> ${data.orderId.slice(0, 8)}</p>
              </div>

              <p style="padding: 0 20px;">Please prepare the item for shipment and update the order status.</p>
            </div>
            <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="padding: 20px; margin: 0; font-size: 12px; color: #666;">© ${new Date().getFullYear()} AllVerse Marketplace. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
    };

    await sgMail.send(msg);
    return { success: true };
  } catch (error: any) {
    console.error('Error sending seller notification email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

>>>>>>> 7bb93c1e272c8fb88c98b6f0db9164e9d170a217
