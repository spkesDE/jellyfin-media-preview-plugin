import {
  PREVIEW_MODE_CONTAIN,
  PREVIEW_MODE_STRETCH,
  PREVIEW_SOURCE_TRICKPLAY
} from '../constants';
import { config } from '../config';
import {
  applyPreviewBackdrop,
  crossfadePreviewFrameLayers,
  ensurePreviewFrame,
  ensurePreviewHost,
  getActivePreviewFrame,
  getInactivePreviewFrame,
  hideProgress,
  isCrossfadePreviewTransition,
  resetPreviewBackdrop,
  setActivePreviewFrameSlot,
  showPreviewFrameLayer,
  showProgress
} from '../cards/lifecycle';
import { getPreviewModeForCard } from '../cards/layout';
import { getOrCreateCardState } from '../cards/state';
import { clearTrailerMedia } from './renderTrailer';
import { preloadTileUrls } from './preload';
import type { TrickplayPreview } from '../types/preview';

export function applyTrickplayPreview(
  card: HTMLElement,
  preview: TrickplayPreview | null | undefined,
  percent: number
): void {
  const state = getOrCreateCardState(card);
  const primaryFrame = ensurePreviewFrame(state);
  if (!ensurePreviewHost(card, state) || !preview?.tileUrl || !preview.info || !primaryFrame) {
    return;
  }

  const rootHost = state.rootHost;
  if (!rootHost) {
    return;
  }

  const hostRect = rootHost.getBoundingClientRect();
  if (!hostRect.width || !hostRect.height) {
    return;
  }

  const previewMode = getPreviewModeForCard(card);
  let scaleX = hostRect.width / preview.info.frameWidth;
  let scaleY = hostRect.height / preview.info.frameHeight;
  let offsetX: number;
  let offsetY: number;

  if (previewMode === PREVIEW_MODE_CONTAIN) {
    const scale = Math.min(scaleX, scaleY);
    scaleX = scale;
    scaleY = scale;
  } else if (previewMode === PREVIEW_MODE_STRETCH) {
    scaleX = hostRect.width / preview.info.frameWidth;
    scaleY = hostRect.height / preview.info.frameHeight;
  } else {
    const scale = Math.max(scaleX, scaleY);
    scaleX = scale;
    scaleY = scale;
  }

  const renderedFrameWidth = preview.info.frameWidth * scaleX;
  const renderedFrameHeight = preview.info.frameHeight * scaleY;
  const renderedTileWidth = renderedFrameWidth * preview.info.tilesPerRow;
  const renderedTileHeight = renderedFrameHeight * preview.info.tilesPerColumn;

  if (previewMode === PREVIEW_MODE_CONTAIN) {
    offsetX = -(preview.frameColumn * renderedFrameWidth);
    offsetY = -(preview.frameRow * renderedFrameHeight);
  } else {
    const cropOffsetX = (renderedFrameWidth - hostRect.width) / 2;
    const cropOffsetY = (renderedFrameHeight - hostRect.height) / 2;
    offsetX = -((preview.frameColumn * renderedFrameWidth) + cropOffsetX);
    offsetY = -((preview.frameRow * renderedFrameHeight) + cropOffsetY);
  }

  const previewKey = [
    preview.tileUrl,
    preview.frameColumn,
    preview.frameRow,
    Math.round(renderedFrameWidth),
    Math.round(renderedFrameHeight),
    previewMode
  ].join('|');

  if (state.lastPreviewKey === previewKey) {
    if (state.progressBar) {
      state.progressBar.style.width = `${Math.round((percent || 0) * 100)}%`;
    }
    return;
  }

  const previousPreviewKey = state.lastPreviewKey;
  state.lastPreviewKey = previewKey;
  state.previewActive = true;
  state.activePreviewSource = PREVIEW_SOURCE_TRICKPLAY;
  state.currentTrailer = null;
  state.currentTrickplayInfo = preview.info;
  state.lastRenderedTrickplayFrameIndex = preview.frameIndex;
  state.lastRequestedTrickplayFrameIndex = preview.frameIndex;
  state.lastTrickplayRenderAt = Date.now();
  clearTrailerMedia(state);
  const applyFrameStyles = (frame: HTMLDivElement) => {
    frame.style.backgroundImage = `url("${preview.tileUrl.replace(/"/g, '\\"')}")`;
    frame.style.backgroundSize = `${renderedTileWidth}px ${renderedTileHeight}px`;
    frame.style.backgroundPosition = `${offsetX}px ${offsetY}px`;
    frame.style.borderRadius = window.getComputedStyle(rootHost).borderRadius;
    frame.style.left = '0';
    frame.style.top = '0';
    frame.style.width = `${hostRect.width}px`;
    frame.style.height = `${hostRect.height}px`;
    frame.classList.remove('jmp-contain');
    frame.style.removeProperty('--jmp-fade-size');
    frame.style.removeProperty('--jmp-fade-color');
    frame.style.filter = 'none';

    if (previewMode === PREVIEW_MODE_CONTAIN) {
      frame.style.left = `${(hostRect.width - renderedFrameWidth) / 2}px`;
      frame.style.top = `${(hostRect.height - renderedFrameHeight) / 2}px`;
      frame.style.width = `${renderedFrameWidth}px`;
      frame.style.height = `${renderedFrameHeight}px`;
      frame.style.borderRadius = '0';
      frame.classList.add('jmp-contain');
    }
  };

  const currentFrame = getActivePreviewFrame(state) || primaryFrame;
  const targetFrame = isCrossfadePreviewTransition() && previousPreviewKey
    ? (getInactivePreviewFrame(state) || primaryFrame)
    : primaryFrame;

  applyFrameStyles(targetFrame);
  resetPreviewBackdrop(state);
  applyPreviewBackdrop(state);

  if (targetFrame === currentFrame) {
    showPreviewFrameLayer(state, targetFrame);
    setActivePreviewFrameSlot(state, targetFrame === state.previewFrameSecondary ? 'secondary' : 'primary');
  } else {
    crossfadePreviewFrameLayers(state, currentFrame, targetFrame);
    setActivePreviewFrameSlot(state, targetFrame === state.previewFrameSecondary ? 'secondary' : 'primary');
  }

  if (config.showProgressIndicator) {
    showProgress(state, percent);
  } else {
    hideProgress(state);
  }

  if (state.previewFrameSecondary && !isCrossfadePreviewTransition()) {
    state.previewFrameSecondary.style.display = 'none';
    state.previewFrameSecondary.style.visibility = 'hidden';
    state.previewFrameSecondary.style.opacity = '0';
    state.previewFrameSecondary.style.backgroundImage = '';
  }

  preloadTileUrls(preview);
}
