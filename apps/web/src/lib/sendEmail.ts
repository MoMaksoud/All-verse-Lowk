import sgMail from '@sendgrid/mail';

const sendgridApiKey = process.env.SENDGRID_API_KEY;
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
}

const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@marketplace.com';

/**
 * Send a single email (to, subject, html).
 * Uses existing SENDGRID_API_KEY and SENDGRID_FROM_EMAIL.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!sendgridApiKey) {
    console.warn('⚠️ SendGrid API key not configured, skipping email');
    return;
  }
  await sgMail.send({
    to,
    from: fromEmail,
    subject,
    html,
  });
}
