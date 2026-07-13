import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { useAuth } from '../context/AuthContext.js';

type Payment = {
  id: string;
  method: 'CASH' | 'CARD' | 'STRIPE' | 'PAYPAL';
  status: string;
  amount: number;
  paidAt?: string;
  confirmedBy?: { name: string } | null;
  reference?: string | null;
};

type OrderItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  options?: { name: string }[];
};

type Order = {
  id: string;
  orderNumber?: string;
  orderType?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  subtotal?: number;
  deliveryFee?: number;
  tax?: number;
  discount?: number;
  tip?: number;
  total?: number;
  items?: OrderItem[];
  payments?: Payment[];
};

const PAYMENT_LABELS: Record<string, string> = {
  UNPAID: 'Unpaid',
  PROCESSING: 'Processing',
  AWAITING_CASH_PAYMENT: 'Awaiting cash payment',
  PAID: 'Paid',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
  PARTIALLY_REFUNDED: 'Partially refunded',
};

const PAYMENT_COLORS: Record<string, string> = {
  UNPAID: 'bg-gray-100 text-gray-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  AWAITING_CASH_PAYMENT: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
  REFUNDED: 'bg-purple-100 text-purple-700',
  PARTIALLY_REFUNDED: 'bg-purple-100 text-purple-700',
};

export default function OrderConfirmation() {
  const { t } = useTranslation();
  const { id } = useParams();
  const location = useLocation();
  const [search, setSearch] = useSearchParams();
  const { clear } = useCart();
  const { formatPrice } = useTheme();
  const { token } = useAuth();

  const paid = search.get('paid') === 'true';
  const paypalApproved = search.get('paypal') === 'approved';
  const paypalToken = search.get('token');

  const initial = (location.state?.order as Order | undefined) ?? null;
  const [order, setOrder] = useState<Order | null>(initial);
  const [polls, setPolls] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const settled =
    order?.paymentStatus === 'PAID' ||
    order?.paymentStatus === 'REFUNDED' ||
    order?.paymentStatus === 'PARTIALLY_REFUNDED' ||
    order?.status === 'CANCELLED';

  // Clear cart once payment is acknowledged.
  useEffect(() => {
    if (paid) clear();
  }, [paid, clear]);

  const loadOrder = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.data) setOrder(data.data as Order);
    } catch {
      /* noop */
    }
  };

  // PayPal return: capture the approved order.
  useEffect(() => {
    if (!paypalApproved || !paypalToken || !id) return;
    let cancelled = false;
    setCapturing(true);
    (async () => {
      try {
        const res = await fetch('/api/payments/paypal/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paypalOrderId: paypalToken, orderId: id }),
        });
        await res.json();
      } catch {
        /* noop */
      } finally {
        if (!cancelled) {
          setCapturing(false);
          setSearch({});
          await loadOrder();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paypalApproved, paypalToken, id]);

  // Poll until the order/payment is settled.
  useEffect(() => {
    if (!id) return;
    if (settled) return;
    if (polls > 15) return;
    const timeout = setTimeout(async () => {
      await loadOrder();
      setPolls((n) => n + 1);
    }, polls === 0 ? 300 : 2000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, settled, polls]);

  const completePayment = async () => {
    if (!id || !order) return;
    const method = order.paymentMethod;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
      if (method === 'STRIPE') {
        const res = await fetch('/api/payments/create-checkout-session', {
          method: 'POST',
          headers,
          body: JSON.stringify({ orderId: id }),
        });
        const data = await res.json();
        if (res.ok && data.data?.url) window.location.href = data.data.url;
        else throw new Error(data.error || 'Failed to start payment');
      } else if (method === 'PAYPAL') {
        const res = await fetch('/api/payments/paypal/create', {
          method: 'POST',
          headers,
          body: JSON.stringify({ orderId: id }),
        });
        const data = await res.json();
        if (res.ok && data.data?.approvalUrl) window.location.href = data.data.approvalUrl;
        else throw new Error(data.error || 'Failed to start PayPal');
      }
    } catch (err: any) {
      alert(err.message || 'Payment failed');
    }
  };

  const openReceipt = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/payments/receipt/${id}`);
      const data = await res.json();
      if (res.ok && data.data) {
        setReceipt(data.data);
        setShowReceipt(true);
      }
    } catch {
      /* noop */
    }
  };

  const emailReceipt = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/payments/receipt/${id}/email`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) setEmailSent(true);
      else alert(data.error || 'Failed to send email');
    } catch {
      /* noop */
    }
  };

  const confirmed = order?.status === 'CONFIRMED';
  const paymentBadge = order?.paymentStatus || 'UNPAID';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('orderConfirmation.title')}</h1>
        <p className="text-gray-600 mb-2">{t('orderConfirmation.thankYou')}</p>
        {(order?.orderNumber || id) && (
          <p className="text-sm text-gray-500">
            {t('orderConfirmation.orderNumber')} {order?.orderNumber ? `#${order.orderNumber}` : `ID: ${id}`}
          </p>
        )}
      </div>

      {capturing && <p className="text-center text-sm text-gray-500 mb-4">Finalising your PayPal payment…</p>}

      {order && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{t('orders.status')}</span>
            <span className="font-medium text-gray-900">{order.status}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Payment</span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PAYMENT_COLORS[paymentBadge] || 'bg-gray-100 text-gray-700'}`}>
              {PAYMENT_LABELS[paymentBadge] || paymentBadge}
            </span>
          </div>

          {!settled && order.paymentMethod === 'CASH' && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-sm">
              Please pay at the counter / to your waiter. Your order will be confirmed once payment is received.
            </div>
          )}

          {!settled && (order.paymentMethod === 'STRIPE' || order.paymentMethod === 'PAYPAL') && (
            <button
              onClick={completePayment}
              className="w-full bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              {order.paymentMethod === 'PAYPAL' ? 'Pay with PayPal' : 'Complete card payment'}
            </button>
          )}

          <div className="border-t border-gray-100 pt-4 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(order.subtotal ?? 0)}</span></div>
            {order.deliveryFee ? <div className="flex justify-between"><span className="text-gray-500">Delivery</span><span>{formatPrice(order.deliveryFee)}</span></div> : null}
            {order.tax ? <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatPrice(order.tax)}</span></div> : null}
            {order.discount ? <div className="flex justify-between"><span className="text-gray-500">Discount</span><span>-{formatPrice(order.discount)}</span></div> : null}
            {order.tip ? <div className="flex justify-between"><span className="text-gray-500">Tip</span><span>{formatPrice(order.tip)}</span></div> : null}
            <div className="flex justify-between font-bold text-gray-900 pt-1"><span>Total</span><span className="text-primary-600">{formatPrice(order.total ?? 0)}</span></div>
          </div>

          <button
            onClick={openReceipt}
            className="w-full border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            View receipt
          </button>
        </div>
      )}

      <div className="flex justify-center gap-4">
        <Link to="/menu" className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors">
          {t('orderConfirmation.orderMore')}
        </Link>
        <Link to="/" className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors">
          {t('notFound.backHome')}
        </Link>
      </div>

      {showReceipt && receipt && (
        <ReceiptModal
          receipt={receipt}
          formatPrice={formatPrice}
          onClose={() => setShowReceipt(false)}
          onEmail={emailReceipt}
          emailSent={emailSent}
        />
      )}
    </div>
  );
}

function ReceiptModal({
  receipt,
  formatPrice,
  onClose,
  onEmail,
  emailSent,
}: {
  receipt: any;
  formatPrice: (n: number) => string;
  onClose: () => void;
  onEmail: () => void;
  emailSent: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 print:max-w-full print:shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">{receipt.businessName}</h2>
          {receipt.locationName && <p className="text-sm text-gray-500">{receipt.locationName}</p>}
          {receipt.locationAddress && <p className="text-xs text-gray-400">{receipt.locationAddress}</p>}
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Order #{receipt.orderNumber}</span>
          <span className="text-gray-500">{new Date(receipt.createdAt).toLocaleString()}</span>
        </div>

        <div className="border-t border-b border-gray-200 py-3 my-3 space-y-2">
          {receipt.items.map((it: any, i: number) => (
            <div key={i} className="flex justify-between text-sm">
              <span>
                {it.quantity}x {it.name}
                {it.options?.length ? <span className="block text-xs text-gray-400">{it.options.join(', ')}</span> : null}
              </span>
              <span>{formatPrice(it.subtotal)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(receipt.subtotal)}</span></div>
          {receipt.deliveryFee ? <div className="flex justify-between"><span className="text-gray-500">Delivery</span><span>{formatPrice(receipt.deliveryFee)}</span></div> : null}
          {receipt.tax ? <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>{formatPrice(receipt.tax)}</span></div> : null}
          {receipt.discount ? <div className="flex justify-between"><span className="text-gray-500">Discount</span><span>-{formatPrice(receipt.discount)}</span></div> : null}
          {receipt.tip ? <div className="flex justify-between"><span className="text-gray-500">Tip</span><span>{formatPrice(receipt.tip)}</span></div> : null}
          <div className="flex justify-between font-bold pt-1"><span>Total</span><span>{receipt.formattedTotal}</span></div>
        </div>

        {receipt.payment && (
          <div className="mt-4 bg-gray-50 rounded-lg p-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Paid via</span><span className="font-medium">{receipt.payment.method}</span></div>
            {receipt.payment.reference && (
              <div className="flex justify-between"><span className="text-gray-500">Reference</span><span>{receipt.payment.reference}</span></div>
            )}
            {receipt.payment.confirmedBy && (
              <div className="flex justify-between"><span className="text-gray-500">Taken by</span><span>{receipt.payment.confirmedBy}</span></div>
            )}
            {receipt.payment.paidAt && (
              <div className="flex justify-between"><span className="text-gray-500">Paid at</span><span>{new Date(receipt.payment.paidAt).toLocaleString()}</span></div>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-2 print:hidden">
          <button onClick={() => window.print()} className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700">
            Print / Save
          </button>
          <button onClick={onEmail} disabled={emailSent} className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50">
            {emailSent ? 'Email sent' : 'Email me'}
          </button>
        </div>
        <button onClick={onClose} className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700 print:hidden">Close</button>
      </div>
    </div>
  );
}
