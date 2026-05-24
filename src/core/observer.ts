import { scheduleAdminNavigationRefresh } from '../admin/navigation';
import { bindCards } from '../interaction/hover';
import { runtimeState } from '../runtime';

export function scheduleScan(rootNode?: ParentNode | Node | null): void {
  runtimeState.pendingScanRoots.add(rootNode || document);

  if (runtimeState.scanFrame !== null || runtimeState.scanScheduled) {
    return;
  }

  runtimeState.scanScheduled = true;
  runtimeState.scanFrame = window.requestAnimationFrame(() => {
    runtimeState.scanFrame = null;
    runtimeState.scanScheduled = false;
    const pendingRoots = Array.from(runtimeState.pendingScanRoots);
    runtimeState.pendingScanRoots.clear();

    if (!pendingRoots.length || pendingRoots.includes(document)) {
      bindCards(document);
      return;
    }

    pendingRoots.forEach((pendingRoot) => {
      bindCards(pendingRoot);
    });
  });
}

export function observePageChanges(): void {
  if (runtimeState.observer || !document.body) {
    return;
  }

  runtimeState.observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          scheduleScan(node);
          scheduleAdminNavigationRefresh();
        }
      });
    });
  });

  runtimeState.observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

export function cancelScheduledScan(): void {
  if (runtimeState.scanFrame !== null) {
    window.cancelAnimationFrame(runtimeState.scanFrame);
    runtimeState.scanFrame = null;
  }

  runtimeState.scanScheduled = false;
  runtimeState.pendingScanRoots.clear();
}
