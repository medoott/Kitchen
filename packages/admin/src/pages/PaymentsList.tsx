import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

type Payment = {
  id: string;
  orderId: string;
  method: 'CASH' | 'CARD' | 'STRIPE' | 'PAYPAL';
  status: string;
  amount: number;
  currency: string;
  paidAt?: string;
  createdAt: string;
  transactionId?: string | null;
  confirmedBy?: { name: string } | null;
  order?: { orderNumber: string; total: number; paymentStatus: string };
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  AWAITING_CASH_PAYMENT: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
  REFUNDED: 'bg-purple-100 text-purple-700',
  PARTIALLY_REFUNDED: 'bg-purple-100 text-purple-700',
};

export default function PaymentsList() {
  const token = localStorage.getItem('token') || '';
  const [items, setItems] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (statusFilter) params.set('status', statusFilter);
    if (methodFilter) params.set('method', methodFilter);
    try {
      const res = await fetch(`/api/payments?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setItems(data.data.items);
        setTotal(data.data.total);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [token, page, statusFilter, methodFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmCash(p: Payment) {
    setMessage('');
    try {
      const res = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentId: p.id, method: 'CASH' }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Payment for #${p.order?.orderNumber} confirmed`);
        load();
      } else {
        setMessage(data.error || 'Failed to confirm');
      }
    } catch {
      setMessage('Network error');
    }
  }

  async function refund(p: Payment) {
    if (!window.confirm(`Refund payment #${p.order?.orderNumber} (${p.amount} ${p.currency})?`)) return;
    setMessage('');
    try {
      const res = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentId: p.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Refund processed');
        load();
      } else {
        setMessage(data.error || 'Refund failed');
      }
    } catch {
      setMessage('Network error');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/settings" className="text-sm text-primary-600 hover:text-primary-700">&larr; Back to Settings</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Payments</h1>
        </div>
      </div>

      {message && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">{message}</div>}

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex gap-3 flex-wrap">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="AWAITING_CASH_PAYMENT">Awaiting cash</option>
          <option value="PAID">Paid</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
          <option value="PARTIALLY_REFUNDED">Partially refunded</option>
        </select>
        <select value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All methods</option>
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="STRIPE">Stripe</option>
          <option value="PAYPAL">PayPal</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">Order</th>
              <th className="text-left p-3">Method</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Confirmed by</th>
              <th className="text-left p-3">Date</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-6 text-center text-gray-500">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-gray-500">No payments found</td></tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="p-3 font-medium">#{p.order?.orderNumber || p.orderId.slice(0, 8)}</td>
                  <td className="p-3">{p.method}</td>
                  <td className="p-3">{p.amount} {p.currency}</td>
                  <td className="p-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-700'}`}>
                      {p.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3">{p.confirmedBy?.name || '—'}</td>
                  <td className="p-3 text-gray-500">{new Date(p.paidAt || p.createdAt).toLocaleString()}</td>
                  <td className="p-3 text-right space-x-2">
                    {p.status === 'AWAITING_CASH_PAYMENT' && (
                      <button onClick={() => confirmCash(p)} className="text-green-600 hover:text-green-700 font-medium">Confirm</button>
                    )}
                    {p.status === 'PAID' && (
                      <button onClick={() => refund(p)} className="text-purple-600 hover:text-purple-700 font-medium">Refund</button>
                    )}
                    <Link to={`/orders/${p.orderId}`} className="text-primary-600 hover:text-primary-700 font-medium">View</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>Total: {total}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((n) => n - 1)} className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40">Prev</button>
          <button disabled={page * 20 >= total} onClick={() => setPage((n) => n + 1)} className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
