import { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext.js';
import { footerVariants } from '../templates/footers/index.js';
import type { TemplateId } from '../templates/index.js';

function ClassicFooter() {
  const { t } = useTranslation();
  const { settings } = useTheme();

  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {settings.logo ? (
                <img src={settings.logo} alt={settings.siteName} className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{settings.siteName.charAt(0)}</span>
                </div>
              )}
              <span className="text-xl font-bold text-white">{settings.siteName}</span>
            </div>
            <p className="text-sm">
              {t('footer.description')}
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-3">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/menu" className="hover:text-white transition-colors">{t('nav.menu')}</Link></li>
              <li><Link to="/locations" className="hover:text-white transition-colors">{t('nav.locations')}</Link></li>
              <li><Link to="/reservations" className="hover:text-white transition-colors">{t('nav.reservations')}</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-white font-semibold mb-3">{t('footer.account')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/login" className="hover:text-white transition-colors">{t('nav.login')}</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">{t('footer.createAccount')}</Link></li>
              <li><Link to="/account" className="hover:text-white transition-colors">{t('nav.myAccount')}</Link></li>
            </ul>

            <h3 className="text-white font-semibold mb-3 mt-6">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/impressum" className="hover:text-white transition-colors">Impressum</Link></li>
              <li>
                <button
                  onClick={() => window.dispatchEvent(new Event('open-cookie-settings'))}
                  className="hover:text-white transition-colors"
                >
                  Cookie Settings
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} {settings.siteName}. {t('footer.allRightsReserved')}</p>
        </div>
      </div>
    </footer>
  );
}

export default function Footer() {
  const { settings } = useTheme();
  const templateId = (settings.storefrontTemplate || 'classic') as TemplateId;
  const VariantFooter = footerVariants[templateId];

  if (VariantFooter) {
    return (
      <Suspense fallback={<div className="h-32 bg-gray-900" />}>
        <VariantFooter />
      </Suspense>
    );
  }

  return <ClassicFooter />;
}
