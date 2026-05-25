import { Preferences } from '@capacitor/preferences';

const isNative = () => {
  try {
    return window.Capacitor?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
};

/**
 * Capacitor Preferences storage adapter for Supabase auth.
 * Uses encrypted native storage on iOS/Android, falls back to localStorage on web.
 */
export const capacitorStorage = {
  getItem: async (key) => {
    if (!isNative()) return localStorage.getItem(key);
    const { value } = await Preferences.get({ key });
    return value;
  },
  setItem: async (key, value) => {
    if (!isNative()) { localStorage.setItem(key, value); return; }
    await Preferences.set({ key, value });
  },
  removeItem: async (key) => {
    if (!isNative()) { localStorage.removeItem(key); return; }
    await Preferences.remove({ key });
  },
};
