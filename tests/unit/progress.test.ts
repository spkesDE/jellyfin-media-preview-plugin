import { afterEach, describe, expect, it } from 'vitest';
import { config } from '../../src/config';
import { resolvePlaybackProgress } from '../../src/preview/progress';
import { getPreviewSourceForItem } from '../../src/preview/source';

const originalInProgressPreviewSource = config.inProgressPreviewSource;

afterEach(() => {
  config.inProgressPreviewSource = originalInProgressPreviewSource;
  delete window.ApiClient;
});

describe('in-progress item detection', () => {
  it('matches an unfinished item with a saved playback position', () => {
    expect(
      resolvePlaybackProgress({
        RunTimeTicks: 10_000,
        UserData: { PlaybackPositionTicks: 4_000, Played: false }
      })
    ).toEqual({ isInProgress: true, positionTicks: 4_000 });
  });

  it('does not match an unwatched Next Up item', () => {
    expect(
      resolvePlaybackProgress({
        RunTimeTicks: 10_000,
        UserData: { PlaybackPositionTicks: 0, Played: false }
      })
    ).toEqual({ isInProgress: false, positionTicks: 0 });
  });

  it('does not match played items or a position at the end', () => {
    expect(
      resolvePlaybackProgress({
        RunTimeTicks: 10_000,
        UserData: { PlaybackPositionTicks: 4_000, Played: true }
      }).isInProgress
    ).toBe(false);
    expect(
      resolvePlaybackProgress({
        RunTimeTicks: 10_000,
        UserData: { PlaybackPositionTicks: 10_000, Played: false }
      }).isInProgress
    ).toBe(false);
  });

  it('uses the user playback position for the highest-priority rule', async () => {
    config.inProgressPreviewSource = 'direct-play';
    window.ApiClient = {
      _serverInfo: { Id: 'server', UserId: 'user' },
      getUrl: (path, query) => {
        const url = new URL(`https://jellyfin.example/${path}`);
        Object.entries(query || {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));
        return url.toString();
      },
      ajax: async () => ({
        Id: 'resume-item',
        RunTimeTicks: 10_000,
        UserData: { PlaybackPositionTicks: 4_000, Played: false }
      })
    };

    await expect(getPreviewSourceForItem('resume-item', 'Movie')).resolves.toBe('direct-play');
  });
});
