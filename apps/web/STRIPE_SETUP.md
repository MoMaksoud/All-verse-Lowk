# 🔑 Stripe Setup Guide

## Step 1: Create Stripe Account

1. Go to [https://stripe.com](https://stripe.com)
2. Click "Start now" to create a free account
3. Complete the account setup process
4. Verify your email address

## Step 2: Get API Keys

### Test Mode Keys (for development)

1. **Log into Stripe Dashboard**
   - Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
   - Make sure you're in **Test mode** (toggle in top left)

2. **Get Publishable Key**
   - Go to **Developers** → **API keys**
   - Copy the **Publishable key** (starts with `pk_test_`)

3. **Get Secret Key**
   - In the same **API keys** section
   - Click **Reveal** next to the **Secret key**
   - Copy the **Secret key** (starts with `sk_test_`)

## Step 3: Set Up Webhooks

1. **Go to Webhooks**
   - In Stripe Dashboard, go to **Developers** → **Webhooks**
   - Click **Add endpoint**

2. **Configure Endpoint**
   - **Endpoint URL**: `http://localhost:3000/api/webhooks/stripe`
   - **Events to send**: Select these events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `payment_intent.canceled`

3. **Get Webhook Secret**
   - After creating the webhook, click on it
   - Go to **Signing secret** section
   - Click **Reveal** and copy the secret (starts with `whsec_`)

## Step 4: Configure Environment Variables

1. **Create `.env.local` file**
   ```bash
   # Copy the example file
   cp env.example .env.local
   ```

2. **Add your Stripe keys to `.env.local`**
   ```env
   # Stripe Configuration
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
   STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_here
   ```

## Step 5: Test Payment Processing

### Test Card Numbers

Use these test card numbers in Stripe test mode:

- **Successful Payment**: `4242 4242 4242 4242`
- **Declined Payment**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

**Test Details**:
- **Expiry**: Any future date (e.g., `12/25`)
- **CVC**: Any 3 digits (e.g., `123`)
- **ZIP**: Any 5 digits (e.g., `12345`)

### Testing Steps

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Add items to cart**
   - Go to `/listings`
   - Add some items to cart
   - Go to `/cart`

3. **Test checkout**
   - Click "Proceed to Checkout"
   - Use test card number: `4242 4242 4242 4242`
   - Fill in any test details
   - Complete payment

4. **Verify in Stripe Dashboard**
   - Check **Payments** section for successful payment
   - Check **Webhooks** section for successful webhook delivery

## Step 6: Production Setup (When Ready)

### Switch to Live Mode

1. **Activate your Stripe account**
   - Complete business verification
   - Add bank account details

2. **Get Live API Keys**
   - Toggle to **Live mode** in Stripe Dashboard
   - Get new **Publishable key** (starts with `pk_live_`)
   - Get new **Secret key** (starts with `sk_live_`)

3. **Update Environment Variables**
   ```env
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
   STRIPE_SECRET_KEY=sk_live_your_live_secret_key
   ```

4. **Set up Live Webhooks**
   - Create new webhook endpoint for production URL
   - Use your production domain: `https://yourdomain.com/api/webhooks/stripe`

## Troubleshooting

### Common Issues

1. **"Missing stripe-signature header"**
   - Make sure webhook secret is correctly set in `.env.local`
   - Restart development server after adding environment variables

2. **"Invalid API key"**
   - Double-check your API keys are correct
   - Make sure you're using test keys in test mode

3. **Webhook not receiving events**
   - Check webhook URL is correct
   - Make sure development server is running
   - Verify webhook events are selected

4. **Payment fails**
   - Use correct test card numbers
   - Check browser console for errors
   - Verify all required fields are filled

### Debug Mode

Add this to your `.env.local` for debugging:
```env
STRIPE_DEBUG=true
```

This will log additional information to help troubleshoot issues.

## Security Notes

- **Never commit `.env.local`** to version control
- **Use test keys** for development
- **Switch to live keys** only for production
- **Keep webhook secrets secure**
- **Use HTTPS** for production webhooks

## Support

- **Stripe Documentation**: [https://stripe.com/docs](https://stripe.com/docs)
- **Stripe Support**: [https://support.stripe.com](https://support.stripe.com)
- **Test Cards**: [https://stripe.com/docs/testing](https://stripe.com/docs/testing)
