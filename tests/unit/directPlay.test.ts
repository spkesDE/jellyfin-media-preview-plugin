import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { config } from '../../src/config';
import { createDirectPlayCandidate, resolveDirectPlayStartSeconds } from '../../src/preview/directPlay';

const originalSettings = {
  directPlayStartPercent: config.directPlayStartPercent,
  directPlayPlaybackRate: config.directPlayPlaybackRate,
  directPlayPreviewDurationSeconds: config.directPlayPreviewDurationSeconds,
  directPlayTranscodeFallbackEnabled: config.directPlayTranscodeFallbackEnabled,
  directPlayTranscodeMaxHeight: config.directPlayTranscodeMaxHeight,
  directPlayTranscodeVideoBitrateKbps: config.directPlayTranscodeVideoBitrateKbps
};

describe('Direct Play preview policy', () => {
  beforeEach(() => {
    Object.assign(config, originalSettings);
    window.ApiClient = {
      getUrl(path, query) {
        const url = new URL(`https://jellyfin.example/${path}`);
        Object.entries(query || {}).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            url.searchParams.set(key, String(value));
          }
        });
        return url.toString();
      }
    };
  });

  afterEach(() => {
    Object.assign(config, originalSettings);
    delete window.ApiClient;
  });

  it('starts at the configured percentage while preserving the preview window', () => {
    expect(resolveDirectPlayStartSeconds(1200, 20, 15)).toBe(240);
    expect(resolveDirectPlayStartSeconds(10, 90, 15)).toBe(0);
    expect(resolveDirectPlayStartSeconds(100, 90, 15)).toBe(85);
  });

  it('applies playback speed and duration to a browser-compatible source', () => {
    config.directPlayStartPercent = 20;
    config.directPlayPlaybackRate = 1.5;
    config.directPlayPreviewDurationSeconds = 15;

    const candidate = createDirectPlayCandidate(
      { Id: 'movie', Name: 'Movie', RunTimeTicks: 12_000_000_000 },
      { Id: 'source', Container: 'mp4' }
    );

    expect(candidate?.src).toContain('/Videos/movie/stream.mp4');
    expect(candidate?.startSeconds).toBe(240);
    expect(candidate?.playbackRate).toBe(1.5);
    expect(candidate?.previewDurationSeconds).toBe(15);
  });

  it('can disable the transcode fallback completely', () => {
    config.directPlayTranscodeFallbackEnabled = false;

    const directCandidate = createDirectPlayCandidate(
      { Id: 'movie', RunTimeTicks: 6_000_000_000 },
      { Id: 'source', Container: 'mp4' }
    );

    expect(directCandidate?.fallbackSrc).toBeNull();
    expect(
      createDirectPlayCandidate({ Id: 'movie', RunTimeTicks: 6_000_000_000 }, { Id: 'source', Container: 'mkv' })
    ).toBeNull();
  });

  it('caps the optional transcode fallback', () => {
    config.directPlayTranscodeFallbackEnabled = true;
    config.directPlayTranscodeMaxHeight = 480;
    config.directPlayTranscodeVideoBitrateKbps = 1500;

    const candidate = createDirectPlayCandidate(
      { Id: 'movie', RunTimeTicks: 6_000_000_000 },
      { Id: 'source', Container: 'mkv' }
    );
    const url = new URL(candidate?.src || '');

    expect(url.searchParams.get('MaxHeight')).toBe('480');
    expect(url.searchParams.get('VideoBitRate')).toBe('1500000');
    expect(url.searchParams.get('MaxStreamingBitrate')).toBe('1628000');
  });
});
