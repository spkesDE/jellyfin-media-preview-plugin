import { scheduleAdminNavigationRefresh } from '../admin/navigation';
import { scheduleScan } from './observer';
import { runtimeState } from '../runtime';

type HistoryMethodName = 'pushState' | 'replaceState';

export function bindRouteEvents(): void {
  if (runtimeState.routeEventsBound) {
    return;
  }

  const scheduleFullScan = () => {
    scheduleScan(document);
    scheduleAdminNavigationRefresh();
  };

  window.addEventListener('hashchange', scheduleFullScan, { passive: true });
  window.addEventListener('popstate', scheduleFullScan, { passive: true });
  document.addEventListener('viewshow', scheduleFullScan as EventListener, { passive: true });
  document.addEventListener('pageshow', scheduleFullScan as EventListener, { passive: true });
  runtimeState.routeEventsBound = true;

  if (!runtimeState.historyPatched && window.history && typeof window.history.pushState === 'function') {
    runtimeState.historyPatched = true;
    (['pushState', 'replaceState'] as HistoryMethodName[]).forEach((methodName) => {
      const original = window.history[methodName];
      window.history[methodName] = function patchedHistoryMethod(
        this: History,
        ...args: Parameters<History[HistoryMethodName]>
      ) {
        const result = original.apply(this, args as never);
        window.setTimeout(scheduleFullScan, 0);
        return result;
      } as History[HistoryMethodName];
    });
  }
}
