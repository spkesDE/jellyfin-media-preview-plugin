import { getGlobalApiClient } from '../core/apiClient';
import { debugLog } from '../core/logger';
import { deleteRequest } from '../core/request';

/**
 * Jellyfin keeps a progressive transcode running for several seconds after the browser drops
 * the connection, so hovering quickly across cards could leave one ffmpeg process per card.
 * Every transcode or remux URL a preview plays carries a play session id; when the preview
 * ends, or another transcode starts, that session is stopped explicitly. That keeps at most
 * one preview transcode per client running at any time.
 */

interface TranscodeSession {
  deviceId: string;
  playSessionId: string;
}

let fallbackDeviceId: string | null = null;
let activeSession: TranscodeSession | null = null;

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }

  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}

function getDeviceId(): string {
  const apiDeviceId = getGlobalApiClient()?.deviceId?.();
  if (apiDeviceId) {
    return apiDeviceId;
  }

  fallbackDeviceId ||= `media-preview-${createId()}`;
  return fallbackDeviceId;
}

/** True for Jellyfin stream URLs that make the server transcode or remux (not static files). */
export function isServerTranscodeUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url, window.location.origin);
    if (!/\/videos\/[^/]+\/(stream|main|master)(\.[a-z0-9]+)?$/i.test(parsed.pathname)) {
      return false;
    }

    const isStatic = Array.from(parsed.searchParams.entries()).some(
      ([key, value]) => key.toLowerCase() === 'static' && value.toLowerCase() === 'true'
    );
    return !isStatic;
  } catch {
    return false;
  }
}

function getQueryValue(url: URL, name: string): string | null {
  const lowerName = name.toLowerCase();
  for (const [key, value] of url.searchParams.entries()) {
    if (key.toLowerCase() === lowerName && value) {
      return value;
    }
  }
  return null;
}

/**
 * Makes sure a transcode URL names its device and play session (keeping ids the server already
 * put in, as PlaybackInfo does) and returns the session it belongs to.
 */
export function attachTranscodeSession(url: string): { url: string; session: TranscodeSession | null } {
  if (!isServerTranscodeUrl(url)) {
    return { url, session: null };
  }

  try {
    const parsed = new URL(url, window.location.origin);
    let deviceId = getQueryValue(parsed, 'DeviceId');
    let playSessionId = getQueryValue(parsed, 'PlaySessionId');
    if (!deviceId) {
      deviceId = getDeviceId();
      parsed.searchParams.set('DeviceId', deviceId);
    }
    if (!playSessionId) {
      playSessionId = createId();
      parsed.searchParams.set('PlaySessionId', playSessionId);
    }

    return { url: parsed.toString(), session: { deviceId, playSessionId } };
  } catch {
    return { url, session: null };
  }
}

function sameSession(left: TranscodeSession | null, right: TranscodeSession | null): boolean {
  return !!left && !!right && left.deviceId === right.deviceId && left.playSessionId === right.playSessionId;
}

export function stopTranscodeSession(session: TranscodeSession | null | undefined): void {
  if (!session) {
    return;
  }

  if (sameSession(activeSession, session)) {
    activeSession = null;
  }

  deleteRequest('Videos/ActiveEncodings', {
    DeviceId: session.deviceId,
    PlaySessionId: session.playSessionId
  }).catch((error: unknown) => {
    debugLog('Could not stop a preview transcode session.', { ...session, error });
  });
}

/** Registers a starting transcode and stops the previous one, so only one runs at a time. */
export function beginTranscodeSession(session: TranscodeSession | null): void {
  if (!session || sameSession(activeSession, session)) {
    return;
  }

  const previous = activeSession;
  activeSession = session;
  if (previous) {
    debugLog('Stopping the previous preview transcode before starting another one.', previous);
    stopTranscodeSession(previous);
  }
}

export function readTranscodeSession(element: HTMLElement): TranscodeSession | null {
  const deviceId = element.dataset.jmpTranscodeDeviceId;
  const playSessionId = element.dataset.jmpTranscodePlaySessionId;
  return deviceId && playSessionId ? { deviceId, playSessionId } : null;
}

export function writeTranscodeSession(element: HTMLElement, session: TranscodeSession | null): void {
  if (session) {
    element.dataset.jmpTranscodeDeviceId = session.deviceId;
    element.dataset.jmpTranscodePlaySessionId = session.playSessionId;
  } else {
    delete element.dataset.jmpTranscodeDeviceId;
    delete element.dataset.jmpTranscodePlaySessionId;
  }
}

/** Points a video element at a URL, ending the transcode its previous URL had started. */
export function setVideoSource(element: HTMLVideoElement, src: string): void {
  stopTranscodeSession(readTranscodeSession(element));
  const { url, session } = attachTranscodeSession(src);
  writeTranscodeSession(element, session);
  beginTranscodeSession(session);
  element.src = url;
}

/** Ends the transcode a video element is playing, if any. */
export function releaseVideoSource(element: HTMLVideoElement): void {
  stopTranscodeSession(readTranscodeSession(element));
  writeTranscodeSession(element, null);
}

export function getActiveTranscodeSession(): TranscodeSession | null {
  return activeSession;
}

export function clearTranscodeSessionState(): void {
  if (activeSession) {
    stopTranscodeSession(activeSession);
  }
  activeSession = null;
}
