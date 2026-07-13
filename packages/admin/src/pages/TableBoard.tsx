import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api } from '../lib/api.js';

interface Table {
  id: string;
  name: string;
  capacity: number;
  isActive: boolean;
  status: string;
}

interface CallWaiterRequest {
  id: string;
  tableId: string;
  status: string;
  note?: string | null;
  createdAt: string;
  completedAt?: string | null;
  table?: { id: string; name: string };
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  options: { name: string; value: string; priceModifier: number }[];
}

interface TableOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: 'bg-green-50 border-green-300 text-green-800',
  OCCUPIED: 'bg-blue-50 border-blue-300 text-blue-800',
  ORDERING: 'bg-indigo-50 border-indigo-300 text-indigo-800',
  WAITING_FOOD: 'bg-yellow-50 border-yellow-300 text-yellow-800',
  WAITING_WAITER: 'bg-orange-50 border-orange-300 text-orange-800',
  READY_TO_PAY: 'bg-purple-50 border-purple-300 text-purple-800',
  CLOSED: 'bg-gray-50 border-gray-300 text-gray-800',
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

export default function TableBoard() {
  const { locationId } = useParams();
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [activeLocation, setActiveLocation] = useState<string | null>(locationId || null);
  const [tables, setTables] = useState<Table[]>([]);
  const [requests, setRequests] = useState<CallWaiterRequest[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableOrders, setTableOrders] = useState<TableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load the location list once, and default to the URL/first location
  useEffect(() => {
    if (locationId) {
      setActiveLocation(locationId);
      return;
    }
    api
      .get<{ data: { id: string; name: string }[] }>('/locations')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setLocations(list);
        setActiveLocation((prev) => prev ?? list[0]?.id ?? null);
      })
      .catch((err) => setError(err.message || 'Failed to load locations'))
      .finally(() => setLoading(false));
  }, [locationId]);

  const fetchTables = useCallback(() => {
    if (!activeLocation) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<{ data: Table[] }>(`/locations/${activeLocation}/tables`),
      api.get<{ data: CallWaiterRequest[] }>(`/call-waiter?locationId=${activeLocation}&status=PENDING`),
    ])
      .then(([t, r]) => {
        setTables(Array.isArray(t.data) ? t.data : []);
        setRequests(Array.isArray(r.data) ? r.data : []);
      })
      .catch((err) => setError(err.message || 'Failed to load floor'))
      .finally(() => setLoading(false));
  }, [activeLocation]);

  useEffect(() => {
    if (activeLocation) fetchTables();
  }, [activeLocation, fetchTables]);

  // Real-time updates (join kitchen room: receives table + call-waiter events)
  useEffect(() => {
    const socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
    socket.emit('join:kitchen');

    socket.on('table:statusUpdate', (d: { id: string; status: string }) => {
      setTables((prev) => prev.map((t) => (t.id === d.id ? { ...t, status: d.status } : t)));
    });
    socket.on('table:callWaiter', (d: CallWaiterRequest) => {
      setRequests((prev) => (prev.some((r) => r.id === d.id) ? prev : [d, ...prev]));
    });
    socket.on('table:callWaiterUpdate', (d: { id: string; status: string; completedAt?: string | null }) => {
      setRequests((prev) =>
        prev
          .map((r) => (r.id === d.id ? { ...r, status: d.status, completedAt: d.completedAt ?? r.completedAt } : r))
          .filter((r) => r.status === 'PENDING' || r.status === 'ACCEPTED'),
      );
    });

    return () => {
      socket.emit('leave:kitchen');
      socket.disconnect();
    };
  }, []);

  const loadTableOrders = (tableId: string) => {
    setSelectedTable(tableId);
    const statuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].join(',');
    api
      .get<{ data: TableOrder[] }>(`/orders?tableId=${tableId}&includeItems=true&status=${statuses}&limit=20`)
      .then((res) => setTableOrders(res.data))
      .catch(() => setTableOrders([]));
  };

  const updateRequest = async (id: string, status: string) => {
    try {
      await api.patch(`/call-waiter/${id}`, { status });
      setRequests((prev) =>
        prev
          .map((r) => (r.id === id ? { ...r, status, completedAt: status === 'COMPLETED' ? new Date().toISOString() : r.completedAt } : r))
          .filter((r) => r.status === 'PENDING' || r.status === 'ACCEPTED'),
      );
    } catch {
      fetchTables();
    }
  };

  const freeTable = async (tableId: string) => {
    if (!activeLocation) return;
    try {
      await api.patch(`/locations/${activeLocation}/tables/${tableId}/status`, { status: 'AVAILABLE' });
      setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, status: 'AVAILABLE' } : t)));
      setSelectedTable(null);
      setTableOrders([]);
    } catch {
      fetchTables();
    }
  };

  if (loading && !tables.length) {
    return <p className="text-gray-500 p-6">Loading floor…</p>;
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600 mb-3">{error}</p>
        <button onClick={fetchTables} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-semibold text-gray-800">Floor View</h2>
        <div className="flex items-center gap-3">
          {locations.length > 0 && (
            <select
              value={activeLocation || ''}
              onChange={(e) => {
                setActiveLocation(e.target.value);
                setSelectedTable(null);
                setTableOrders([]);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table grid */}
        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Tables</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {tables.map((t) => (
              <button
                key={t.id}
                onClick={() => loadTableOrders(t.id)}
                className={`text-left border rounded-xl p-3 transition ${STATUS_COLOR[t.status] || 'bg-gray-50 border-gray-300'} ${
                  selectedTable === t.id ? 'ring-2 ring-primary-500' : ''
                } ${!t.isActive ? 'opacity-50' : ''}`}
              >
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs mt-1">{STATUS_LABEL[t.status] || t.status}</p>
                <p className="text-xs opacity-70 mt-1">{t.capacity} seats</p>
              </button>
            ))}
            {tables.length === 0 && <p className="text-gray-500 col-span-full">No tables configured.</p>}
          </div>
        </div>

        {/* Call waiter + orders */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">🔔 Call Waiter</h3>
            {requests.length === 0 ? (
              <p className="text-sm text-gray-400">No active requests.</p>
            ) : (
              <ul className="space-y-2">
                {requests.map((r) => (
                  <li key={r.id} className="border rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Table {r.table?.name}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(r.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    {r.note && <p className="text-gray-500 mt-1">“{r.note}”</p>}
                    <div className="mt-2 flex gap-2">
                      {r.status === 'PENDING' && (
                        <button
                          onClick={() => updateRequest(r.id, 'ACCEPTED')}
                          className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-xs font-medium"
                        >
                          Accept
                        </button>
                      )}
                      <button
                        onClick={() => updateRequest(r.id, 'COMPLETED')}
                        className="flex-1 bg-green-600 text-white py-1.5 rounded-lg text-xs font-medium"
                      >
                        Complete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedTable && (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  Orders — {tables.find((t) => t.id === selectedTable)?.name}
                </h3>
                <button
                  onClick={() => freeTable(selectedTable)}
                  className="text-xs bg-purple-600 text-white px-2 py-1 rounded-lg"
                >
                  Free Table
                </button>
              </div>
              {tableOrders.length === 0 ? (
                <p className="text-sm text-gray-400">No open orders.</p>
              ) : (
                <ul className="space-y-3">
                  {tableOrders.map((o) => (
                    <li key={o.id} className="border rounded-lg p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">#{o.orderNumber}</span>
                        <span className="text-gray-500">{o.status}</span>
                      </div>
                      <ul className="mt-1 text-gray-600">
                        {o.items.map((i) => (
                          <li key={i.id}>
                            {i.quantity}× {i.name}
                            {i.options.length > 0 && (
                              <span className="text-xs text-gray-400">
                                {' '}
                                ({i.options.map((op) => op.value).join(', ')})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1 font-medium">Total: {o.total.toFixed(2)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
