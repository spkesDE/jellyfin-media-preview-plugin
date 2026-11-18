import {
  PLUGIN_DISPLAY_NAME,
  PLUGIN_ICON,
  USER_PREFERENCES_CHANGED_EVENT,
  USER_PREFERENCES_STYLE_ID
} from '../constants';
// `?inline` gives the CSS as text in both the runtime and the admin page bundle.
import { t } from '../core/i18n';
import userPreferencesStyles from '../styles/mediaPreviewUserPreferences.css?inline';
import {
  flushPendingAudioSave,
  isCurrentUser,
  loadUserPreferences,
  resetUserPreferences,
  saveUserPreferences,
  toExplicitPreferences,
  type UserPreferencesResponse
} from './api';

const BACKDROP_CLASS = 'jmp-prefs-backdrop';

export interface UserPreferencesProfile {
  userId: string;
  userName: string;
}

/**
 * Tells the running previews about new settings. Sent only when the signed-in user's own
 * settings changed, so an administrator editing someone else leaves their own page alone.
 */
function notifyChanged(profile: UserPreferencesProfile | undefined, response: UserPreferencesResponse): void {
  if (isCurrentUser(profile?.userId)) {
    document.dispatchEvent(new CustomEvent(USER_PREFERENCES_CHANGED_EVENT, { detail: response }));
  }
}

function ensureStyles(): void {
  if (document.getElementById(USER_PREFERENCES_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = USER_PREFERENCES_STYLE_ID;
  style.textContent = userPreferencesStyles;
  document.head.appendChild(style);
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createIcon(name: string): HTMLSpanElement {
  const icon = createElement('span', 'material-icons', name);
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

/** An on/off row with the label on the left and a switch on the right. */
function createSwitch(label: string, checked: boolean): { root: HTMLLabelElement; input: HTMLInputElement } {
  const root = createElement('label', 'jmp-prefs-switchRow');
  const input = createElement('input', 'jmp-prefs-switchInput');
  input.type = 'checkbox';
  input.setAttribute('role', 'switch');
  input.checked = checked;
  const control = createElement('span', 'jmp-prefs-switch');
  const track = createElement('span', 'jmp-prefs-switchTrack');
  track.setAttribute('aria-hidden', 'true');
  control.append(input, track);
  root.append(createElement('span', 'jmp-prefs-switchLabel', label), control);
  return { root, input };
}

/** A titled group of settings. */
function createSection(title: string): { root: HTMLFieldSetElement; body: HTMLDivElement } {
  const root = createElement('fieldset', 'jmp-prefs-section');
  const legend = createElement('legend', 'jmp-prefs-sectionTitle', title);
  const body = createElement('div', 'jmp-prefs-sectionBody');
  root.append(legend, body);
  return { root, body };
}

function createSelect(
  label: string,
  options: Array<{ value: string; label: string }>,
  value: string
): { root: HTMLDivElement; select: HTMLSelectElement } {
  const root = createElement('div', 'selectContainer jmp-prefs-field');
  const id = `jmp-prefs-select-${Math.random().toString(36).slice(2)}`;
  const labelElement = createElement('label', 'selectLabel', label);
  labelElement.htmlFor = id;
  const select = createElement('select', 'emby-select-withcolor emby-select');
  select.id = id;
  options.forEach((option) => {
    const element = createElement('option', undefined, option.label);
    element.value = option.value;
    select.appendChild(element);
  });
  select.value = value;
  root.append(labelElement, select);
  return { root, select };
}

function createNumberInput(
  label: string,
  value: number,
  min: number,
  max: number,
  step: number
): { root: HTMLDivElement; input: HTMLInputElement } {
  const root = createElement('div', 'inputContainer jmp-prefs-field');
  const id = `jmp-prefs-number-${Math.random().toString(36).slice(2)}`;
  const labelElement = createElement('label', 'inputLabel inputLabelUnfocused', label);
  labelElement.htmlFor = id;
  const input = createElement('input', 'emby-input');
  input.id = id;
  input.type = 'number';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  root.append(labelElement, input);
  return { root, input };
}

function getSourceOptions(current: string): Array<{ value: string; label: string }> {
  const options = [
    { value: 'inherit', label: t('sourceDefault') },
    { value: 'trickplay', label: t('sourceTrickplay') },
    { value: 'prefer-trailer', label: t('sourceTrailer') },
    { value: 'prefer-direct-play', label: t('sourceDirectPlay') }
  ];
  // Keep a value set elsewhere (for example an older or admin-chosen source) selectable.
  if (!options.some((option) => option.value === current)) {
    options.push({ value: current, label: current });
  }
  return options;
}

function createButton(label: string, className: string, type: 'button' | 'submit' = 'button'): HTMLButtonElement {
  const button = createElement('button', `raised emby-button ${className}`, label);
  button.type = type;
  return button;
}

function renderForm(
  dialog: HTMLElement,
  response: UserPreferencesResponse,
  profile: UserPreferencesProfile | undefined,
  close: () => void
): void {
  const form = createElement('form', 'jmp-prefs-form');
  form.style.display = 'contents';
  const content = createElement('div', 'jmp-prefs-content');
  const actions = createElement('div', 'jmp-prefs-actions');
  const status = createElement('span', 'jmp-prefs-status');
  status.setAttribute('aria-live', 'polite');
  actions.appendChild(status);

  const previewSection = createSection(t('sectionPreview'));
  const audioSection = createSection(t('sectionAudio'));
  content.append(previewSection.root, audioSection.root);

  const previewToggle = createSwitch(t('showPreviews'), response.effective.previewEnabled !== false);
  previewSection.body.appendChild(previewToggle.root);

  const currentSource = response.effective.previewSource || 'inherit';
  const sourceSelect = createSelect(t('previewSource'), getSourceOptions(currentSource), currentSource);
  previewSection.body.appendChild(sourceSelect.root);

  const delayInput = createNumberInput(
    t('hoverDelay'),
    Number(response.effective.hoverDelayMs ?? response.defaults.hoverDelayMs ?? 300),
    0,
    5000,
    50
  );
  previewSection.body.appendChild(delayInput.root);

  const syncPreviewState = () => {
    const disabled = !previewToggle.input.checked;
    sourceSelect.select.disabled = disabled;
    delayInput.input.disabled = disabled;
    sourceSelect.root.classList.toggle('is-disabled', disabled);
    delayInput.root.classList.toggle('is-disabled', disabled);
  };
  previewToggle.input.addEventListener('change', syncPreviewState);
  syncPreviewState();

  const audioToggle = createSwitch(t('playPreviewAudio'), response.effective.trailerAudioEnabled);
  audioSection.body.appendChild(audioToggle.root);

  const volumeRow = createElement('label', 'jmp-prefs-volume');
  const volumeInput = createElement('input');
  volumeInput.type = 'range';
  volumeInput.min = '0';
  volumeInput.max = '100';
  volumeInput.step = '1';
  volumeInput.value = String(response.effective.trailerVolumePercent);
  volumeInput.setAttribute('aria-label', t('previewVolume'));
  const volumeOutput = createElement('output', undefined, `${volumeInput.value}%`);
  volumeRow.append(createIcon('volume_up'), volumeInput, volumeOutput);
  audioSection.body.appendChild(volumeRow);

  const syncVolumeState = () => {
    volumeOutput.textContent = `${volumeInput.value}%`;
    volumeInput.disabled = !audioToggle.input.checked;
    volumeRow.classList.toggle('is-disabled', volumeInput.disabled);
  };
  audioToggle.input.addEventListener('change', syncVolumeState);
  volumeInput.addEventListener('input', syncVolumeState);
  syncVolumeState();

  const rememberToggle = createSwitch(t('saveAudioChanges'), response.effective.rememberAudioChanges !== false);
  audioSection.body.appendChild(rememberToggle.root);

  const resetButton = createButton(t('reset'), 'jmp-prefs-reset');
  const saveButton = createButton(t('save'), 'button-submit jmp-prefs-save', 'submit');
  actions.append(resetButton, saveButton);

  const run = async (operation: () => Promise<UserPreferencesResponse>): Promise<void> => {
    status.classList.remove('is-error');
    status.textContent = '';
    resetButton.disabled = true;
    saveButton.disabled = true;
    try {
      notifyChanged(profile, await operation());
      close();
    } catch {
      status.classList.add('is-error');
      status.textContent = t('couldNotSave');
      resetButton.disabled = false;
      saveButton.disabled = false;
    }
  };

  resetButton.addEventListener('click', () => void run(() => resetUserPreferences(profile?.userId)));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const preferences = toExplicitPreferences(response, {
      trailerAudioEnabled: audioToggle.input.checked,
      trailerVolumePercent: Number(volumeInput.value),
      rememberAudioChanges: rememberToggle.input.checked,
      previewEnabled: previewToggle.input.checked,
      previewSource: sourceSelect.select.value,
      hoverDelayMs: Math.round(Math.max(0, Math.min(5000, Number(delayInput.input.value) || 0)))
    });
    void run(() => saveUserPreferences(preferences, profile?.userId));
  });

  form.append(content, actions);
  dialog.appendChild(form);
  previewToggle.input.focus();
}

/**
 * Opens the Media Preview settings. Without a profile it edits the signed-in user;
 * administrators pass a profile to edit another user with the same dialog.
 */
export async function openUserPreferencesDialog(profile?: UserPreferencesProfile): Promise<void> {
  if (document.querySelector(`.${BACKDROP_CLASS}`)) {
    return;
  }

  ensureStyles();
  const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const backdrop = createElement('div', BACKDROP_CLASS);
  const dialog = createElement('section', 'jmp-prefs-dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'jmp-prefs-title');

  const header = createElement('header', 'jmp-prefs-header');
  const title = createElement('div', 'jmp-prefs-title');
  const heading = createElement(
    'h2',
    undefined,
    profile ? `${PLUGIN_DISPLAY_NAME} · ${profile.userName}` : PLUGIN_DISPLAY_NAME
  );
  heading.id = 'jmp-prefs-title';
  title.append(createIcon(PLUGIN_ICON), heading);
  const closeButton = createElement('button', 'jmp-prefs-close');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', t('close'));
  closeButton.appendChild(createIcon('close'));
  header.append(title, closeButton);

  const loading = createElement('div', 'jmp-prefs-loading');
  loading.setAttribute('role', 'status');
  loading.setAttribute('aria-label', t('loading'));
  loading.appendChild(createElement('span', 'jmp-prefs-spinner'));
  dialog.append(header, loading);
  backdrop.appendChild(dialog);

  const close = () => {
    backdrop.remove();
    previouslyFocused?.focus?.();
  };
  closeButton.addEventListener('click', close);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });
  backdrop.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  });
  // Keep Jellyfin's global keyboard shortcuts from reacting to typing in the dialog's fields.
  (['keydown', 'keypress', 'keyup'] as const).forEach((type) => {
    dialog.addEventListener(type, (event) => {
      if (event.key !== 'Escape' && event.target instanceof HTMLInputElement) {
        event.stopPropagation();
      }
    });
  });

  document.body.appendChild(backdrop);
  closeButton.focus();

  try {
    if (isCurrentUser(profile?.userId)) await flushPendingAudioSave();
    const response = await loadUserPreferences(profile?.userId);
    if (!backdrop.isConnected) return;
    if (!response?.enabled || !response.effective || !response.defaults) {
      throw new Error('User settings are unavailable.');
    }
    loading.remove();
    renderForm(dialog, response, profile, close);
  } catch {
    if (!backdrop.isConnected) return;
    loading.replaceChildren(createElement('span', 'jmp-prefs-status is-error', t('couldNotLoad')));
  }
}
