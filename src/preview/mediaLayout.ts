import { PREVIEW_MODE_CONTAIN, PREVIEW_MODE_STRETCH } from '../constants';
import { getYouTubeOverscanMultiplier } from '../cards/layout';
import type { PreviewMode } from '../types/config';

export function applyMediaLayout(
  layer: HTMLElement,
  mediaElement: HTMLVideoElement | HTMLIFrameElement,
  hostRect: Pick<DOMRect, 'width' | 'height'>,
  mode: PreviewMode,
  sourceWidth: number,
  sourceHeight: number,
  rootBorderRadius: string
): void {
  let scaleX = hostRect.width / sourceWidth;
  let scaleY = hostRect.height / sourceHeight;
  const isIframe = mediaElement.tagName === 'IFRAME';
  const overscan = isIframe ? getYouTubeOverscanMultiplier() : 1;

  layer.style.left = '0';
  layer.style.top = '0';
  layer.style.width = `${hostRect.width}px`;
  layer.style.height = `${hostRect.height}px`;
  layer.style.borderRadius = rootBorderRadius;

  if (mode === PREVIEW_MODE_CONTAIN) {
    const containScale = Math.min(scaleX, scaleY);
    const containedWidth = sourceWidth * containScale;
    const containedHeight = sourceHeight * containScale;
    const mediaWidth = containedWidth * overscan;
    const mediaHeight = containedHeight * overscan;

    mediaElement.style.left = `${(hostRect.width - mediaWidth) / 2}px`;
    mediaElement.style.top = `${(hostRect.height - mediaHeight) / 2}px`;
    mediaElement.style.width = `${mediaWidth}px`;
    mediaElement.style.height = `${mediaHeight}px`;
    return;
  }

  if (mode === PREVIEW_MODE_STRETCH) {
    const mediaWidth = hostRect.width * overscan;
    const mediaHeight = hostRect.height * overscan;
    mediaElement.style.left = `${(hostRect.width - mediaWidth) / 2}px`;
    mediaElement.style.top = `${(hostRect.height - mediaHeight) / 2}px`;
    mediaElement.style.width = `${mediaWidth}px`;
    mediaElement.style.height = `${mediaHeight}px`;
    return;
  }

  const coverScale = Math.max(scaleX, scaleY);
  const coverWidth = sourceWidth * coverScale * overscan;
  const coverHeight = sourceHeight * coverScale * overscan;

  mediaElement.style.left = `${(hostRect.width - coverWidth) / 2}px`;
  mediaElement.style.top = `${(hostRect.height - coverHeight) / 2}px`;
  mediaElement.style.width = `${coverWidth}px`;
  mediaElement.style.height = `${coverHeight}px`;
}
