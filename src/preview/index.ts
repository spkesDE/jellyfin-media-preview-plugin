import { PREVIEW_SOURCE_TRAILER } from '../constants';
import { renderMetadataOverlay } from './metadata';
import { applyTrailerPreview } from './renderTrailer';
import { applyTrickplayPreview } from './renderTrickplay';
import type { PreviewResult } from '../types/preview';

export function applyPreview(
  card: HTMLElement,
  preview: PreviewResult | null | undefined,
  percent: number,
  options?: { onTrailerUnavailable?: () => void }
): void {
  if (!preview) {
    return;
  }

  if (preview.source === PREVIEW_SOURCE_TRAILER) {
    applyTrailerPreview(card, preview, { onUnavailable: options?.onTrailerUnavailable });
    renderMetadataOverlay(card);
    return;
  }

  applyTrickplayPreview(card, preview, percent);
  renderMetadataOverlay(card);
}
