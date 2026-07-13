import { create } from 'zustand';
import { apiClient } from '../api/client';

interface HeroSection {
  title?: string;
  subtitle?: string;
  ctaPrimaryText?: string;
  ctaPrimaryLink?: string;
  ctaSecondaryText?: string;
  ctaSecondaryLink?: string;
  backgroundImage?: string;
}

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

interface CtaSection {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
}

export interface SiteSettings {
  id: string;
  siteName: string;
  siteTitle: string;
  favicon: string | null;
  logo: string | null;
  colorPrimary: string;
  colorSecondary: string;
  darkMode: 'light' | 'dark' | 'system';
  heroSection: HeroSection | null;
  featuresSection: FeatureItem[] | null;
  ctaSection: CtaSection | null;
}

interface SettingsState {
  settings: SiteSettings;
  isLoaded: boolean;
  fetchSettings: () => Promise<void>;
}

const defaultSettings: SiteSettings = {
  id: 'default',
  siteName: 'KitchenAsty',
  siteTitle: 'KitchenAsty - Order Online',
  favicon: null,
  logo: null,
  colorPrimary: '#ea580c',
  colorSecondary: '#9333ea',
  darkMode: 'light',
  heroSection: null,
  featuresSection: null,
  ctaSection: null,
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaultSettings,
  isLoaded: false,

  async fetchSettings() {
    try {
      const res = await apiClient<{ success: boolean; data: SiteSettings }>('/api/settings', { auth: false });
      if (res.success && res.data) {
        set({ settings: res.data, isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },
}));
