import { config } from '../config';
import {
  PREVIEW_BACKDROP_BLUR,
  PREVIEW_BACKDROP_DIM,
  PREVIEW_BACKDROP_DIM_BLUR,
  PREVIEW_BACKDROP_DIM_VIGNETTE,
  PREVIEW_BACKDROP_OFF,
  PREVIEW_BACKDROP_VIGNETTE,
  VALID_PREVIEW_BACKDROP_MODES,
  VALID_YOUTUBE_CROP_STRENGTHS,
  YOUTUBE_CROP_LIGHT,
  YOUTUBE_CROP_MEDIUM,
  YOUTUBE_CROP_OFF,
  YOUTUBE_CROP_STRONG
} from '../constants';
import { clamp } from '../core/dom';
import type { PreviewBackdropMode, PreviewMode } from '../types/config';

export function getCardLayoutKind(card: HTMLElement | null): 'portrait' | 'backdrop' {
  if (!card) {
    return 'backdrop';
  }

  if (
    card.classList.contains('overflowPortraitCard') ||
    !!card.querySelector('.cardPadder-overflowPortrait') ||
    !!card.querySelector('.coveredImage')
  ) {
    return 'portrait';
  }

  return 'backdrop';
}

export function getPreviewModeForCard(card: HTMLElement | null): PreviewMode {
  return getCardLayoutKind(card) === 'portrait'
    ? config.portraitCardPreviewMode
    : config.backdropCardPreviewMode;
}

export function getPreviewBackdropMode(): PreviewBackdropMode {
  return VALID_PREVIEW_BACKDROP_MODES.has(config.previewBackdropMode)
    ? config.previewBackdropMode
    : PREVIEW_BACKDROP_DIM_BLUR;
}

export function getYouTubeOverscanMultiplier(): number {
  switch (VALID_YOUTUBE_CROP_STRENGTHS.has(config.youTubeCropStrength) ? config.youTubeCropStrength : YOUTUBE_CROP_MEDIUM) {
    case YOUTUBE_CROP_OFF:
      return 1;
    case YOUTUBE_CROP_LIGHT:
      return 1.1;
    case YOUTUBE_CROP_STRONG:
      return 1.32;
    case YOUTUBE_CROP_MEDIUM:
    default:
      return 1.2;
  }
}

export function getPreviewBackdropStyles(): {
  background: string;
  backdropFilter: string;
  webkitBackdropFilter: string;
} {
  const mode = getPreviewBackdropMode();
  const configuredIntensity = Number(config.previewBackdropIntensityPercent);
  const intensity = clamp(Number.isFinite(configuredIntensity) ? configuredIntensity : 35, 0, 100) / 100;
  const styles = {
    background: 'transparent',
    backdropFilter: 'none',
    webkitBackdropFilter: 'none'
  };

  if (mode === PREVIEW_BACKDROP_OFF) {
    return styles;
  }

  if (mode === PREVIEW_BACKDROP_DIM || mode === PREVIEW_BACKDROP_DIM_BLUR || mode === PREVIEW_BACKDROP_DIM_VIGNETTE) {
    const alpha = Math.max(0, Math.min(0.8, intensity * 0.75));
    styles.background = `rgba(0, 0, 0, ${alpha.toFixed(3)})`;
  }

  if (mode === PREVIEW_BACKDROP_VIGNETTE || mode === PREVIEW_BACKDROP_DIM_VIGNETTE) {
    const innerAlpha = Math.max(0, Math.min(0.45, intensity * 0.18));
    const outerAlpha = Math.max(0.16, Math.min(0.92, 0.22 + (intensity * 0.62)));
    const vignette = `radial-gradient(circle at center, rgba(0, 0, 0, ${innerAlpha.toFixed(3)}) 22%, rgba(0, 0, 0, ${outerAlpha.toFixed(3)}) 100%)`;

    styles.background = mode === PREVIEW_BACKDROP_DIM_VIGNETTE && styles.background !== 'transparent'
      ? `${vignette}, ${styles.background}`
      : vignette;
  }

  if (mode === PREVIEW_BACKDROP_BLUR || mode === PREVIEW_BACKDROP_DIM_BLUR) {
    const blurPx = Math.max(1, Math.round(4 + (intensity * 12)));
    styles.backdropFilter = `blur(${blurPx}px)`;
    styles.webkitBackdropFilter = styles.backdropFilter;
  }

  return styles;
}
