import { scheduleAdminNavigationRefresh } from '../admin/navigation';
import { bindCards } from '../interaction/hover';
import { runtimeState } from '../runtime';

export function scheduleScan(rootNode?: ParentNode | Node | null): void {
  if (runtimeState.scanScheduled) {
    return;
  }

  runtimeState.scanScheduled = true;
  window.requestAnimationFrame(() => {
    runtimeState.scanScheduled = false;
    bindCards(rootNode || document);
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
