export function hasWaitingUpdate(
  registration: Pick<ServiceWorkerRegistration, 'waiting'>,
  hasController: boolean,
): boolean {
  return hasController && Boolean(registration.waiting);
}

const UPDATE_BANNER_ID = 'pwa-update-banner';

export function registerAppUpdates(): void {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) return;
    refreshing = false;
    window.location.reload();
  });

  const checkForUpdate = async (): Promise<void> => {
    const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
    const showUpdate = (): void => {
      if (!hasWaitingUpdate(registration, Boolean(navigator.serviceWorker.controller))) return;
      if (document.getElementById(UPDATE_BANNER_ID)) return;
      const banner = document.createElement('aside');
      banner.id = UPDATE_BANNER_ID;
      banner.className = 'pwa-update-banner';
      banner.innerHTML = '<span>Update verfügbar</span><button type="button">JETZT AKTUALISIEREN</button>';
      banner.querySelector('button')?.addEventListener('click', () => {
        const button = banner.querySelector('button');
        if (button) {
          button.disabled = true;
          button.textContent = 'AKTUALISIERE…';
        }
        refreshing = true;
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      });
      document.body.append(banner);
    };

    registration.addEventListener('updatefound', () => {
      registration.installing?.addEventListener('statechange', () => {
        if (registration.installing?.state === 'installed') showUpdate();
      });
    });
    showUpdate();
  };

  const requestUpdateCheck = (): void => {
    void checkForUpdate().catch(() => undefined);
  };
  requestUpdateCheck();
  window.addEventListener('online', requestUpdateCheck);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') requestUpdateCheck();
  });
}
