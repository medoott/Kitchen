import { useState, useEffect, useCallback } from 'react';

interface CookieCategory {
  id: string;
  name: string;
  label: string;
  description: string;
  isRequired: boolean;
}

const STORAGE_KEY = 'cookie-consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [categories, setCategories] = useState<CookieCategory[]>([]);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;

    fetch('/api/legal/cookie-categories')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data.length > 0) {
          setCategories(res.data);
          const defaults: Record<string, boolean> = {};
          for (const cat of res.data) {
            defaults[cat.id] = cat.isRequired ? true : false;
          }
          setPreferences(defaults);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  const saveConsent = useCallback(
    (prefs: Record<string, boolean>) => {
      const consents = Object.entries(prefs).map(([cookieCategoryId, accepted]) => ({
        cookieCategoryId,
        accepted,
      }));

      fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consents }),
      }).catch(() => {});

      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      setVisible(false);
    },
    []
  );

  const acceptAll = useCallback(() => {
    const all: Record<string, boolean> = {};
    for (const cat of categories) all[cat.id] = true;
    saveConsent(all);
  }, [categories, saveConsent]);

  const saveSelected = useCallback(() => {
    saveConsent(preferences);
  }, [preferences, saveConsent]);

  // Allow reopening via custom event (used by Footer "Cookie Settings" link)
  useEffect(() => {
    function handleOpen() {
      if (categories.length === 0) {
        fetch('/api/legal/cookie-categories')
          .then((r) => r.json())
          .then((res) => {
            if (res.success) {
              setCategories(res.data);
              const stored = localStorage.getItem(STORAGE_KEY);
              const prefs: Record<string, boolean> = stored ? JSON.parse(stored) : {};
              const merged: Record<string, boolean> = {};
              for (const cat of res.data) {
                merged[cat.id] = cat.isRequired ? true : (prefs[cat.id] ?? false);
              }
              setPreferences(merged);
              setVisible(true);
            }
          })
          .catch(() => {});
      } else {
        const stored = localStorage.getItem(STORAGE_KEY);
        const prefs: Record<string, boolean> = stored ? JSON.parse(stored) : {};
        const merged: Record<string, boolean> = {};
        for (const cat of categories) {
          merged[cat.id] = cat.isRequired ? true : (prefs[cat.id] ?? false);
        }
        setPreferences(merged);
        setVisible(true);
      }
    }

    window.addEventListener('open-cookie-settings', handleOpen);
    return () => window.removeEventListener('open-cookie-settings', handleOpen);
  }, [categories]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Cookie Preferences</h3>
              <p className="text-xs text-gray-500 mt-1">
                We use cookies to enhance your experience. You can customize your preferences below.
              </p>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-primary-600 hover:text-primary-700 whitespace-nowrap"
            >
              {showDetails ? 'Hide details' : 'Show details'}
            </button>
          </div>

          {showDetails && (
            <div className="space-y-2 border-t border-gray-100 pt-3">
              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div>
                    <span className="font-medium text-gray-800">{cat.label}</span>
                    <span className="block text-xs text-gray-500">{cat.description}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences[cat.id] ?? false}
                    disabled={cat.isRequired}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, [cat.id]: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
              ))}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={saveSelected}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Save Preferences
            </button>
            <button
              onClick={acceptAll}
              className="px-4 py-2 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
