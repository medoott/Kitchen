import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function DeveloperSettings() {
  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [analyticsId, setAnalyticsId] = useState('');
  const [sentryDsn, setSentryDsn] = useState('');
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState('');
  const [recaptchaSecretKey, setRecaptchaSecretKey] = useState('');

  useEffect(() => {
    fetch('/api/settings/developer', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          if (d.googleMapsApiKey) setGoogleMapsApiKey(d.googleMapsApiKey);
          if (d.analyticsId) setAnalyticsId(d.analyticsId);
          if (d.sentryDsn) setSentryDsn(d.sentryDsn);
          if (d.recaptchaSiteKey) setRecaptchaSiteKey(d.recaptchaSiteKey);
          if (d.recaptchaSecretKey) setRecaptchaSecretKey(d.recaptchaSecretKey);
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
      const res = await fetch('/api/settings/developer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ googleMapsApiKey, analyticsId, sentryDsn, recaptchaSiteKey, recaptchaSecretKey }),
      });
      const data = await res.json();
      if (data.success) {
        const d = data.data || {};
        if (d.googleMapsApiKey) setGoogleMapsApiKey(d.googleMapsApiKey);
        if (d.sentryDsn) setSentryDsn(d.sentryDsn);
        if (d.recaptchaSecretKey) setRecaptchaSecretKey(d.recaptchaSecretKey);
        setSuccess('Developer settings updated');
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
          <Link to="/" className="text-sm text-primary-600 hover:text-primary-700">&larr; Back to Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Developer Settings</h1>
          <p className="text-sm text-gray-500 mt-1">API keys and integration config. Visible only to the Developer role.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps API Key</label>
          <input type="password" value={googleMapsApiKey} onChange={(e) => setGoogleMapsApiKey(e.target.value)} className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Enter API key" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Analytics ID</label>
          <input type="text" value={analyticsId} onChange={(e) => setAnalyticsId(e.target.value)} className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="G-XXXXXXXXXX" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sentry DSN</label>
          <input type="password" value={sentryDsn} onChange={(e) => setSentryDsn(e.target.value)} className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="https://...@sentry.io/..." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">reCAPTCHA Site Key</label>
            <input type="text" value={recaptchaSiteKey} onChange={(e) => setRecaptchaSiteKey(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">reCAPTCHA Secret Key</label>
            <input type="password" value={recaptchaSecretKey} onChange={(e) => setRecaptchaSecretKey(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
