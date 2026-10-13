import { afterEach, expect, it } from 'vitest';
import { useAppStore } from './store';
afterEach(() => useAppStore.setState({ locale: 'de' }));
it('starts in German and changes locale', () => { expect(useAppStore.getState().locale).toBe('de'); useAppStore.getState().setLocale('en'); expect(useAppStore.getState().locale).toBe('en'); });
