import { PREVIEW_MODE_CONTAIN, PREVIEW_MODE_STRETCH, PREVIEW_SOURCE_TRICKPLAY } from '../constants';
import { config } from '../config';
import { ensurePreviewDom, resetPreviewBackdrop, showProgress, hideProgress } from '../cards/lifecycle';
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
  if (!ensurePreviewDom(card, state) || !preview?.tileUrl || !preview.info) {
    return;
  }

  const rootHost = state.rootHost;
  if (!rootHost || !state.previewFrame) {
    return;
  }

  const hostRect = rootHost.getBoundingClientRect();
  if (!hostRect.width || !hostRect.height) {
    return;
  }

  const previewMode = PREVIEW_MODE_CONTAIN;
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

  state.lastPreviewKey = previewKey;
  state.previewActive = true;
  state.activePreviewSource = PREVIEW_SOURCE_TRICKPLAY;
  state.currentTrailer = null;
  state.currentTrickplayInfo = preview.info;
  state.lastRenderedTrickplayFrameIndex = preview.frameIndex;
  state.lastRequestedTrickplayFrameIndex = preview.frameIndex;
  state.lastTrickplayRenderAt = Date.now();
  clearTrailerMedia(state);
  state.previewFrame.style.display = '';
  state.previewFrame.style.backgroundImage = `url("${preview.tileUrl.replace(/"/g, '\\"')}")`;
  state.previewFrame.style.backgroundSize = `${renderedTileWidth}px ${renderedTileHeight}px`;
  state.previewFrame.style.backgroundPosition = `${offsetX}px ${offsetY}px`;
  state.previewFrame.style.borderRadius = window.getComputedStyle(rootHost).borderRadius;
  state.previewFrame.style.left = '0';
  state.previewFrame.style.top = '0';
  state.previewFrame.style.width = `${hostRect.width}px`;
  state.previewFrame.style.height = `${hostRect.height}px`;
  state.previewFrame.classList.remove('jhs-contain');
  state.previewFrame.style.removeProperty('--jhs-fade-size');
  state.previewFrame.style.removeProperty('--jhs-fade-color');
  state.previewFrame.style.filter = 'none';
  resetPreviewBackdrop(state);

  if (previewMode === PREVIEW_MODE_CONTAIN) {
    state.previewFrame.style.left = `${(hostRect.width - renderedFrameWidth) / 2}px`;
    state.previewFrame.style.top = `${(hostRect.height - renderedFrameHeight) / 2}px`;
    state.previewFrame.style.width = `${renderedFrameWidth}px`;
    state.previewFrame.style.height = `${renderedFrameHeight}px`;
    state.previewFrame.style.borderRadius = '0';
    state.previewFrame.classList.add('jhs-contain');
  }

  if (config.showProgressIndicator) {
    showProgress(state, percent);
  } else {
    hideProgress(state);
  }

  preloadTileUrls(preview);
}
