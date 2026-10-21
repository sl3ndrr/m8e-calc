import { useEffect, useState } from 'react';
import { snackbarQueue } from '../ui/snackbarQueue';
import { t } from '../shared/i18n';
interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export interface PwaInstallation {
  canInstall: boolean;
  install: () => void;
}
export function usePwa(): PwaInstallation {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined,
      reload = false,
      disposed = false,
      notified = false;
    const cleanups: (() => void)[] = [];
    function watchWorker(worker: ServiceWorker | null): void {
      if (!worker) return;
      const changed = () => {
        if (!disposed && worker.state === 'installed') updateAvailable();
      };
      worker.addEventListener('statechange', changed);
      cleanups.push(() => worker.removeEventListener('statechange', changed));
    }
    function updateAvailable(): void {
      if (
        notified ||
        !registration?.waiting ||
        !navigator.serviceWorker.controller
      )
        return;
      notified = true;
      snackbarQueue.add({
        message: t('comfort.update'),
        actionLabel: t('comfort.reload'),
        onAction: () => {
          reload = true;
          registration?.waiting?.postMessage('SKIP_WAITING');
        },
      });
    }
    function controller(): void {
      if (reload) window.location.reload();
    }
    function beforeInstall(event: Event): void {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    }
    function installed(): void {
      setPrompt(null);
    }
    function check(): void {
      if (document.visibilityState === 'visible')
        void registration?.update().catch(() => {});
    }
    navigator.serviceWorker.addEventListener('controllerchange', controller);
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', installed);
    document.addEventListener('visibilitychange', check);
    const timer = window.setInterval(check, 60 * 60 * 1000);
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
        updateViaCache: 'none',
      })
      .then((reg) => {
        if (disposed) return;
        registration = reg;
        updateAvailable();
        const found = () => watchWorker(reg.installing);
        reg.addEventListener('updatefound', found);
        cleanups.push(() => reg.removeEventListener('updatefound', found));
        watchWorker(reg.installing);
      })
      .catch(() => {
        /* Unsupported/denied offline storage leaves the app usable online. */
      });
    return () => {
      disposed = true;
      cleanups.forEach((cleanup) => cleanup());
      window.clearInterval(timer);
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        controller,
      );
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', installed);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);
  return {
    canInstall: prompt !== null,
    install: () => {
      if (prompt)
        void prompt
          .prompt()
          .then(() => prompt.userChoice)
          .then(() => setPrompt(null))
          .catch(() => setPrompt(null));
    },
  };
}
