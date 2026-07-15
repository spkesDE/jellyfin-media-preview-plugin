import { config } from '../config';
import {
  AUTO_SCRUB_MODE_PING_PONG,
  AUTO_SCRUB_MODE_SWEEP,
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

function canContinueAutoScrub(state: CardState, generation: number): boolean {
  return state.autoScrubGeneration === generation
    && !!state.previewActive
    && state.activePreviewSource !== PREVIEW_SOURCE_TRAILER;
}

function scheduleSmoothAutoScrubFrame(
  card: HTMLElement,
  state: CardState,
  durationMs: number,
  startPercent: number,
  pingPong: boolean,
  generation: number
): void {
  function tick(timestamp: number): void {
    if (!canContinueAutoScrub(state, generation)) {
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
}

function startSmoothAutoScrub(card: HTMLElement, state: CardState, itemId: string, generation: number): void {
  state.autoScrubPercent = clamp(config.autoScrubStartPercent / 100, 0, 1);
  state.autoScrubStartedAt = null;
  schedulePreviewUpdate(card, state.autoScrubPercent);

  const pingPong = config.autoScrubMode === AUTO_SCRUB_MODE_PING_PONG;

  getTrickplayInfo(itemId).then((info) => {
    if (!canContinueAutoScrub(state, generation)) {
      return;
    }

    scheduleSmoothAutoScrubFrame(
      card,
      state,
      getEffectiveSmoothAutoScrubDurationMs(info),
      state.autoScrubPercent || 0,
      pingPong,
      generation
    );
  }).catch(() => {
    if (!canContinueAutoScrub(state, generation)) {
      return;
    }

    scheduleSmoothAutoScrubFrame(
      card,
      state,
      getEffectiveSmoothAutoScrubDurationMs(null),
      state.autoScrubPercent || 0,
      pingPong,
      generation
    );
  });
}

function startStepAutoScrubInterval(
  card: HTMLElement,
  state: CardState,
  frameCount: number,
  generation: number
): void {
  const step = 1 / Math.max(1, frameCount - 1);
  const intervalMs = Math.max(16, Number(config.autoScrubIntervalMs) || 220);

  const timer = window.setInterval(() => {
    if (!canContinueAutoScrub(state, generation)) {
      window.clearInterval(timer);
      if (state.autoScrubTimer === timer) {
        state.autoScrubTimer = null;
      }
      return;
    }

    state.autoScrubPercent = (state.autoScrubPercent || 0) + step;
    if ((state.autoScrubPercent || 0) > 1) {
      state.autoScrubPercent = 0;
    }

    schedulePreviewUpdate(card, state.autoScrubPercent || 0);
  }, intervalMs);
  state.autoScrubTimer = timer;
}

function startStepAutoScrub(card: HTMLElement, state: CardState, itemId: string, generation: number): void {
  state.autoScrubPercent = clamp((Number(config.autoScrubStartPercent) || 0) / 100, 0, 1);
  schedulePreviewUpdate(card, state.autoScrubPercent);

  getTrickplayInfo(itemId).then((info) => {
    if (!canContinueAutoScrub(state, generation)) {
      return;
    }

    startStepAutoScrubInterval(card, state, getAutoScrubFrameCount(info), generation);
  }).catch(() => {
    if (!canContinueAutoScrub(state, generation)) {
      return;
    }

    startStepAutoScrubInterval(card, state, getAutoScrubFrameCount(null), generation);
  });
}

export function clearAutoScrub(state: CardState | null | undefined): void {
  if (state) {
    state.autoScrubGeneration += 1;
  }

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
  const generation = state.autoScrubGeneration;
  const itemId = getItemIdFromCard(card);

  if (!itemId) {
    return;
  }

  if (config.autoScrubMode === AUTO_SCRUB_MODE_SWEEP || config.autoScrubMode === AUTO_SCRUB_MODE_PING_PONG) {
    startSmoothAutoScrub(card, state, itemId, generation);
    return;
  }

  startStepAutoScrub(card, state, itemId, generation);
}
