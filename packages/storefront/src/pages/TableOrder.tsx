import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useTheme } from '../context/ThemeContext.js';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface OptionValue {
  id: string;
  name: string;
  priceModifier: number;
  isDefault: boolean;
}

interface MenuOption {
  id: string;
  name: string;
  displayType: 'SELECT' | 'RADIO' | 'CHECKBOX' | 'QUANTITY';
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  values: OptionValue[];
}

interface MenuItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  image: string | null;
  options: MenuOption[];
}

interface CartLine {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  comment?: string;
  options: { menuOptionValueId: string; name: string; value: string; priceModifier: number }[];
}

interface TableInfo {
  id: string;
  name: string;
  capacity: number;
  status: string;
  locationId: string;
  locationName: string | null;
  orderUrl: string;
}

export default function TableOrder() {
  const { token } = useParams<{ token: string }>();
  const { formatPrice } = useTheme();

  const [table, setTable] = useState<TableInfo | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [tableId, setTableId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [waiterMsg, setWaiterMsg] = useState('');

  const socketRef = useRef<any>(null);
  const orderSocketRef = useRef<any>(null);
  const [orders, setOrders] = useState<{ id: string; orderNumber: string; status: string }[]>([]);

  // Resolve table + open session
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/qr/table/${token}`);
        if (!res.ok) throw new Error('Invalid or inactive table QR code');
        const json = await res.json();
        if (cancelled) return;
        setTable(json.data);

        const sessionRes = await fetch('/api/table-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const sessionJson = await sessionRes.json();
        if (cancelled) return;
        if (sessionJson.success) {
          setSessionToken(sessionJson.data.sessionToken);
          setTableId(sessionJson.data.tableId);
          setCart(sessionJson.data.cart || []);
        }

        const catRes = await fetch('/api/menu/categories');
        const catJson = await catRes.json();
        if (!cancelled && catJson.success) {
          const cats = catJson.data.filter((c: Category) => !c.slug?.startsWith('hidden'));
          setCategories(cats);
          setActiveCategory(cats[0]?.id ?? null);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load table');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Real-time shared cart
  useEffect(() => {
    if (!tableId) return;
    const socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.emit('join:table', tableId);
    socket.on('table:cartUpdate', (payload: { cart: CartLine[] }) => {
      setCart(payload.cart || []);
    });
    return () => {
      socket.emit('leave:table', tableId);
      socket.disconnect();
    };
  }, [tableId]);

  // Real-time order tracking for this device
  useEffect(() => {
    const socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
    orderSocketRef.current = socket;
    socket.on('order:statusUpdate', (data: { id: string; status: string }) => {
      setOrders((prev) => prev.map((o) => (o.id === data.id ? { ...o, status: data.status } : o)));
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  // Load items for active category
  useEffect(() => {
    if (!activeCategory) return;
    setItems([]);
    fetch(`/api/menu/items?categoryId=${activeCategory}&limit=100`)
      .then((r) => r.json())
      .then((j) => setItems(j.data || []))
      .catch(() => setItems([]));
  }, [activeCategory]);

  const pushCart = useCallback(
    (next: CartLine[]) => {
      setCart(next);
      if (sessionToken && tableId) {
        fetch(`/api/table-sessions/${sessionToken}/cart`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cart: next, tableId }),
        }).catch(() => {});
      }
    },
    [sessionToken, tableId],
  );

  const addLine = (line: CartLine) => {
    setSuccess(null);
    const existing = cart.find(
      (c) => c.menuItemId === line.menuItemId && c.comment === line.comment &&
        JSON.stringify(c.options) === JSON.stringify(line.options),
    );
    if (existing) {
      pushCart(
        cart.map((c) =>
          c === existing ? { ...c, quantity: c.quantity + line.quantity } : c,
        ),
      );
    } else {
      pushCart([...cart, line]);
    }
    setSelectedItem(null);
  };

  const changeQty = (idx: number, delta: number) => {
    const next = cart.map((c, i) =>
      i === idx ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c,
    );
    pushCart(next);
  };

  const removeLine = (idx: number) => {
    pushCart(cart.filter((_, i) => i !== idx));
  };

  const cartTotal = cart.reduce(
    (sum, l) =>
      sum + l.quantity * (l.price + l.options.reduce((s, o) => s + o.priceModifier, 0)),
    0,
  );

  const callWaiter = async () => {
    if (!token) return;
    try {
      await fetch(`/api/call-waiter/tables/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: waiterMsg }),
      });
      setWaiterMsg('');
      setSuccess('Waiter called — someone will be right with you.');
    } catch {
      setError('Failed to call waiter');
    }
  };

  const placeOrder = async () => {
    if (!sessionToken || cart.length === 0) return;
    setPlacing(true);
    setError('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderType: 'DINE_IN',
          items: cart.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            comment: l.comment,
            options: l.options,
          })),
          tableSessionToken: sessionToken,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Order failed');
      setSuccess(`Order ${json.data.orderNumber} placed! The kitchen is preparing your food.`);
      setCart([]);
      // Track this order live
      setOrders((prev) => [
        ...prev,
        { id: json.data.id, orderNumber: json.data.orderNumber, status: json.data.status },
      ]);
      orderSocketRef.current?.emit('join:order', json.data.id);
    } catch (err: any) {
      setError(err.message || 'Order failed');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !table) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">🍽️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Table ordering unavailable</h1>
          <p className="text-gray-600">{error}</p>
          <Link to="/" className="mt-4 inline-block text-primary-600 font-medium">Go to homepage</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-primary-600 text-white px-4 py-4 sticky top-0 z-20 shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide opacity-80">Table</p>
            <h1 className="text-lg font-bold">{table?.name}</h1>
            {table?.locationName && (
              <p className="text-xs opacity-80">{table.locationName}</p>
            )}
          </div>
          <button
            onClick={callWaiter}
            className="bg-white text-primary-700 font-semibold px-3 py-2 rounded-lg text-sm shadow"
          >
            🔔 Call Waiter
          </button>
        </div>
        {waiterMsg !== undefined && (
          <input
            value={waiterMsg}
            onChange={(e) => setWaiterMsg(e.target.value)}
            placeholder="Note for waiter (optional)"
            className="mt-2 w-full rounded-lg px-3 py-2 text-sm text-gray-900"
          />
        )}
      </header>

      {success && (
        <div className="mx-4 mt-4 bg-green-50 text-green-700 border border-green-200 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}
      {error && table && (
        <div className="mx-4 mt-4 bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Live order tracking */}
      {orders.length > 0 && (
        <div className="max-w-3xl mx-auto w-full px-4 mt-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Your Orders</h2>
          {orders.map((o) => (
            <OrderTracker key={o.id} order={o} />
          ))}
        </div>
      )}

      {/* Category tabs */}
      <nav className="bg-white border-b sticky top-[88px] z-10 overflow-x-auto whitespace-nowrap px-2 py-2 flex gap-2">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              activeCategory === c.id
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {c.name}
          </button>
        ))}
      </nav>

      {/* Menu items */}
      <main className="flex-1 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto w-full">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className="text-left bg-white rounded-xl shadow-sm p-4 flex gap-3 hover:shadow-md transition"
          >
            {item.image && (
              <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg" />
            )}
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{item.name}</p>
              {item.description && (
                <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
              )}
              <p className="mt-1 font-medium text-gray-900">{formatPrice(item.price)}</p>
            </div>
          </button>
        ))}
        {items.length === 0 && (
          <p className="text-gray-500 col-span-full text-center py-10">No items in this category.</p>
        )}
      </main>

      {/* Shared cart bar */}
      <footer className="sticky bottom-0 bg-white border-t shadow-[0_-4px_12px_rgba(0,0,0,0.05)] p-3 pb-5">
        <div className="max-w-3xl mx-auto">
          {cart.length > 0 && (
            <div className="mb-3 max-h-40 overflow-y-auto divide-y">
              {cart.map((l, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex-1 pr-2">
                    <p className="font-medium text-gray-900">
                      {l.quantity}× {l.name}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {formatPrice(
                        l.price * l.quantity +
                          l.options.reduce((s, o) => s + o.priceModifier * l.quantity, 0),
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => changeQty(i, -1)}
                      className="w-7 h-7 rounded-full bg-gray-100 text-gray-700"
                    >
                      −
                    </button>
                    <button
                      onClick={() => changeQty(i, 1)}
                      className="w-7 h-7 rounded-full bg-gray-100 text-gray-700"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeLine(i)}
                      className="text-red-500 text-xs ml-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500">Shared table cart</p>
              <p className="text-lg font-bold text-gray-900">{formatPrice(cartTotal)}</p>
            </div>
            <button
              disabled={cart.length === 0 || placing}
              onClick={placeOrder}
              className="flex-1 bg-primary-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
            >
              {placing ? 'Placing…' : `Place Order (${cart.length})`}
            </button>
          </div>
        </div>
      </footer>

      {selectedItem && (
        <AddItemModal
          item={selectedItem}
          formatPrice={formatPrice}
          onClose={() => setSelectedItem(null)}
          onAdd={addLine}
        />
      )}
    </div>
  );
}

const DINE_IN_STEPS = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] as const;
const STEP_LABEL: Record<string, string> = {
  PENDING: 'Received',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready to serve',
};

function OrderTracker({ order }: { order: { id: string; orderNumber: string; status: string } }) {
  const idx = DINE_IN_STEPS.indexOf(order.status as (typeof DINE_IN_STEPS)[number]);
  const active = idx < 0 ? -1 : idx;
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-gray-900">Order #{order.orderNumber}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            order.status === 'READY'
              ? 'bg-green-100 text-green-800'
              : order.status === 'CANCELLED'
                ? 'bg-red-100 text-red-800'
                : 'bg-primary-50 text-primary-700'
          }`}
        >
          {STEP_LABEL[order.status] || order.status}
        </span>
      </div>
      <div className="flex items-center">
        {DINE_IN_STEPS.map((s, i) => (
          <Fragment key={s}>
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  i < active
                    ? 'bg-primary-600 text-white'
                    : i === active
                      ? 'bg-primary-600 text-white ring-4 ring-primary-200'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i < active ? '✓' : i + 1}
              </div>
              <span className="text-[10px] mt-1 text-gray-500 whitespace-nowrap">{STEP_LABEL[s]}</span>
            </div>
            {i < DINE_IN_STEPS.length - 1 && (
              <div className={`flex-1 h-1 mx-1 mb-4 rounded ${i < active ? 'bg-primary-600' : 'bg-gray-200'}`} />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function AddItemModal({
  item,
  formatPrice,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  formatPrice: (n: number) => string;
  onClose: () => void;
  onAdd: (line: CartLine) => void;
}) {
  const [detail, setDetail] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetch(`/api/menu/items/${item.id}`)
      .then((r) => r.json())
      .then((j) => {
        const withOptions: MenuItem = j.data;
        setDetail(withOptions);
        const defaults: Record<string, string[]> = {};
        (withOptions.options || []).forEach((opt) => {
          const def = opt.values.filter((v) => v.isDefault).map((v) => v.id);
          defaults[opt.id] = def;
        });
        setSelections(defaults);
      })
      .catch(() => setDetail(item));
  }, [item]);

  const toggle = (optId: string, valueId: string, multi: boolean) => {
    setSelections((prev) => {
      const cur = prev[optId] || [];
      if (multi) {
        return { ...prev, [optId]: cur.includes(valueId) ? cur.filter((v) => v !== valueId) : [...cur, valueId] };
      }
      return { ...prev, [optId]: [valueId] };
    });
  };

  const priceWithOptions = () => {
    if (!detail) return item.price;
    let total = item.price;
    (detail.options || []).forEach((opt) => {
      (selections[opt.id] || []).forEach((vid) => {
        const v = opt.values.find((x) => x.id === vid);
        if (v) total += v.priceModifier;
      });
    });
    return total;
  };

  const handleAdd = () => {
    if (!detail) return;
    const options: CartLine['options'] = [];
    (detail.options || []).forEach((opt) => {
      (selections[opt.id] || []).forEach((vid) => {
        const v = opt.values.find((x) => x.id === vid);
        if (v) options.push({ menuOptionValueId: v.id, name: opt.name, value: v.name, priceModifier: v.priceModifier });
      });
    });
    onAdd({
      menuItemId: detail.id,
      name: detail.name,
      price: detail.price,
      quantity,
      comment: comment || undefined,
      options,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-3">
          <h2 className="text-lg font-bold text-gray-900">{detail?.name || item.name}</h2>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>
        {detail?.description && <p className="text-sm text-gray-500 mb-3">{detail.description}</p>}

        {detail?.options?.map((opt) => (
          <div key={opt.id} className="mb-4">
            <p className="font-medium text-gray-900 text-sm mb-1">
              {opt.name}{opt.isRequired ? ' *' : ''}
            </p>
            <div className="space-y-1">
              {opt.values.map((v) => {
                const checked = (selections[opt.id] || []).includes(v.id);
                return (
                  <label
                    key={v.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm cursor-pointer ${
                      checked ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type={opt.displayType === 'CHECKBOX' ? 'checkbox' : 'radio'}
                        checked={checked}
                        onChange={() => toggle(opt.id, v.id, opt.displayType === 'CHECKBOX')}
                      />
                      {v.name}
                    </span>
                    {v.priceModifier > 0 && (
                      <span className="text-gray-500">+{formatPrice(v.priceModifier)}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mb-4">
          <p className="font-medium text-gray-900 text-sm mb-1">Note</p>
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g. no onions"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-full bg-gray-100"
            >
              −
            </button>
            <span className="font-semibold">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-full bg-gray-100"
            >
              +
            </button>
          </div>
          <span className="text-lg font-bold text-gray-900">{formatPrice(priceWithOptions() * quantity)}</span>
        </div>

        <button
          onClick={handleAdd}
          className="w-full bg-primary-600 text-white font-semibold py-3 rounded-xl"
        >
          Add to table cart
        </button>
      </div>
    </div>
  );
}
