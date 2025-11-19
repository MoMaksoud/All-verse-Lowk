import twilio from 'twilio';
import sgMail from '@sendgrid/mail';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC51319c6441137fc0e741131f4c04c14d';
const authToken = process.env.TWILIO_AUTH_TOKEN || '88c38004e644f6fce3d5350d5add2b79';
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID || 'VA40f93f3110684d6ec27a31c025bb033e';

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
        channel: channel,
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

// Verify the code entered by user
export async function verifyCode(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string; status?: string }> {
  try {
    const verificationCheck = await twilioClient.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: email,
        code: code,
      });

    if (verificationCheck.status === 'approved') {
      return {
        success: true,
        status: verificationCheck.status,
      };
    } else {
      return {
        success: false,
        error: 'Invalid or expired verification code',
        status: verificationCheck.status,
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

// Transactional email interfaces
export interface OrderEmailData {
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
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

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

// Send order confirmation to buyer
export async function sendOrderConfirmationEmail(
  data: OrderEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid not configured, skipping email');
      return { success: false, error: 'Email service not configured' };
    }

    const itemsHtml = data.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${item.title}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">${item.qty}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">$${(item.unitPrice * item.qty).toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    const msg = {
      to: data.buyerEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@marketplace.com',
      subject: `Order Confirmation - Order #${data.orderId.slice(0, 8)}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Confirmation</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Order Confirmed! 🎉</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${data.buyerName},</p>
              <p style="font-size: 16px; margin-bottom: 20px;">Thank you for your purchase! Your order has been confirmed and is being processed.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="font-size: 18px; margin-top: 0; color: #667eea;">Order Details</h2>
                <p style="margin: 5px 0;"><strong>Order ID:</strong> ${data.orderId.slice(0, 8)}</p>
                <p style="margin: 5px 0;"><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
              </div>

              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="font-size: 18px; margin-top: 0; color: #667eea;">Items Ordered</h2>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                  <thead>
                    <tr style="background: #f5f5f5;">
                      <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Item</th>
                      <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e0e0e0;">Quantity</th>
                      <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e0e0e0;">Price</th>
                      <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e0e0e0;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>
              </div>

              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="font-size: 18px; margin-top: 0; color: #667eea;">Shipping Address</h2>
                <p style="margin: 5px 0;">${data.shippingAddress.name}</p>
                <p style="margin: 5px 0;">${data.shippingAddress.street}</p>
                <p style="margin: 5px 0;">${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zip}</p>
                <p style="margin: 5px 0;">${data.shippingAddress.country}</p>
              </div>

              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0;">Subtotal:</td>
                    <td style="padding: 8px 0; text-align: right;">$${data.subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">Tax:</td>
                    <td style="padding: 8px 0; text-align: right;">$${data.tax.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">Fees:</td>
                    <td style="padding: 8px 0; text-align: right;">$${data.fees.toFixed(2)}</td>
                  </tr>
                  <tr style="border-top: 2px solid #e0e0e0; font-weight: bold;">
                    <td style="padding: 12px 0;">Total:</td>
                    <td style="padding: 12px 0; text-align: right; font-size: 18px; color: #667eea;">$${data.total.toFixed(2)}</td>
                  </tr>
                </table>
              </div>

              <p style="font-size: 14px; color: #666; margin-top: 20px;">You'll receive another email when your order ships. If you have any questions, please contact our support team.</p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>© ${new Date().getFullYear()} Marketplace. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
    };

    await sgMail.send(msg);
    return { success: true };
  } catch (error: any) {
    console.error('Error sending order confirmation email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

// Send notification to seller
export async function sendSellerNotificationEmail(
  data: SellerNotificationData
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid not configured, skipping email');
      return { success: false, error: 'Email service not configured' };
    }

    const msg = {
      to: data.sellerEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@marketplace.com',
      subject: `New Sale: ${data.itemTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Sale Notification</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">New Sale! 💰</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${data.sellerName},</p>
              <p style="font-size: 16px; margin-bottom: 20px;">Great news! Someone just purchased your item!</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="font-size: 18px; margin-top: 0; color: #10b981;">Sale Details</h2>
                <p style="margin: 10px 0;"><strong>Item:</strong> ${data.itemTitle}</p>
                <p style="margin: 10px 0;"><strong>Quantity:</strong> ${data.quantity}</p>
                <p style="margin: 10px 0;"><strong>Unit Price:</strong> $${data.unitPrice.toFixed(2)}</p>
                <p style="margin: 10px 0;"><strong>Total:</strong> <span style="font-size: 20px; font-weight: bold; color: #10b981;">$${data.total.toFixed(2)}</span></p>
                <p style="margin: 10px 0;"><strong>Buyer:</strong> ${data.buyerName}</p>
                <p style="margin: 10px 0;"><strong>Order ID:</strong> ${data.orderId.slice(0, 8)}</p>
              </div>

              <p style="font-size: 14px; color: #666; margin-top: 20px;">Please prepare the item for shipping. You'll receive shipping instructions in a separate email.</p>
              <p style="font-size: 14px; color: #666; margin-top: 10px;">Log in to your account to view full order details and manage the shipment.</p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>© ${new Date().getFullYear()} Marketplace. All rights reserved.</p>
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

