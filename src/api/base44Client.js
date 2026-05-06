import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// Custom storage adapter that uses localStorage for session persistence
const storageAdapter = {
  getItem: (key) => {
    try {
      const value = window.localStorage.getItem(key);
      console.log('[Base44Storage] Getting key:', key, 'value:', value ? 'exists' : 'null');
      return value;
    } catch (error) {
      console.error('[Base44Storage] Error reading from localStorage:', error);
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      console.log('[Base44Storage] Setting key:', key, 'value length:', value?.length || 0);
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.error('[Base44Storage] Error writing to localStorage:', error);
    }
  },
  removeItem: (key) => {
    try {
      console.log('[Base44Storage] Removing key:', key);
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error('[Base44Storage] Error removing from localStorage:', error);
    }
  }
};

//Create a client with authentication required and session persistence
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl,
  persistSession: true,
  storage: storageAdapter
});
