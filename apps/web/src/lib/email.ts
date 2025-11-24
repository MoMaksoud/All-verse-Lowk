
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

// Send verification code via email using Twilio Verify
export async function sendVerificationCode(
  email: string,
  channel: 'email' | 'sms' = 'email'
): Promise<{ success: boolean; error?: string; sid?: string }> {
  if (!twilioClient || !twilioServiceSid) {
    return {
      success: false,
      error: 'Twilio service not configured',
    };
  }
//hj
  try {
    const verification = await twilioClient.verify.v2
      .services(twilioServiceSid)
      .verifications.create({
        to: email,
        channel: channel === 'sms' ? 'sms' : 'email',
      });

    return {
      success: true,
      sid: verification.sid,
    };
  } catch (error: any) {
    console.error('Error sending verification code:', error);
    return {
      success: false,
      error: error.message || 'Failed to send verification code',
    };
  }
}

// Verify code with Twilio
export async function verifyCode(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  if (!twilioClient || !twilioServiceSid) {
    return {
      success: false,
      error: 'Twilio service not configured',
    };
  }

  try {
    const verificationCheck = await twilioClient.verify.v2
      .services(twilioServiceSid)
      .verificationChecks.create({
        to: email,
        code: code,
      });

    if (verificationCheck.status === 'approved') {
      return { success: true };
    } else {
      return {
        success: false,
        error: 'Invalid or expired verification code',
      };
    }
  } catch (error: any) {
    console.error('Error verifying code:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify code',
    };
  }
}

// ============================================================================
// EMAIL VERIFICATION WITH TOKEN (SendGrid Template)
// ============================================================================

export async function sendVerificationEmail(
  to: string,
  verificationUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check for required SendGrid configuration
    if (!process.env.SENDGRID_API_KEY) {
      console.error('❌ Missing SENDGRID_API_KEY environment variable');
      return { success: false, error: 'SendGrid not configured - missing API key' };
    }

    if (!process.env.SENDGRID_FROM_EMAIL) {
      console.error('❌ Missing SENDGRID_FROM_EMAIL environment variable');
      return { success: false, error: 'SendGrid not configured - missing from email' };
    }

    // Ensure SendGrid is initialized
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const templateId = process.env.SENDGRID_VERIFICATION_TEMPLATE_ID;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    
    const msg: any = {
      to,
      from: fromEmail,
      dynamic_template_data: {
        verification_url: verificationUrl,
      },
    };

    if (templateId) {
      msg.templateId = templateId;
      console.log('📧 Sending verification email with template:', templateId);
    } else {
      // Modern fallback HTML template if no template ID
      console.log('📧 Sending verification email with fallback HTML template');
      msg.subject = 'Verify Your Email - AllVerse';
      msg.html = `
        <html>
          <body style="font-family:Inter,Arial,sans-serif;padding:24px;background:#f5f7fb;">
            <div style="max-width:480px;margin:auto;background:white;padding:28px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
              <h2 style="margin-bottom:12px;color:#111">Welcome to AllVerse 🎉</h2>
              <p style="color:#444;font-size:15px;margin-bottom:24px;">
                Tap the button below to verify your email and activate your account.
              </p>

              <a href="${verificationUrl}"
                 style="display:inline-block;background:#0063e1;color:white;padding:12px 18px;
                 border-radius:8px;text-decoration:none;font-weight:600;">
                Verify Email
              </a>

              <p style="font-size:13px;color:#777;margin-top:28px;">
                If you didn't sign up, you can safely ignore this message.
              </p>

              <p style="font-size:11px;color:#aaa;margin-top:24px;text-align:center;">
                © ${new Date().getFullYear()} AllVerse Marketplace. All rights reserved.
              </p>
            </div>
          </body>
        </html>
      `;
    }

    await sgMail.send(msg);
    console.log('✅ Verification email sent successfully to:', to);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error sending verification email:', error?.message || error);
    if (error?.response?.body) {
      console.error('❌ SendGrid error details:', JSON.stringify(error.response.body));
    }
    return {
      success: false,
      error: error.message || 'Failed to send verification email',
    };
  }
}

// Order confirmation email data interface
interface OrderConfirmationData {
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  items: Array<{ title: string; qty: number; unitPrice: number }>;
  subtotal: number;
  tax: number;
  fees: number;
  total: number;
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
  sellerName: string;
  sellerEmail: string;
  buyerName: string;
  itemTitle: string;
  quantity: number;
  unitPrice: number;
  total: number;
  orderId: string;
}
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
