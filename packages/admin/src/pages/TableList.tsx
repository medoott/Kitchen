import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api.js';

interface Table {
  id: string;
  name: string;
  capacity: number;
  isActive: boolean;
  status: string;
  qrToken: string;
  _count: { reservations: number };
}

const STATUS_BADGE: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  OCCUPIED: 'bg-blue-100 text-blue-800',
  ORDERING: 'bg-indigo-100 text-indigo-800',
  WAITING_FOOD: 'bg-yellow-100 text-yellow-800',
  WAITING_WAITER: 'bg-orange-100 text-orange-800',
  READY_TO_PAY: 'bg-purple-100 text-purple-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  ORDERING: 'Ordering',
  WAITING_FOOD: 'Waiting for Food',
  WAITING_WAITER: 'Waiting for Waiter',
  READY_TO_PAY: 'Ready to Pay',
  CLOSED: 'Closed',
};

interface LocationInfo {
  id: string;
  name: string;
}

export default function TableList() {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const [tables, setTables] = useState<Table[]>([]);
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [formName, setFormName] = useState('');
  const [formCapacity, setFormCapacity] = useState(2);
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrTable, setQrTable] = useState<Table | null>(null);
  const [qrNonce, setQrNonce] = useState(0);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!qrTable) {
      setQrUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    const token = localStorage.getItem('token');
    fetch(`/api/qr/tables/${qrTable.id}/image?t=${qrNonce}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setQrUrl(objectUrl);
        }
      })
      .catch(() => setQrUrl(null));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [qrTable, qrNonce]);

  const fetchTables = () => {
    setLoading(true);
    Promise.all([
      api.get<{ data: LocationInfo }>(`/locations/${locationId}`),
      api.get<{ data: Table[] }>(`/locations/${locationId}/tables`),
    ])
      .then(([locRes, tableRes]) => {
        setLocation(locRes.data);
        setTables(tableRes.data);
        setLoading(false);
      })
      .catch((err) => { setError(err.message); setLoading(false); });
  };

  useEffect(() => {
    if (locationId) fetchTables();
  }, [locationId]);

  const openCreateForm = () => {
    setEditingTable(null);
    setFormName('');
    setFormCapacity(2);
    setFormActive(true);
    setShowForm(true);
  };

  const openEditForm = (table: Table) => {
    setEditingTable(table);
    setFormName(table.name);
    setFormCapacity(table.capacity);
    setFormActive(table.isActive);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const body = { name: formName, capacity: Number(formCapacity), isActive: formActive };
      if (editingTable) {
        await api.patch(`/locations/${locationId}/tables/${editingTable.id}`, body);
      } else {
        await api.post(`/locations/${locationId}/tables`, body);
      }
      setShowForm(false);
      fetchTables();
    } catch (err: any) {
      alert(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete table "${name}"?`)) return;
    try {
      await api.delete(`/locations/${locationId}/tables/${id}`);
      setTables((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <p className="text-gray-500">Loading tables...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  const activeCount = tables.filter((t) => t.isActive).length;
  const totalCapacity = tables.reduce((sum, t) => sum + (t.isActive ? t.capacity : 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Tables</h2>
          {location && (
            <p className="text-sm text-gray-500 mt-1">{location.name}</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/locations/${locationId}`)}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Back to Location
          </button>
          <button
            onClick={openCreateForm}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Add Table
          </button>
          <Link
            to={`/tables/board/${locationId}`}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors"
          >
            Floor View
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Tables</p>
          <p className="text-2xl font-bold text-gray-900">{tables.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Active Tables</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Capacity</p>
          <p className="text-2xl font-bold text-blue-600">{totalCapacity}</p>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-primary-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingTable ? 'Edit Table' : 'New Table'}
          </h3>
          <form onSubmit={handleSubmit} className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                placeholder="e.g. Table 1, Patio A"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity *</label>
              <input
                type="number"
                value={formCapacity}
                onChange={(e) => setFormCapacity(parseInt(e.target.value) || 1)}
                required
                min={1}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <label className="flex items-center gap-2 pb-2">
              <input
                type="checkbox"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingTable ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Table List */}
      {tables.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">No tables yet for this location.</p>
          <button onClick={openCreateForm} className="text-primary-600 hover:text-primary-700 font-medium">
            Add your first table
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reservations</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tables.map((table) => (
                <tr key={table.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {table.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {table.capacity} {table.capacity === 1 ? 'seat' : 'seats'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[table.status] || 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_LABEL[table.status] || table.status}
                    </span>
                    {!table.isActive && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactive</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {table._count.reservations}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                    <button onClick={() => { setQrTable(table); setQrNonce((n) => n + 1); }} className="text-gray-600 hover:text-gray-900 font-medium" aria-label={`QR code for table ${table.name}`}>
                      QR
                    </button>
                    <button onClick={() => openEditForm(table)} className="text-primary-600 hover:text-primary-900 font-medium" aria-label={`Edit table ${table.name}`}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(table.id, table.name)} className="text-red-600 hover:text-red-900 font-medium" aria-label={`Delete table ${table.name}`}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* QR Code Modal */}
      {qrTable && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">QR Code — {qrTable.name}</h3>
              <button onClick={() => setQrTable(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Customers scan this to open the menu and order together at the table.
            </p>
            <div className="bg-white border rounded-lg p-3 inline-block mx-auto">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt={`QR code for ${qrTable.name}`}
                  className="w-56 h-56 mx-auto"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-gray-400 text-sm">
                  Loading QR…
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <a
                href={qrUrl || '#'}
                download={`table-${qrTable.name}.png`}
                className="w-full bg-primary-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
              >
                Download PNG
              </a>
              <button
                onClick={() => qrUrl && window.open(qrUrl, '_blank')}
                className="w-full border border-gray-300 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Print (Save as PDF)
              </button>
              <button
                disabled={regenerating}
                onClick={async () => {
                  setRegenerating(true);
                  try {
                    const res = await api.post<{ data: Table }>(
                      `/locations/${locationId}/tables/${qrTable.id}/regenerate-qr`,
                      {},
                    );
                    setQrTable(res.data);
                    setQrNonce((n) => n + 1);
                  } catch (e: any) {
                    alert(e.message);
                  } finally {
                    setRegenerating(false);
                  }
                }}
                className="w-full border border-gray-300 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {regenerating ? 'Regenerating…' : 'Regenerate QR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
