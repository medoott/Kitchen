import { Request, Response } from 'express';
import { getStripe, getStripeWebhookSecret } from '../lib/stripe.js';
import prisma from '../lib/db.js';
import { createPayPalOrder, capturePayPalOrder } from '../lib/paypal.js';
import { auditLog } from '../lib/audit.js';
import { sendEmail } from '../lib/email.js';

// ============================================================
// HELPERS
// ============================================================

async function getPaymentSettings(): Promise<Record<string, any>> {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  return (settings?.paymentSettings as Record<string, any>) || {};
}

export async function getCurrency(): Promise<string> {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  const general = (settings?.generalSettings as Record<string, any>) || {};
  const cur = (general.defaultCurrency as string) || 'USD';
  return cur.toLowerCase();
}

/** Keep the denormalized order.paymentStatus in sync with a payment. */
async function syncOrderPaymentStatus(orderId: string): Promise<void> {
  const payments = await prisma.payment.findMany({ where: { orderId } });
  let status = 'UNPAID';
  const hasPaid = payments.some((p) => p.status === 'PAID');
  const hasPartial = payments.some((p) => p.status === 'PARTIALLY_REFUNDED');
  const hasRefunded = payments.some((p) => p.status === 'REFUNDED');
  const hasAwaiting = payments.some((p) => p.status === 'AWAITING_CASH_PAYMENT');
  const hasProcessing = payments.some((p) => p.status === 'PROCESSING' || p.status === 'PENDING');

  if (hasPaid) status = 'PAID';
  else if (hasAwaiting) status = 'AWAITING_CASH_PAYMENT';
  else if (hasProcessing) status = 'PROCESSING';
  else if (hasRefunded) status = 'REFUNDED';
  else if (hasPartial) status = 'PARTIALLY_REFUNDED';

  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: status },
  });
}

/** Advance an order once a payment is confirmed. */
async function advanceOrderOnPayment(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true, paymentStatus: true } });
  if (!order) return;
  if (order.status === 'PENDING') {
    await prisma.order.update({ where: { id: orderId }, data: { status: 'CONFIRMED' } });
  } else if ((order.status === 'PICKED_UP' || order.status === 'DELIVERED') && order.paymentStatus === 'PAID') {
    // Payment confirmed after the order was collected → terminal "Settled" stage.
    await prisma.order.update({ where: { id: orderId }, data: { status: 'SETTLED' } });
  }
}

// ============================================================
// LIST (staff audit view)
// ============================================================

export async function listPayments(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt((req.query.page as string) || '1'));
  const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20')));
  const where: Record<string, any> = {};
  if (req.query.orderId) where.orderId = req.query.orderId as string;
  if (req.query.status) where.status = req.query.status as string;
  if (req.query.method) where.method = req.query.method as string;

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        order: { select: { orderNumber: true, total: true, paymentStatus: true } },
        confirmedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  res.json({ success: true, data: { items, total, page, limit } });
}

// ============================================================
// PUBLIC — ENABLED PAYMENT METHODS
// ============================================================

export async function getPaymentMethods(_req: Request, res: Response): Promise<void> {
  const ps = await getPaymentSettings();
  res.json({
    success: true,
    data: {
      methods: {
        CASH: ps.cashEnabled !== false,
        CARD: ps.cardEnabled === true,
        STRIPE: ps.stripeEnabled === true,
        PAYPAL: ps.paypalEnabled === true,
      },
      stripePublishableKey: ps.stripeEnabled ? ps.stripePublishableKey || null : null,
      paypalClientId: ps.paypalEnabled ? ps.paypalClientId || null : null,
    },
  });
}

// ============================================================
// STRIPE — PAYMENT INTENT (mobile PaymentSheet)
// ============================================================

export async function createPaymentIntent(req: Request, res: Response): Promise<void> {
  const { orderId } = req.body;
  if (!orderId) {
    res.status(400).json({ success: false, error: 'orderId is required' });
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: { select: { email: true, name: true } } },
  });
  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  // Idempotency: never double-charge an already-paid order.
  const paid = await prisma.payment.findFirst({ where: { orderId, status: { in: ['PAID', 'PROCESSING'] } } });
  if (paid) {
    if (paid.status === 'PAID') {
      res.status(409).json({ success: false, error: 'Order already paid', data: { paymentId: paid.id } });
      return;
    }
    // A processing PaymentIntent exists — return its client secret so the
    // caller can resume instead of creating a duplicate (idempotency key
    // would otherwise return the same intent anyway).
    res.json({ success: true, data: { clientSecret: (paid.metadata as any)?.clientSecret, paymentIntentId: paid.transactionId } });
    return;
  }

  const receiptEmail = order.customer?.email ?? order.guestEmail ?? undefined;
  const currency = await getCurrency();

  try {
    const stripe = await getStripe();
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(order.total * 100),
        currency,
        receipt_email: receiptEmail,
        automatic_payment_methods: { enabled: true },
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customer?.name ?? order.guestName ?? '',
        },
      },
      { idempotencyKey: `pi_${order.id}` },
    );

    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: 'STRIPE',
        status: 'PROCESSING',
        amount: order.total,
        currency: currency.toUpperCase(),
        transactionId: paymentIntent.id,
        metadata: { clientSecret: paymentIntent.client_secret },
      },
    });
    await syncOrderPaymentStatus(order.id);

    res.json({ success: true, data: { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Payment creation failed' });
  }
}

// ============================================================
// STRIPE — CHECKOUT SESSION (hosted page)
// ============================================================

export async function createCheckoutSession(req: Request, res: Response): Promise<void> {
  const { orderId } = req.body;
  if (!orderId) {
    res.status(400).json({ success: false, error: 'orderId is required' });
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: { select: { email: true } }, items: true },
  });
  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  const paid = await prisma.payment.findFirst({ where: { orderId, status: { in: ['PAID', 'PROCESSING'] } } });
  if (paid) {
    if (paid.status === 'PAID') {
      res.status(409).json({ success: false, error: 'Order already paid', data: { paymentId: paid.id } });
      return;
    }
    try {
      const stripe = await getStripe();
      const session = await stripe.checkout.sessions.retrieve(paid.transactionId!);
      res.json({ success: true, data: { url: session.url, sessionId: session.id } });
    } catch {
      res.status(409).json({ success: false, error: 'Order already has a pending payment', data: { paymentId: paid.id } });
    }
    return;
  }

  const publicUrl = process.env.PUBLIC_URL || 'https://inka.kitchenasty.com';
  const customerEmail = order.customer?.email ?? order.guestEmail ?? undefined;
  const currency = await getCurrency();

  try {
    const stripe = await getStripe();
    const lineItems = order.items.map((it) => ({
      price_data: {
        currency,
        product_data: { name: it.name },
        unit_amount: Math.round(it.unitPrice * 100),
      },
      quantity: it.quantity,
    }));
    if (order.deliveryFee > 0) {
      lineItems.push({
        price_data: { currency, product_data: { name: 'Delivery fee' }, unit_amount: Math.round(order.deliveryFee * 100) },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: lineItems,
        success_url: `${publicUrl}/order/${order.id}?paid=true`,
        cancel_url: `${publicUrl}/checkout`,
        customer_email: customerEmail,
        metadata: { orderId: order.id, orderNumber: order.orderNumber },
        payment_intent_data: {
          receipt_email: customerEmail,
          metadata: { orderId: order.id, orderNumber: order.orderNumber },
        },
      },
      { idempotencyKey: `cs_${order.id}` },
    );

    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: 'STRIPE',
        status: 'PROCESSING',
        amount: order.total,
        currency: currency.toUpperCase(),
        transactionId: session.id,
      },
    });
    await syncOrderPaymentStatus(order.id);

    res.json({ success: true, data: { url: session.url, sessionId: session.id } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Checkout session creation failed' });
  }
}

// ============================================================
// STRIPE — WEBHOOK (signature-verified, idempotent)
// ============================================================

export async function handleWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = await getStripeWebhookSecret();
  if (!webhookSecret) {
    res.status(500).json({ success: false, error: 'Webhook secret not configured' });
    return;
  }

  let event;
  try {
    const stripe = await getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    res.status(400).json({ success: false, error: `Webhook error: ${err.message}` });
    return;
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as { id: string; metadata?: { orderId?: string } };
      await fulfillStripePayment(pi.id, pi.metadata?.orderId);
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as { id: string };
      await prisma.payment.updateMany({ where: { transactionId: pi.id }, data: { status: 'FAILED' } });
      if (pi.id) await syncOrderPaymentStatusByTxn(pi.id);
      break;
    }
    case 'checkout.session.completed': {
      const session = event.data.object as { id: string; payment_status?: string; metadata?: { orderId?: string } };
      if (session.payment_status === 'paid') {
        await fulfillStripePayment(session.id, session.metadata?.orderId);
      }
      break;
    }
  }

  res.json({ received: true });
}

async function fulfillStripePayment(transactionId: string, orderId?: string): Promise<void> {
  const existing = await prisma.payment.findFirst({ where: { transactionId } });
  if (!existing) return;
  // Idempotency: do not re-process an already-confirmed payment.
  if (existing.status === 'PAID') return;

  await prisma.payment.update({
    where: { id: existing.id },
    data: { status: 'PAID', paidAt: new Date(), amount: existing.amount },
  });
  if (!orderId) orderId = existing.orderId;
  await syncOrderPaymentStatus(orderId!);
  await advanceOrderOnPayment(orderId!);
  auditLog({} as Request, {
    action: 'payment_succeeded',
    entity: 'Payment',
    entityId: existing.id,
    details: { orderId: orderId!, method: 'STRIPE' },
  });
}

async function syncOrderPaymentStatusByTxn(transactionId: string): Promise<void> {
  const p = await prisma.payment.findFirst({ where: { transactionId } });
  if (p) await syncOrderPaymentStatus(p.orderId);
}

// ============================================================
// CASH — create (awaiting staff) + confirm
// ============================================================

export async function createCashPayment(req: Request, res: Response): Promise<void> {
  const { orderId } = req.body;
  if (!orderId) {
    res.status(400).json({ success: false, error: 'orderId is required' });
    return;
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  const user = req.user;
  if (user && user.type === 'customer' && order.customerId && order.customerId !== user.id) {
    res.status(403).json({ success: false, error: 'Access denied' });
    return;
  }

  const currency = await getCurrency();

  // Reuse an existing awaiting-cash payment instead of duplicating.
  const existing = await prisma.payment.findFirst({
    where: { orderId, method: 'CASH', status: 'AWAITING_CASH_PAYMENT' },
  });
  if (existing) {
    res.status(200).json({ success: true, data: existing });
    return;
  }

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      method: 'CASH',
      status: 'AWAITING_CASH_PAYMENT',
      amount: order.total,
      currency: currency.toUpperCase(),
    },
  });
  await syncOrderPaymentStatus(order.id);
  res.status(201).json({ success: true, data: payment });
}

/** Staff confirms a cash or in-person card payment. Idempotent. */
export async function confirmPayment(req: Request, res: Response): Promise<void> {
  const { orderId, paymentId, method, staffNote } = req.body as {
    orderId?: string;
    paymentId?: string;
    method?: 'CASH' | 'CARD';
    staffNote?: string;
  };

  if (!orderId && !paymentId) {
    res.status(400).json({ success: false, error: 'orderId or paymentId is required' });
    return;
  }

  let payment = paymentId ? await prisma.payment.findUnique({ where: { id: paymentId } }) : null;
  if (!payment && orderId) {
    payment = await prisma.payment.findFirst({
      where: { orderId, method: method || 'CASH', status: { in: ['AWAITING_CASH_PAYMENT', 'PENDING', 'PROCESSING'] } },
      orderBy: { createdAt: 'desc' },
    });
  }
  if (!payment) {
    // In-person card with no pre-created record: create & confirm now.
    if (orderId && method === 'CARD') {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }
      const currency = await getCurrency();
      payment = await prisma.payment.create({
        data: { orderId, method: 'CARD', status: 'AWAITING_CASH_PAYMENT', amount: order.total, currency: currency.toUpperCase() },
      });
    } else {
      res.status(404).json({ success: false, error: 'No pending payment found to confirm' });
      return;
    }
  }

  // Idempotency: already confirmed.
  if (payment.status === 'PAID') {
    res.json({ success: true, data: payment, message: 'Payment already confirmed' });
    return;
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      confirmedById: req.user!.id,
      staffNote: staffNote ?? payment.staffNote,
      method: method ?? payment.method,
    },
  });
  await prisma.order.update({ where: { id: payment.orderId }, data: { paymentMethod: updated.method } });
  await syncOrderPaymentStatus(payment.orderId);
  await advanceOrderOnPayment(payment.orderId);

  auditLog(req, {
    action: 'payment_confirmed',
    entity: 'Payment',
    entityId: updated.id,
    details: { orderId: payment.orderId, method: updated.method, amount: updated.amount },
  });

  res.json({ success: true, data: updated });
}

// ============================================================
// PAYPAL
// ============================================================

export async function createPayPalPayment(req: Request, res: Response): Promise<void> {
  const { orderId } = req.body;
  if (!orderId) {
    res.status(400).json({ success: false, error: 'orderId is required' });
    return;
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  const paid = await prisma.payment.findFirst({ where: { orderId, status: { in: ['PAID', 'PROCESSING'] } } });
  if (paid) {
    res.status(409).json({ success: false, error: 'Order already has an active payment', data: { paymentId: paid.id } });
    return;
  }

  const currency = await getCurrency();
  try {
    const paypalOrder = await createPayPalOrder(order.total, order.orderNumber, order.id);
    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: 'PAYPAL',
        status: 'PROCESSING',
        amount: order.total,
        currency: currency.toUpperCase(),
        transactionId: paypalOrder.id,
      },
    });
    await syncOrderPaymentStatus(order.id);
    res.json({ success: true, data: { paypalOrderId: paypalOrder.id, approvalUrl: paypalOrder.approvalUrl } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'PayPal order creation failed' });
  }
}

export async function capturePayPalPayment(req: Request, res: Response): Promise<void> {
  const { paypalOrderId, orderId } = req.body;
  if (!paypalOrderId || !orderId) {
    res.status(400).json({ success: false, error: 'paypalOrderId and orderId are required' });
    return;
  }

  try {
    const result = await capturePayPalOrder(paypalOrderId);
    if (result.status === 'COMPLETED' || result.status === 'APPROVED') {
      const payment = await prisma.payment.findFirst({ where: { transactionId: paypalOrderId } });
      if (payment && payment.status === 'PAID') {
        res.json({ success: true, data: { status: 'PAID' } });
        return;
      }
      await prisma.payment.updateMany({
        where: { transactionId: paypalOrderId },
        data: { status: 'PAID', paidAt: new Date() },
      });
      await syncOrderPaymentStatus(orderId);
      await advanceOrderOnPayment(orderId);
      res.json({ success: true, data: { status: 'PAID' } });
    } else {
      res.status(400).json({ success: false, error: 'PayPal capture failed', data: result });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'PayPal capture failed' });
  }
}

// ============================================================
// REFUND (manager/super-admin)
// ============================================================

export async function refundPayment(req: Request, res: Response): Promise<void> {
  const { paymentId, amount, reason } = req.body as { paymentId?: string; amount?: number; reason?: string };
  if (!paymentId) {
    res.status(400).json({ success: false, error: 'paymentId is required' });
    return;
  }

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    res.status(404).json({ success: false, error: 'Payment not found' });
    return;
  }
  if (payment.status !== 'PAID') {
    res.status(400).json({ success: false, error: 'Only paid payments can be refunded' });
    return;
  }

  const refundAmount = amount && amount > 0 ? Math.min(amount, payment.amount) : payment.amount;
  const isPartial = refundAmount < payment.amount;

  // Best-effort gateway refund (Stripe only).
  let gatewayError: string | null = null;
  if (payment.method === 'STRIPE' && payment.transactionId) {
    try {
      const stripe = await getStripe();
      const pi = await stripe.paymentIntents.retrieve(payment.transactionId);
      if (pi.latest_charge) {
        await stripe.refunds.create({ charge: pi.latest_charge as string, amount: Math.round(refundAmount * 100) });
      }
    } catch (err: any) {
      gatewayError = err.message || 'Stripe refund failed';
    }
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: isPartial ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
      staffNote: reason ? `Refund: ${reason}` : payment.staffNote,
      metadata: { ...(payment.metadata as object), refundedAmount: refundAmount, refundedAt: new Date().toISOString() },
    },
  });
  await syncOrderPaymentStatus(payment.orderId);

  auditLog(req, {
    action: 'payment_refunded',
    entity: 'Payment',
    entityId: payment.id,
    details: { orderId: payment.orderId, amount: refundAmount, partial: isPartial, gatewayError },
  });

  res.json({ success: true, data: updated, gatewayError });
}

// ============================================================
// RECEIPT
// ============================================================

function formatMoney(amount: number, symbol: string, position: string): string {
  const v = amount.toFixed(2);
  return position === 'after' ? `${v}${symbol}` : `${symbol}${v}`;
}

/** Order access: staff always; customer only their own; guest orders (no customer) allowed by id. */
async function canAccessOrder(orderId: string, user: any): Promise<boolean> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { customerId: true } });
  if (!order) return false;
  if (user?.type === 'staff') return true;
  if (user?.type === 'customer' && order.customerId === user.id) return true;
  if (!order.customerId) return true;
  return false;
}

export async function getReceipt(req: Request<{ orderId: string }>, res: Response): Promise<void> {
  const { orderId } = req.params;
  const allowed = await canAccessOrder(orderId, req.user);
  if (!allowed) {
    res.status(403).json({ success: false, error: 'Access denied' });
    return;
  }
  const receipt = await buildReceipt(orderId);
  if (!receipt) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }
  res.json({ success: true, data: receipt });
}

async function buildReceipt(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      location: { select: { name: true, address: true } },
      items: { include: { options: true } },
      payments: { include: { confirmedBy: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
    },
  });
  if (!order) return null;

  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  const general = (settings?.generalSettings as Record<string, any>) || {};
  const symbol = general.currencySymbol || '$';
  const position = general.currencyPosition || 'before';

  const paidPayment = order.payments.find((p) => p.status === 'PAID');

  return {
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    createdAt: order.createdAt,
    businessName: settings?.siteName || 'KitchenAsty',
    locationName: order.location?.name,
    locationAddress: order.location?.address,
    customer: order.customer ?? { name: order.guestName, email: order.guestEmail, phone: order.guestPhone },
    items: order.items.map((it) => ({
      name: it.name,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      subtotal: it.subtotal,
      options: it.options.map((o) => o.name),
    })),
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    tax: order.tax,
    discount: order.discount,
    tip: order.tip,
    total: order.total,
    currencySymbol: symbol,
    currencyPosition: position,
    payment: paidPayment
      ? {
          method: paidPayment.method,
          status: paidPayment.status,
          amount: paidPayment.amount,
          paidAt: paidPayment.paidAt,
          confirmedBy: paidPayment.confirmedBy?.name,
          reference: paidPayment.transactionId,
        }
      : null,
    formattedTotal: formatMoney(order.total, symbol, position),
  };
}

export async function sendReceiptEmail(req: Request<{ orderId: string }>, res: Response): Promise<void> {
  const { orderId } = req.params;
  const allowed = await canAccessOrder(orderId, req.user);
  if (!allowed) {
    res.status(403).json({ success: false, error: 'Access denied' });
    return;
  }
  const receipt = await buildReceipt(orderId);
  if (!receipt) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }
  const email = receipt.customer?.email;
  if (!email) {
    res.status(400).json({ success: false, error: 'No recipient email on order' });
    return;
  }

  const itemRows = receipt.items
    .map((i) => `<tr><td>${i.quantity}x ${i.name}</td><td style="text-align:right">${formatMoney(i.subtotal, receipt.currencySymbol, receipt.currencyPosition)}</td></tr>`)
    .join('');

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif">
      <h1 style="text-align:center">${receipt.businessName}</h1>
      <h2>Receipt — #${receipt.orderNumber}</h2>
      <p>${receipt.locationName || ''} ${receipt.locationAddress ? '· ' + receipt.locationAddress : ''}</p>
      <table style="width:100%;border-collapse:collapse">
        ${itemRows}
        <tr><td><strong>Total</strong></td><td style="text-align:right"><strong>${receipt.formattedTotal}</strong></td></tr>
      </table>
      ${receipt.payment ? `<p>Paid via ${receipt.payment.method}${receipt.payment.reference ? ' · Ref ' + receipt.payment.reference : ''}</p>` : ''}
    </div>`;

  await sendEmail({ to: email, subject: `Receipt — Order #${receipt.orderNumber}`, html });
  res.json({ success: true, data: { sent: true, email } });
}
