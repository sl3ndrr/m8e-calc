import { create } from 'zustand';
import type { Locale } from './i18n';

interface AppState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}
export const useAppStore = create<AppState>((set) => ({
  locale: 'de',
  setLocale: (locale) => set({ locale }),
}));
