import { PREVIEW_SOURCE_TRAILER } from '../constants';
import { applyTrailerPreview } from './renderTrailer';
import { applyTrickplayPreview } from './renderTrickplay';
import type { PreviewResult } from '../types/preview';

export function applyPreview(card: HTMLElement, preview: PreviewResult | null | undefined, percent: number): void {
  if (!preview) {
    return;
  }

  if (preview.source === PREVIEW_SOURCE_TRAILER) {
    applyTrailerPreview(card, preview);
    return;
  }

  applyTrickplayPreview(card, preview, percent);
}
