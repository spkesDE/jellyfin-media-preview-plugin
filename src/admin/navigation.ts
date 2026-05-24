import { ADMIN_NAV_LINK_ATTR, CONFIGURATION_PAGE_HASH, CONFIGURATION_PAGE_NAME } from '../constants';
import { runtimeState } from '../runtime';

export function isPluginConfigurationLink(element: Element | null): boolean {
  return !!(
    element &&
    element.tagName === 'A' &&
    typeof element.getAttribute === 'function' &&
    (element.getAttribute('href') || '').includes('#/configurationpage?name=')
  );
}

export function getAdminNavigationContainers(): HTMLElement[] {
  const pluginLinks = Array.from(document.querySelectorAll('a[href*="#/configurationpage?name="]'))
    .filter((link) => {
      return isPluginConfigurationLink(link) && (link.getAttribute('href') || '') !== CONFIGURATION_PAGE_HASH;
    });
  const containers = new Set<HTMLElement>();

  pluginLinks.forEach((link) => {
    const parent = link.parentElement;
    if (!parent) {
      return;
    }

    const siblingPluginLinks = Array.from(parent.children).filter((child) => {
      return isPluginConfigurationLink(child);
    });

    if (siblingPluginLinks.length >= 2) {
      containers.add(parent);
    }
  });

  return Array.from(containers);
}

export function isMediaPreviewConfigurationRoute(): boolean {
  const hash = window.location.hash || '';
  if (!hash) {
    return false;
  }

  try {
    const normalizedHash = hash.charAt(0) === '#' ? hash.slice(1) : hash;
    const routeUrl = new URL(normalizedHash, window.location.origin);
    return routeUrl.pathname === '/configurationpage' && routeUrl.searchParams.get('name') === CONFIGURATION_PAGE_NAME;
  } catch {
    return hash.includes(CONFIGURATION_PAGE_HASH);
  }
}

export function isPluginsDashboardRoute(): boolean {
  const hash = window.location.hash || '';
  return hash === '#/dashboard/plugins' || hash.indexOf('#/dashboard/plugins?') === 0;
}

export function getSelectedNavClasses(container: HTMLElement, currentEntry: Element | null): string[] {
  const selectedCandidate = Array.from(container.children).find((child) => {
    if (!(child instanceof HTMLElement) || child === currentEntry) {
      return false;
    }

    return child.classList.contains('Mui-selected');
  });

  if (!selectedCandidate) {
    return [];
  }

  return Array.from(selectedCandidate.classList).filter((className) => className === 'Mui-selected');
}

export function setAdminNavigationEntrySelected(
  entry: Element,
  isSelected: boolean,
  selectedClasses: string[]
): void {
  if (!(entry instanceof HTMLElement)) {
    return;
  }

  if (isSelected) {
    entry.setAttribute('aria-current', 'page');
    ['Mui-selected'].concat(selectedClasses || []).forEach((className) => {
      entry.classList.add(className);
    });
  } else {
    entry.removeAttribute('aria-current');
    ['Mui-selected'].forEach((className) => {
      entry.classList.remove(className);
    });
  }
}

export function syncPluginsRootSelection(shouldSelectCustomEntry: boolean): void {
  const pluginsLinks = Array.from(document.querySelectorAll(
    'a[href="#/plugins"], a[href$="/#/plugins"], a[href="#/dashboard/plugins"], a[href$="/#/dashboard/plugins"]'
  ));

  pluginsLinks.forEach((link) => {
    if (!(link instanceof HTMLElement) || link.getAttribute(ADMIN_NAV_LINK_ATTR) === 'true') {
      return;
    }

    if (shouldSelectCustomEntry) {
      link.removeAttribute('aria-current');
      ['Mui-selected'].forEach((className) => {
        link.classList.remove(className);
      });
    } else if (isPluginsDashboardRoute()) {
      link.setAttribute('aria-current', 'page');
      link.classList.add('Mui-selected');
    }
  });
}

export function updateAdminNavigationEntry(entry: Element): void {
  entry.setAttribute(ADMIN_NAV_LINK_ATTR, 'true');
  entry.setAttribute('href', CONFIGURATION_PAGE_HASH);
  entry.setAttribute('title', 'Media Preview');
  entry.removeAttribute('id');

  const labelSelectors = [
    '.navMenuOptionText',
    '.listItemBodyText',
    '.drawerLinkText',
    '.sectionTitleText',
    '.button-text'
  ];
  let label: Element | null = null;

  for (let i = 0; i < labelSelectors.length; i += 1) {
    label = entry.querySelector(labelSelectors[i]);
    if (label) {
      break;
    }
  }

  if (!label) {
    const spans = entry.querySelectorAll('span');
    label = spans.length ? spans[spans.length - 1] : null;
  }

  if (label) {
    label.textContent = 'Media Preview';
  } else {
    entry.textContent = 'Media Preview';
  }
}

export function ensureAdminNavigationLink(): void {
  const shouldSelectEntry = isMediaPreviewConfigurationRoute();
  const containers = getAdminNavigationContainers();
  if (!containers.length) {
    return;
  }

  containers.forEach((container) => {
    const selectedClasses = getSelectedNavClasses(container, null);
    syncPluginsRootSelection(shouldSelectEntry);
    const existing = Array.from(container.children).find((child) => {
      return isPluginConfigurationLink(child) && (child.getAttribute('href') || '') === CONFIGURATION_PAGE_HASH;
    });

    if (existing) {
      updateAdminNavigationEntry(existing);
      setAdminNavigationEntrySelected(existing, shouldSelectEntry, selectedClasses);
      return;
    }

    const template = Array.from(container.children).find((child) => {
      return isPluginConfigurationLink(child);
    });
    if (!template) {
      return;
    }

    const entry = template.cloneNode(true) as Element;
    updateAdminNavigationEntry(entry);
    setAdminNavigationEntrySelected(entry, shouldSelectEntry, selectedClasses);
    container.appendChild(entry);
  });
}

export function scheduleAdminNavigationRefresh(): void {
  if (runtimeState.adminNavRefreshFrame !== null) {
    return;
  }

  if (runtimeState.adminNavRefreshScheduled) {
    return;
  }

  runtimeState.adminNavRefreshScheduled = true;
  runtimeState.adminNavRefreshFrame = window.requestAnimationFrame(() => {
    runtimeState.adminNavRefreshFrame = null;
    runtimeState.adminNavRefreshScheduled = false;
    ensureAdminNavigationLink();
  });
}

export function cancelAdminNavigationRefresh(): void {
  if (runtimeState.adminNavRefreshFrame !== null) {
    window.cancelAnimationFrame(runtimeState.adminNavRefreshFrame);
    runtimeState.adminNavRefreshFrame = null;
  }

  runtimeState.adminNavRefreshScheduled = false;
}
