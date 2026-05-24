import { config } from './config';
import { DEBUG_LEAVE_HOLD_MS } from './constants';
import { findCandidateCards, getCardImageElement, getItemIdFromCard } from './cards/discovery';
import { restoreCard } from './cards/lifecycle';
import { bindCard } from './interaction/hover';
import { getTrickplayInfo } from './preview/trickplay';
import { getPreviewUrl } from './preview/source';
import { applyPreview } from './preview';
import { observePageChanges } from './core/observer';

export interface JellyfinMediaPreviewPublicApi {
  config: typeof config;
  start: () => void;
  destroy: () => void;
  rebind: () => void;
  debugHoldMs: number;
  findCandidateCards: typeof findCandidateCards;
  getItemIdFromCard: typeof getItemIdFromCard;
  getCardImageElement: typeof getCardImageElement;
  getTrickplayInfo: typeof getTrickplayInfo;
  getPreviewUrl: typeof getPreviewUrl;
  applyPreview: typeof applyPreview;
  restoreCard: typeof restoreCard;
  bindCard: typeof bindCard;
  observePageChanges: typeof observePageChanges;
}

export function createPublicApi(start: () => void, destroy: () => void, rebind: () => void): JellyfinMediaPreviewPublicApi {
  return {
    config,
    start,
    destroy,
    rebind,
    debugHoldMs: DEBUG_LEAVE_HOLD_MS,
    findCandidateCards,
    getItemIdFromCard,
    getCardImageElement,
    getTrickplayInfo,
    getPreviewUrl,
    applyPreview,
    restoreCard,
    bindCard,
    observePageChanges
  };
}
