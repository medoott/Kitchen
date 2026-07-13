import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function SettingsPayments() {
  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Stripe
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');

  // PayPal
  const [paypalEnabled, setPaypalEnabled] = useState(false);
  const [paypalClientId, setPaypalClientId] = useState('');
  const [paypalClientSecret, setPaypalClientSecret] = useState('');
  const [paypalSandbox, setPaypalSandbox] = useState(true);

  // Cash
  const [cashEnabled, setCashEnabled] = useState(true);

  useEffect(() => {
    fetch('/api/settings/payment', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          if (d.stripeEnabled !== undefined) setStripeEnabled(d.stripeEnabled);
          if (d.stripePublishableKey) setStripePublishableKey(d.stripePublishableKey);
          if (d.stripeSecretKey) setStripeSecretKey(d.stripeSecretKey);
          if (d.stripeWebhookSecret) setStripeWebhookSecret(d.stripeWebhookSecret);
          if (d.paypalEnabled !== undefined) setPaypalEnabled(d.paypalEnabled);
          if (d.paypalClientId) setPaypalClientId(d.paypalClientId);
          if (d.paypalClientSecret) setPaypalClientSecret(d.paypalClientSecret);
          if (d.paypalSandbox !== undefined) setPaypalSandbox(d.paypalSandbox);
          if (d.cashEnabled !== undefined) setCashEnabled(d.cashEnabled);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/settings/payment', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          stripeEnabled, stripePublishableKey, stripeSecretKey, stripeWebhookSecret,
          paypalEnabled, paypalClientId, paypalClientSecret, paypalSandbox,
          cashEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data) {
          if (data.data.stripeSecretKey) setStripeSecretKey(data.data.stripeSecretKey);
          if (data.data.stripeWebhookSecret) setStripeWebhookSecret(data.data.stripeWebhookSecret);
          if (data.data.paypalClientSecret) setPaypalClientSecret(data.data.paypalClientSecret);
        }
        setSuccess('Payment settings updated');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(typeof data.error === 'string' ? data.error : 'Failed to save');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/settings" className="text-sm text-primary-600 hover:text-primary-700">&larr; Back to Settings</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Payment Gateways</h1>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      {/* Stripe */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Stripe</h2>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={stripeEnabled} onChange={(e) => setStripeEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            <span className="text-sm text-gray-700">Enabled</span>
          </label>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Publishable Key</label>
            <input type="text" value={stripePublishableKey} onChange={(e) => setStripePublishableKey(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="pk_..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
            <input type="password" value={stripeSecretKey} onChange={(e) => setStripeSecretKey(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="sk_..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret</label>
            <input type="password" value={stripeWebhookSecret} onChange={(e) => setStripeWebhookSecret(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="whsec_..." />
          </div>
        </div>
      </div>

      {/* PayPal */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">PayPal</h2>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={paypalEnabled} onChange={(e) => setPaypalEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            <span className="text-sm text-gray-700">Enabled</span>
          </label>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
            <input type="text" value={paypalClientId} onChange={(e) => setPaypalClientId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
            <input type="password" value={paypalClientSecret} onChange={(e) => setPaypalClientSecret(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={paypalSandbox} onChange={(e) => setPaypalSandbox(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            <span className="text-sm font-medium text-gray-700">Sandbox mode</span>
          </label>
        </div>
      </div>

      {/* Cash */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Cash on Delivery</h2>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={cashEnabled} onChange={(e) => setCashEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
            <span className="text-sm text-gray-700">Enabled</span>
          </label>
        </div>
      </div>
    </div>
  );
}
