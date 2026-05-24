import { config } from '../config';
import {
  AUTO_SCRUB_MODE_PING_PONG,
  AUTO_SCRUB_MODE_SWEEP,
  HOVER_MODE_AUTO,
  PREVIEW_SOURCE_TRAILER
} from '../constants';
import { getItemIdFromCard } from '../cards/discovery';
import { getOrCreateCardState } from '../cards/state';
import { clamp } from '../core/dom';
import {
  getAutoScrubFrameCount,
  getEffectiveSmoothAutoScrubDurationMs,
  getTrickplayInfo
} from '../preview/trickplay';
import { schedulePreviewUpdate } from './hover';
import type { CardState } from '../types/state';

export function clearAutoScrub(state: CardState | null | undefined): void {
  if (state?.autoScrubTimer) {
    window.clearInterval(state.autoScrubTimer);
    state.autoScrubTimer = null;
  }

  if (state?.autoScrubAnimationFrame) {
    window.cancelAnimationFrame(state.autoScrubAnimationFrame);
    state.autoScrubAnimationFrame = null;
  }
}

export function startAutoScrub(card: HTMLElement): void {
  const state = getOrCreateCardState(card);
  clearAutoScrub(state);
  const itemId = getItemIdFromCard(card);

  if (!itemId) {
    return;
  }

  if (config.autoScrubMode === AUTO_SCRUB_MODE_SWEEP || config.autoScrubMode === AUTO_SCRUB_MODE_PING_PONG) {
    state.autoScrubPercent = clamp(config.autoScrubStartPercent / 100, 0, 1);
    state.autoScrubDirection = 1;
    state.autoScrubStartedAt = null;
    schedulePreviewUpdate(card, state.autoScrubPercent);

    getTrickplayInfo(itemId).then((info) => {
      if (!state.previewActive || state.activePreviewSource === PREVIEW_SOURCE_TRAILER) {
        return;
      }

      const durationMs = getEffectiveSmoothAutoScrubDurationMs(info);
      const startPercent = state.autoScrubPercent || 0;
      const pingPong = config.autoScrubMode === AUTO_SCRUB_MODE_PING_PONG;

      function tick(timestamp: number): void {
        if (!state.previewActive) {
          clearAutoScrub(state);
          return;
        }

        if (state.autoScrubStartedAt === null) {
          state.autoScrubStartedAt = timestamp - (startPercent * durationMs);
        }

        const progress = (timestamp - state.autoScrubStartedAt) / durationMs;

        if (pingPong) {
          const cycle = progress % 2;
          state.autoScrubPercent = cycle <= 1 ? cycle : 2 - cycle;
        } else {
          state.autoScrubPercent = progress % 1;
        }

        schedulePreviewUpdate(card, clamp(state.autoScrubPercent, 0, 1));
        state.autoScrubAnimationFrame = window.requestAnimationFrame(tick);
      }

      state.autoScrubAnimationFrame = window.requestAnimationFrame(tick);
    }).catch(() => {
      const durationMs = getEffectiveSmoothAutoScrubDurationMs(null);
      const startPercent = state.autoScrubPercent || 0;
      const pingPong = config.autoScrubMode === AUTO_SCRUB_MODE_PING_PONG;

      function tick(timestamp: number): void {
        if (!state.previewActive) {
          clearAutoScrub(state);
          return;
        }

        if (state.autoScrubStartedAt === null) {
          state.autoScrubStartedAt = timestamp - (startPercent * durationMs);
        }

        const progress = (timestamp - state.autoScrubStartedAt) / durationMs;

        if (pingPong) {
          const cycle = progress % 2;
          state.autoScrubPercent = cycle <= 1 ? cycle : 2 - cycle;
        } else {
          state.autoScrubPercent = progress % 1;
        }

        schedulePreviewUpdate(card, clamp(state.autoScrubPercent, 0, 1));
        state.autoScrubAnimationFrame = window.requestAnimationFrame(tick);
      }

      state.autoScrubAnimationFrame = window.requestAnimationFrame(tick);
    });
    return;
  }

  state.autoScrubPercent = clamp((Number(config.autoScrubStartPercent) || 0) / 100, 0, 1);
  schedulePreviewUpdate(card, state.autoScrubPercent);

  getTrickplayInfo(itemId).then((info) => {
    if (!state.previewActive || state.activePreviewSource === PREVIEW_SOURCE_TRAILER) {
      return;
    }

    const frameCount = getAutoScrubFrameCount(info);
    const step = 1 / Math.max(1, frameCount - 1);
    const intervalMs = Math.max(16, Number(config.autoScrubIntervalMs) || 220);

    state.autoScrubTimer = window.setInterval(() => {
      if (!state.previewActive) {
        clearAutoScrub(state);
        return;
      }

      state.autoScrubPercent = (state.autoScrubPercent || 0) + step;
      if ((state.autoScrubPercent || 0) > 1) {
        state.autoScrubPercent = 0;
      }

      schedulePreviewUpdate(card, state.autoScrubPercent || 0);
    }, intervalMs);
  }).catch(() => {
    const fallbackFrameCount = getAutoScrubFrameCount(null);
    const step = 1 / Math.max(1, fallbackFrameCount - 1);
    const intervalMs = Math.max(16, Number(config.autoScrubIntervalMs) || 220);

    state.autoScrubTimer = window.setInterval(() => {
      if (!state.previewActive) {
        clearAutoScrub(state);
        return;
      }

      state.autoScrubPercent = (state.autoScrubPercent || 0) + step;
      if ((state.autoScrubPercent || 0) > 1) {
        state.autoScrubPercent = 0;
      }

      schedulePreviewUpdate(card, state.autoScrubPercent || 0);
    }, intervalMs);
  });
}
