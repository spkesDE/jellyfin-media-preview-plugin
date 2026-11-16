import {
  ADMIN_NAV_LINK_ATTR,
  CONFIGURATION_PAGE_HASH,
  CONFIGURATION_PAGE_NAME,
  PLUGIN_DISPLAY_NAME,
  PLUGIN_ICON
} from '../constants';
import { config } from '../config';
import { runtimeState } from '../runtime';
import { preloadUserPreferences } from '../userPreferences/api';
import { openUserPreferencesDialog } from '../userPreferences/dialog';

const USER_SETTINGS_LINK_ATTR = 'data-media-preview-user-settings-link';
const USER_SETTINGS_PAGE_LINK_ATTR = 'data-media-preview-user-settings-page-link';
const USER_PREFERENCES_SELECTOR = 'a[href="#/mypreferencesmenu"], a[href$="/#/mypreferencesmenu"]';

export function createPluginIcon(): HTMLSpanElement {
  const icon = document.createElement('span');
  icon.className = 'material-icons';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = PLUGIN_ICON;
  return icon;
}

export function isPluginConfigurationLink(element: Element | null): boolean {
  return !!(
    element &&
    element.tagName === 'A' &&
    typeof element.getAttribute === 'function' &&
    (element.getAttribute('href') || '').includes('#/configurationpage?name=')
  );
}

export function getAdminNavigationContainers(): HTMLElement[] {
  const containers = new Set<HTMLElement>();

  // Jellyfin 12 MUI side navigation
  const muiPluginsContainer = document.querySelector<HTMLElement>('ul[aria-labelledby="plugins-subheader"]');

  if (muiPluginsContainer) {
    containers.add(muiPluginsContainer);
  }

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

export function setAdminNavigationEntrySelected(entry: Element, isSelected: boolean, selectedClasses: string[]): void {
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
  const pluginsLinks = Array.from(
    document.querySelectorAll(
      'a[href="#/plugins"], a[href$="/#/plugins"], a[href="#/dashboard/plugins"], a[href$="/#/dashboard/plugins"]'
    )
  );

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
  entry.setAttribute('title', PLUGIN_DISPLAY_NAME);
  entry.removeAttribute('id');

  const icon = entry.querySelector('.MuiListItemIcon-root');
  if (icon && icon.textContent !== PLUGIN_ICON) {
    icon.replaceChildren(createPluginIcon());
  }

  const labelSelectors = [
    '.MuiListItemText-primary',
    '.MuiTypography-root.MuiListItemText-primary',
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
    label.textContent = PLUGIN_DISPLAY_NAME;
  } else {
    entry.textContent = PLUGIN_DISPLAY_NAME;
  }
}

function isUserSettingsEnabled(): boolean {
  return config.enabled && config.userAudioPreferencesEnabled;
}

function setEntryLabel(entry: Element, selectors: string[]): void {
  for (const selector of selectors) {
    const label = entry.querySelector(selector);
    if (label) {
      label.textContent = PLUGIN_DISPLAY_NAME;
      return;
    }
  }
  entry.textContent = PLUGIN_DISPLAY_NAME;
}

/** Adds a Media Preview entry below "Settings" in the Jellyfin user menu. */
export function ensureUserSettingsMenuEntry(): void {
  document.querySelectorAll<HTMLElement>('ul[role="menu"]').forEach((menu) => {
    const settingsEntry = menu.querySelector<HTMLAnchorElement>(USER_PREFERENCES_SELECTOR);
    if (!settingsEntry) {
      return;
    }

    const existing = menu.querySelector<HTMLElement>(`[${USER_SETTINGS_LINK_ATTR}="true"]`);
    if (!isUserSettingsEnabled()) {
      existing?.remove();
      return;
    }
    if (existing) {
      return;
    }

    const entry = settingsEntry.cloneNode(true) as HTMLAnchorElement;
    entry.setAttribute(USER_SETTINGS_LINK_ATTR, 'true');
    entry.href = '#';
    entry.removeAttribute('id');
    entry.classList.remove('Mui-focusVisible', 'Mui-selected');
    const icon = entry.querySelector('.MuiListItemIcon-root');
    if (icon) {
      icon.replaceChildren(createPluginIcon());
    }
    setEntryLabel(entry, ['.MuiListItemText-primary', '.MuiTypography-root']);
    entry.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
      window.setTimeout(() => void openUserPreferencesDialog(), 0);
    });
    entry.addEventListener('pointerenter', preloadUserPreferences, { once: true });
    entry.addEventListener('focus', preloadUserPreferences, { once: true });
    settingsEntry.after(entry);
  });
}

/** Adds a Media Preview row to the user "Settings" page (#/mypreferencesmenu). */
export function ensureUserSettingsPageEntry(): void {
  const page = document.querySelector<HTMLElement>('#myPreferencesMenuPage');
  if (!page) {
    return;
  }

  const existing = page.querySelector<HTMLElement>(`[${USER_SETTINGS_PAGE_LINK_ATTR}="true"]`);
  if (!isUserSettingsEnabled()) {
    existing?.remove();
    return;
  }
  if (existing) {
    return;
  }

  const section =
    page.querySelector<HTMLElement>('.readOnlyContent > .verticalSection') ??
    page.querySelector<HTMLElement>('.verticalSection');
  const template =
    section?.querySelector<HTMLAnchorElement>('.lnkPlaybackPreferences') ??
    section?.querySelector<HTMLAnchorElement>('.lnkHomePreferences') ??
    section?.querySelector<HTMLAnchorElement>('a.listItem-border');
  if (!section || !template) {
    return;
  }

  const entry = template.cloneNode(true) as HTMLAnchorElement;
  entry.setAttribute(USER_SETTINGS_PAGE_LINK_ATTR, 'true');
  entry.setAttribute('href', '#');
  entry.removeAttribute('id');
  entry.style.display = '';
  Array.from(entry.classList)
    .filter((className) => className.startsWith('lnk') || className === 'hide')
    .forEach((className) => entry.classList.remove(className));
  const icon = entry.querySelector<HTMLElement>('.listItemIcon');
  if (icon) {
    icon.className = 'material-icons listItemIcon listItemIcon-transparent';
    icon.textContent = PLUGIN_ICON;
  }
  setEntryLabel(entry, ['.listItemBodyText']);
  entry.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    void openUserPreferencesDialog();
  });
  entry.addEventListener('pointerenter', preloadUserPreferences, { once: true });
  entry.addEventListener('focus', preloadUserPreferences, { once: true });
  section.appendChild(entry);
}

export function removeUserSettingsEntries(): void {
  document
    .querySelectorAll(`[${USER_SETTINGS_LINK_ATTR}="true"], [${USER_SETTINGS_PAGE_LINK_ATTR}="true"]`)
    .forEach((entry) => entry.remove());
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

    const template =
      Array.from(container.children).find((child) => {
        return isPluginConfigurationLink(child);
      }) || container.querySelector('a[href="#/dashboard/plugins"], a[href="#/plugins"]');
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
    ensureUserSettingsMenuEntry();
    ensureUserSettingsPageEntry();
  });
}

export function cancelAdminNavigationRefresh(): void {
  if (runtimeState.adminNavRefreshFrame !== null) {
    window.cancelAnimationFrame(runtimeState.adminNavRefreshFrame);
    runtimeState.adminNavRefreshFrame = null;
  }

  runtimeState.adminNavRefreshScheduled = false;
}
