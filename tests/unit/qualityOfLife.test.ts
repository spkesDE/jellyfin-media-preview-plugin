import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '../../src/config';
import { t } from '../../src/core/i18n';
import { isAutoHoverMode, isDataSaverActive } from '../../src/core/userEnvironment';
import { getRemuxUrlFromMediaSource } from '../../src/preview/directPlay';
import { getActivePreviewSourceChain } from '../../src/preview/source';
import {
  attachTranscodeSession,
  beginTranscodeSession,
  clearTranscodeSessionState,
  getActiveTranscodeSession,
  isServerTranscodeUrl
} from '../../src/preview/transcodeSessions';

function installApiClient(onAjax?: (request: { type: string; url: string }) => void) {
  window.ApiClient = {
    deviceId: () => 'device-a',
    accessToken: () => 'token',
    getUrl(path, query) {
      const url = new URL(`https://jellyfin.example/${path}`);
      Object.entries(query || {}).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
      return url.toString();
    },
    ajax: async (request) => {
      onAjax?.(request);
      return {};
    }
  };
}

function setConnection(connection: { saveData?: boolean; effectiveType?: string } | undefined) {
  Object.defineProperty(navigator, 'connection', { value: connection, configurable: true });
}

function setReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined
  })) as unknown as typeof window.matchMedia;
}

const originalHoverMode = config.hoverMode;
const originalPreviewSource = config.previewSource;
const originalMatchMedia = window.matchMedia;

afterEach(() => {
  delete window.ApiClient;
  setConnection(undefined);
  config.hoverMode = originalHoverMode;
  config.previewSource = originalPreviewSource;
  window.matchMedia = originalMatchMedia;
  document.documentElement.removeAttribute('lang');
  clearTranscodeSessionState();
});

describe('Direct Play remux selection', () => {
  beforeEach(() => installApiClient());

  it('uses a TranscodingUrl that only changes the container or audio', () => {
    const url = getRemuxUrlFromMediaSource(
      {
        TranscodingUrl:
          '/videos/movie/stream.mp4?MediaSourceId=src&VideoCodec=h264&AudioCodec=aac&PlaySessionId=play&DeviceId=dev&SubtitleStreamIndex=2&SubtitleMethod=Encode&TranscodeReasons=ContainerNotSupported,AudioCodecNotSupported,SubtitleCodecNotSupported&ApiKey=leak',
        TranscodingSubProtocol: 'http'
      },
      120
    );
    const parsed = new URL(url || '');

    expect(parsed.pathname).toBe('/videos/movie/stream.mp4');
    expect(parsed.searchParams.get('StartTimeTicks')).toBe('1200000000');
    expect(parsed.searchParams.get('PlaySessionId')).toBe('play');
    expect(parsed.searchParams.get('ApiKey')).toBe('token');
    // A burned-in subtitle would force a video transcode.
    expect(parsed.searchParams.has('SubtitleStreamIndex')).toBe(false);
    expect(parsed.searchParams.has('SubtitleMethod')).toBe(false);
  });

  it('rejects video transcodes and HLS so the capped preview transcode is used', () => {
    expect(
      getRemuxUrlFromMediaSource(
        { TranscodingUrl: '/videos/movie/stream.mp4?TranscodeReasons=ContainerNotSupported,VideoCodecNotSupported' },
        0
      )
    ).toBeNull();
    expect(
      getRemuxUrlFromMediaSource(
        {
          TranscodingUrl: '/videos/movie/master.m3u8?TranscodeReasons=ContainerNotSupported',
          TranscodingSubProtocol: 'hls'
        },
        0
      )
    ).toBeNull();
    expect(getRemuxUrlFromMediaSource({ TranscodingUrl: '/videos/movie/stream.mp4' }, 0)).toBeNull();
  });
});

describe('preview transcode sessions', () => {
  it('only treats non-static Jellyfin streams as transcodes', () => {
    expect(isServerTranscodeUrl('https://jellyfin.example/Videos/a/stream.mp4?VideoCodec=h264')).toBe(true);
    expect(isServerTranscodeUrl('https://jellyfin.example/Videos/a/stream.mp4?Static=true')).toBe(false);
    expect(isServerTranscodeUrl('https://cdn.example/trailer.mp4')).toBe(false);
  });

  it('adds device and play session ids and keeps ids the server already set', () => {
    installApiClient();
    const added = attachTranscodeSession('https://jellyfin.example/Videos/a/stream.mp4?VideoCodec=h264');
    const addedUrl = new URL(added.url);
    expect(addedUrl.searchParams.get('DeviceId')).toBe('device-a');
    expect(addedUrl.searchParams.get('PlaySessionId')).toBe(added.session?.playSessionId);

    const kept = attachTranscodeSession(
      'https://jellyfin.example/Videos/a/stream.mp4?DeviceId=server-device&PlaySessionId=server-session'
    );
    expect(kept.session).toEqual({ deviceId: 'server-device', playSessionId: 'server-session' });
  });

  it('stops the previous transcode when another one starts', async () => {
    const requests: { type: string; url: string }[] = [];
    installApiClient((request) => requests.push(request));

    beginTranscodeSession({ deviceId: 'device-a', playSessionId: 'first' });
    beginTranscodeSession({ deviceId: 'device-a', playSessionId: 'second' });
    await Promise.resolve();

    expect(getActiveTranscodeSession()?.playSessionId).toBe('second');
    expect(requests).toHaveLength(1);
    expect(requests[0].type).toBe('DELETE');
    const stopUrl = new URL(requests[0].url);
    expect(stopUrl.pathname).toBe('/Videos/ActiveEncodings');
    expect(stopUrl.searchParams.get('PlaySessionId')).toBe('first');
    expect(stopUrl.searchParams.has('ApiKey')).toBe(false);
  });
});

describe('Data Saver', () => {
  it('detects Data Saver and very slow connections', () => {
    setConnection({ saveData: true });
    expect(isDataSaverActive()).toBe(true);
    setConnection({ effectiveType: '2g' });
    expect(isDataSaverActive()).toBe(true);
    setConnection({ effectiveType: '4g' });
    expect(isDataSaverActive()).toBe(false);
  });

  it('replaces video sources with Trickplay', () => {
    setConnection({ saveData: true });
    expect(getActivePreviewSourceChain('trailer')).toEqual(['trickplay']);
    expect(getActivePreviewSourceChain('prefer-direct-play')).toEqual(['trickplay']);
    setConnection(undefined);
    expect(getActivePreviewSourceChain('trailer')).toEqual(['trailer']);
  });
});

describe('reduced motion', () => {
  it('turns auto mode into pointer scrubbing', () => {
    config.hoverMode = 'auto';
    setReducedMotion(false);
    expect(isAutoHoverMode()).toBe(true);
    setReducedMotion(true);
    expect(isAutoHoverMode()).toBe(false);
  });
});

describe('translations', () => {
  it('follows the Jellyfin Web language and falls back to English', () => {
    document.documentElement.setAttribute('lang', 'de-DE');
    expect(t('expandTrailer')).toBe('Trailer vergrößern');
    expect(t('previewVolumeValue', { value: 40 })).toBe('Vorschau-Lautstärke: 40 %');

    document.documentElement.setAttribute('lang', 'xx');
    Object.defineProperty(navigator, 'languages', { value: ['xx'], configurable: true });
    Object.defineProperty(navigator, 'language', { value: 'xx', configurable: true });
    expect(t('expandTrailer')).toBe('Expand trailer');
  });
});
