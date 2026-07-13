import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import { Link } from 'react-router-dom';

interface Location {
  id: string;
  name: string;
  address: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface Reservation {
  id: string;
  date: string;
  time: string;
  partySize: number;
  status: string;
  comment: string | null;
  location: { id: string; name: string };
  table: { id: string; name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  SEATED: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-200 text-green-900',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function Reservations() {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);

  // Form state
  const [locationId, setLocationId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [comment, setComment] = useState('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Load locations
  useEffect(() => {
    fetch('/api/locations')
      .then((res) => res.json())
      .then((data) => setLocations(data.data || []))
      .catch(() => {});
  }, []);

  // Load customer reservations
  useEffect(() => {
    if (!token) return;
    fetch('/api/reservations/my-reservations', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setMyReservations(data.data || []))
      .catch(() => {});
  }, [token, success]);

  // Load availability when location, date, and party size change
  useEffect(() => {
    if (!locationId || !date) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    const params = new URLSearchParams({ locationId, date, partySize: String(partySize) });
    fetch(`/api/reservations/availability?${params}`)
      .then((res) => res.json())
      .then((data) => setSlots(data.data?.slots || []))
      .catch(() => {})
      .finally(() => setLoadingSlots(false));
  }, [locationId, date, partySize]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user) {
      setError(t('reservations.loginRequired'));
      return;
    }
    if (!locationId || !date || !time) {
      setError(t('reservations.selectDateFirst'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ locationId, date, time, partySize, comment: comment || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create reservation');
      setSuccess('Reservation created!');
      setTime('');
      setComment('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('reservations.title')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Booking Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('reservations.bookTable')}</h2>

          {!user && (
            <div className="bg-yellow-50 text-yellow-800 text-sm p-3 rounded-lg mb-4">
              <Link to="/login" className="underline font-medium">{t('nav.login')}</Link> {t('reservations.loginRequired').toLowerCase()}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('reservations.location')}</label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">{t('reservations.selectLocation')}</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('reservations.date')}</label>
                <input
                  type="date"
                  value={date}
                  min={today}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('reservations.partySize')}</label>
                <select
                  value={partySize}
                  onChange={(e) => setPartySize(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? t('reservations.guest', { count: n }) : t('reservations.guests', { count: n })}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Time Slots */}
            {locationId && date && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('reservations.availableSlots')}</label>
                {loadingSlots ? (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-gray-500 text-sm">{t('reservations.noSlots')}</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setTime(slot.time)}
                        className={`px-2 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                          time === slot.time
                            ? 'bg-primary-600 text-white'
                            : slot.available
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('reservations.specialRequests')}</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
              />
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}
            {success && <div className="text-green-600 text-sm">{success}</div>}

            <button
              type="submit"
              disabled={submitting || !user}
              className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {submitting ? t('reservations.booking') : t('reservations.bookNow')}
            </button>
          </form>
        </div>

        {/* My Reservations */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('reservations.myReservations')}</h2>
          {!user ? (
            <p className="text-gray-500 text-sm">{t('reservations.loginRequired')}</p>
          ) : myReservations.length === 0 ? (
            <p className="text-gray-500 text-sm">{t('reservations.noReservations')}</p>
          ) : (
            <div className="space-y-3">
              {myReservations.map((r) => (
                <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {new Date(r.date).toLocaleDateString()} at {r.time}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100'}`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {r.location.name} &middot; {r.partySize} {r.partySize === 1 ? t('reservations.guest', { count: 1 }) : t('reservations.guests', { count: r.partySize })}
                    {r.table && ` \u00B7 Table: ${r.table.name}`}
                  </div>
                  {r.comment && (
                    <p className="text-xs text-gray-400 mt-1 italic">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
