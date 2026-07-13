import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function SettingsReservation() {
  const token = localStorage.getItem('token') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [enabled, setEnabled] = useState(true);
  const [timeInterval, setTimeInterval] = useState(30);
  const [stayTime, setStayTime] = useState(90);
  const [maxAdvanceBookingDays, setMaxAdvanceBookingDays] = useState(30);
  const [minCancellationNoticeHours, setMinCancellationNoticeHours] = useState(2);
  const [autoConfirm, setAutoConfirm] = useState(false);

  useEffect(() => {
    fetch('/api/settings/reservation', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          if (d.enabled !== undefined) setEnabled(d.enabled);
          if (d.timeInterval !== undefined) setTimeInterval(d.timeInterval);
          if (d.stayTime !== undefined) setStayTime(d.stayTime);
          if (d.maxAdvanceBookingDays !== undefined) setMaxAdvanceBookingDays(d.maxAdvanceBookingDays);
          if (d.minCancellationNoticeHours !== undefined) setMinCancellationNoticeHours(d.minCancellationNoticeHours);
          if (d.autoConfirm !== undefined) setAutoConfirm(d.autoConfirm);
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
      const res = await fetch('/api/settings/reservation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled, timeInterval, stayTime, maxAdvanceBookingDays, minCancellationNoticeHours, autoConfirm }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Reservation settings updated');
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
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Reservation Settings</h1>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
          <span className="text-sm font-medium text-gray-700">Reservations enabled</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Interval (min)</label>
            <input type="number" min={1} value={timeInterval} onChange={(e) => setTimeInterval(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
            <p className="mt-1 text-xs text-gray-500">Time slot interval for booking slots</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stay Time (min)</label>
            <input type="number" min={1} value={stayTime} onChange={(e) => setStayTime(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
            <p className="mt-1 text-xs text-gray-500">Average time a party occupies a table</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Advance Booking (days)</label>
            <input type="number" min={1} value={maxAdvanceBookingDays} onChange={(e) => setMaxAdvanceBookingDays(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Cancellation Notice (hours)</label>
            <input type="number" min={0} value={minCancellationNoticeHours} onChange={(e) => setMinCancellationNoticeHours(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
        </div>

        <label className="flex items-center gap-3">
          <input type="checkbox" checked={autoConfirm} onChange={(e) => setAutoConfirm(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
          <span className="text-sm font-medium text-gray-700">Auto-confirm reservations</span>
        </label>
      </div>
    </div>
  );
}
