import { afterEach, describe, expect, it } from 'vitest';
import { config } from '../../src/config';
import { PREVIEW_SOURCE_DIRECT_PLAY, PREVIEW_SOURCE_TRAILER } from '../../src/constants';
import { getOrCreateCardState } from '../../src/cards/state';
import { handlePointerLeave } from '../../src/interaction/hover';

const originalDebug = config.debug;
const originalRestoreOnLeave = config.restoreOnLeave;

afterEach(() => {
  config.debug = originalDebug;
  config.restoreOnLeave = originalRestoreOnLeave;
});

describe('hover media lifecycle', () => {
  it.each([null, PREVIEW_SOURCE_DIRECT_PLAY, PREVIEW_SOURCE_TRAILER])(
    'invalidates %s preview work immediately when the pointer leaves in debug mode',
    (activePreviewSource) => {
      const card = document.createElement('div');
      document.body.appendChild(card);
      const state = getOrCreateCardState(card);
      state.pointerInside = true;
      state.previewActive = true;
      state.activePreviewSource = activePreviewSource;
      state.latestRequestToken = 7;
      config.debug = true;
      config.restoreOnLeave = false;

      handlePointerLeave(card, { pointerType: 'mouse' });

      expect(state.pointerInside).toBe(false);
      expect(state.previewActive).toBe(false);
      expect(state.activePreviewSource).toBeNull();
      expect(state.latestRequestToken).toBe(8);
      expect(state.leaveHoldTimer).toBeNull();
    }
  );

  it('stops Direct Play media on leave even when poster restoration is disabled', () => {
    const card = document.createElement('div');
    const video = document.createElement('video');
    video.src = 'https://example.test/direct-play.mp4';
    card.appendChild(video);
    document.body.appendChild(card);

    const state = getOrCreateCardState(card);
    state.pointerInside = true;
    state.previewActive = true;
    state.activePreviewSource = PREVIEW_SOURCE_DIRECT_PLAY;
    state.trailerMedia = video;
    state.trailerMediaKind = 'video';
    config.debug = true;
    config.restoreOnLeave = false;

    handlePointerLeave(card, { pointerType: 'mouse' });

    expect(video.getAttribute('src')).toBeNull();
    expect(state.previewActive).toBe(false);
  });
});
