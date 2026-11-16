import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractYouTubeVideoId, monitorYouTubeEmbed } from '../../src/trailerOverlay/youtube';

const videoId = 'dQw4w9WgXcQ';

describe('extractYouTubeVideoId', () => {
  it.each([
    `https://www.youtube.com/watch?v=${videoId}`,
    `https://youtu.be/${videoId}`,
    `https://www.youtube.com/embed/${videoId}`,
    `https://youtube.com/shorts/${videoId}`,
    `https://youtube.com/live/${videoId}`,
    `https://music.youtube.com/watch?v=${videoId}`,
    `https://www.youtube-nocookie.com/embed/${videoId}`
  ])('extracts supported URL %s', (url) => {
    expect(extractYouTubeVideoId(url)).toBe(videoId);
  });

  it.each([
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=too-short',
    'https://youtube.com/shorts/too-short'
  ])('rejects unsupported or malformed URL %s', (url) => {
    expect(extractYouTubeVideoId(url)).toBeNull();
  });
});

describe('monitorYouTubeEmbed volume changes', () => {
  function setup() {
    vi.useFakeTimers();
    const player = { volume: 40, muted: false, events: null as Record<string, (event: unknown) => void> | null };
    const fakePlayer = {
      destroy: () => undefined,
      seekTo: () => undefined,
      playVideo: () => undefined,
      pauseVideo: () => undefined,
      mute: () => (player.muted = true),
      unMute: () => (player.muted = false),
      setVolume: (volume: number) => (player.volume = volume),
      getVolume: () => player.volume,
      isMuted: () => player.muted
    };
    (window as unknown as { YT: unknown }).YT = {
      Player: function Player(
        _iframe: HTMLIFrameElement,
        options: { events: Record<string, (event: unknown) => void> }
      ) {
        player.events = options.events;
        return fakePlayer;
      }
    };
    const iframe = document.createElement('iframe');
    iframe.tabIndex = 0;
    document.body.appendChild(iframe);
    const onUserVolumeChange = vi.fn();
    const monitor = monitorYouTubeEmbed(iframe, {
      onError: () => undefined,
      initialMuted: false,
      initialVolume: 0.4,
      onUserVolumeChange
    });
    iframe.dispatchEvent(new Event('load'));
    return { player, fakePlayer, iframe, monitor, onUserVolumeChange };
  }

  afterEach(() => {
    vi.useRealTimers();
    delete (window as unknown as { YT?: unknown }).YT;
  });

  it('reports changes made in YouTube controls while the player has focus', async () => {
    const { player, fakePlayer, iframe, monitor, onUserVolumeChange } = setup();
    await vi.advanceTimersByTimeAsync(0);
    player.events!.onReady({ target: fakePlayer });
    await vi.advanceTimersByTimeAsync(1500);

    iframe.focus();
    player.volume = 75;
    await vi.advanceTimersByTimeAsync(600);

    expect(onUserVolumeChange).toHaveBeenCalledWith(false, 0.75);
    monitor.cleanup();
  });

  it('ignores changes while the player does not have focus', async () => {
    const { player, fakePlayer, monitor, onUserVolumeChange } = setup();
    await vi.advanceTimersByTimeAsync(0);
    player.events!.onReady({ target: fakePlayer });
    await vi.advanceTimersByTimeAsync(1500);

    player.muted = true;
    await vi.advanceTimersByTimeAsync(600);

    expect(onUserVolumeChange).not.toHaveBeenCalled();
    monitor.cleanup();
  });
});
