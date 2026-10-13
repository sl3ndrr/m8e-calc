import { migrateSettings, SETTINGS_VERSION, type Settings } from '../shared/settings';
export function downloadFile(content: string, name: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportSettings(settings: Settings): string { return JSON.stringify({ version: SETTINGS_VERSION, settings }, null, 2); }
export function importSettings(content: string): Settings {
  const parsed: unknown = JSON.parse(content);
  if (typeof parsed !== 'object' || parsed === null || !('version' in parsed) || typeof parsed.version !== 'number' || ![0,1,SETTINGS_VERSION].includes(parsed.version) || !('settings' in parsed) || typeof parsed.settings !== 'object' || parsed.settings === null || Array.isArray(parsed.settings)) throw new TypeError('Invalid settings file');
  const settings = migrateSettings(parsed.settings, parsed.version);
  // Imports are stricter than recovery: do not silently accept malformed present fields.
  for (const [key, value] of Object.entries(parsed.settings)) {
    if (parsed.version === 0 && (key === 'theme' || key === 'seed')) continue;
    if (!(key in settings) || settings[key as keyof Settings] !== value) throw new TypeError('Invalid settings field');
  }
  if (!Object.keys(parsed.settings).length) throw new TypeError('Empty settings file');
  return settings;
}
