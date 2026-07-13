import Stripe from 'stripe';
import prisma from './db.js';

let cachedStripe: Stripe | null = null;
let cachedKey: string = '';

export async function getStripe(): Promise<Stripe> {
  let secretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';

  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const payment = (settings?.paymentSettings as Record<string, any>) || {};
    if (payment.stripeSecretKey) {
      secretKey = payment.stripeSecretKey;
    }
  } catch {
    // DB unavailable — fall back to env var
  }

  if (cachedStripe && cachedKey === secretKey) {
    return cachedStripe;
  }

  cachedStripe = new Stripe(secretKey, {
    apiVersion: '2026-01-28.clover',
  });
  cachedKey = secretKey;

  return cachedStripe;
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  const envSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (envSecret) return envSecret;
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const payment = (settings?.paymentSettings as Record<string, any>) || {};
    return payment.stripeWebhookSecret || null;
  } catch {
    return null;
  }
}

// Default export for backwards compatibility
export default new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-01-28.clover',
});
