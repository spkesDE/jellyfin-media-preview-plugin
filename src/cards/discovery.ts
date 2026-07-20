import { SUPPORTED_TYPES } from '../constants';

const CANDIDATE_SELECTORS = [
  '.card[data-id]',
  '.listItemImage[data-action="link"]',
  '.listItemImage.itemAction',
  'a.cardImageContainer[href*="#/details?id="]',
  '.cardImageContainer[item-id]',
  '.cardImageContainer[itemid]'
] as const;

const CARD_LOOKUP_SELECTOR = [
  '.card[data-id]',
  '.listItemImage',
  '.listItem',
  '.listItemWrapper',
  '.cardImageContainer'
].join(', ');

/**
 * Excludes Jellyfin administration and editor cards that may contain an item
 * id but do not represent playable media cards.
 */
export function isExcludedCard(card: Element | null): boolean {
  if (!card) {
    return true;
  }

  if (
    card.matches(
      [
        '.imageEditorCard',
        '.imagePickerCard',
        '.imageEditorImage',
        '.visualCardBox',
        '[data-imagetype]'
      ].join(', ')
    )
  ) {
    return true;
  }

  if (
    card.closest(
      [
        '.imageEditorCard',
        '.imagePickerCard',
        '.imageEditorPage',
        '#imageEditorPage',
        '[data-role="page"].imageEditorPage'
      ].join(', ')
    )
  ) {
    return true;
  }

  return false;
}

export function findCandidateCards(
  rootNode?: ParentNode | Node | null
): HTMLElement[] {
  const rootElement =
    rootNode &&
    'nodeType' in rootNode &&
    rootNode.nodeType === Node.ELEMENT_NODE
      ? (rootNode as Element)
      : document;

  const candidates = new Set<HTMLElement>();

  if (
    'matches' in rootElement &&
    typeof rootElement.matches === 'function'
  ) {
    CANDIDATE_SELECTORS.forEach((selector) => {
      if (!rootElement.matches(selector)) {
        return;
      }

      const card = normalizeCardElement(rootElement);
      if (card) {
        candidates.add(card);
      }
    });
  }

  CANDIDATE_SELECTORS.forEach((selector) => {
    rootElement.querySelectorAll(selector).forEach((element) => {
      const card = normalizeCardElement(element);
      if (card) {
        candidates.add(card);
      }
    });
  });

  return Array.from(candidates).filter((card) => {
    if (isExcludedCard(card)) {
      return false;
    }

    const itemId = getItemIdFromCard(card);
    if (!itemId) {
      return false;
    }

    const itemType = getItemTypeFromCard(card);

    /*
     * Some legitimate Jellyfin cards do not contain data-type.
     * Unknown types remain allowed, but known unsupported types are rejected.
     */
    return !itemType || SUPPORTED_TYPES.has(itemType);
  });
}

export function normalizeCardElement(
  element: Element | null
): HTMLElement | null {
  if (!element) {
    return null;
  }

  return (
    (element.closest('.card[data-id]') as HTMLElement | null) ||
    (element.closest('.listItem') as HTMLElement | null) ||
    (element.closest('.listItemWrapper') as HTMLElement | null) ||
    (element.closest('.cardImageContainer') as HTMLElement | null) ||
    (element as HTMLElement)
  );
}

export function getItemTypeFromCard(
  card: Element | null
): string | null {
  if (!card) {
    return null;
  }

  const ownType =
    card.getAttribute('data-type') ||
    (card instanceof HTMLElement
      ? card.dataset.type || card.dataset.itemtype || null
      : null);

  if (ownType) {
    return ownType;
  }

  const ancestor = card.closest(
    '[data-type], [data-itemtype]'
  ) as HTMLElement | null;

  if (ancestor) {
    return (
      ancestor.getAttribute('data-type') ||
      ancestor.dataset.type ||
      ancestor.dataset.itemtype ||
      null
    );
  }

  const descendant = card.querySelector(
    '[data-type], [data-itemtype]'
  ) as HTMLElement | null;

  if (descendant) {
    return (
      descendant.getAttribute('data-type') ||
      descendant.dataset.type ||
      descendant.dataset.itemtype ||
      null
    );
  }

  return null;
}

function parseItemIdFromHref(
  href: string | null
): string | null {
  if (!href) {
    return null;
  }

  try {
    const url = new URL(href, window.location.origin);
    const fromQuery = url.searchParams.get('id');

    if (fromQuery) {
      return fromQuery;
    }

    const match =
      url.pathname.match(
        /\/details(?:\.html)?\/([^/?#]+)/i
      ) ||
      url.pathname.match(
        /\/itemdetails(?:\.html)?\/([^/?#]+)/i
      ) ||
      url.hash.match(/[?&]id=([^&]+)/i);

    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    const directMatch = href.match(/[?&]id=([^&]+)/i);

    return directMatch
      ? decodeURIComponent(directMatch[1])
      : null;
  }
}

function parseItemIdFromBackgroundImage(
  styleValue: string | null
): string | null {
  if (!styleValue) {
    return null;
  }

  const match = styleValue.match(
    /\/Items\/([a-f0-9]+)\/Images\//i
  );

  return match ? match[1] : null;
}

export function getItemIdFromCard(
  card: Element | null
): string | null {
  if (!card) {
    return null;
  }

  const directKeys = [
    'id',
    'itemId',
    'itemid'
  ] as const;

  const fallbackKeys = [
    'parentid',
    'itemPrimaryImageId'
  ] as const;

  const htmlCard =
    card instanceof HTMLElement ? card : null;

  for (let i = 0; i < directKeys.length; i += 1) {
    const key = directKeys[i];

    const datasetValue =
      htmlCard?.dataset?.[key as keyof DOMStringMap];

    if (datasetValue) {
      return datasetValue;
    }

    const attributeName = `data-${key.replace(
      /[A-Z]/g,
      (match) => `-${match.toLowerCase()}`
    )}`;

    const attributeValue =
      card.getAttribute(attributeName);

    if (attributeValue) {
      return attributeValue;
    }
  }

  const descendants = card.querySelectorAll(
    [
      '[data-id]',
      '[data-item-id]',
      '[data-itemid]',
      'a[href]',
      'button[data-id]'
    ].join(', ')
  );

  for (let i = 0; i < descendants.length; i += 1) {
    const element = descendants[i] as HTMLElement;

    const datasetId =
      element.dataset?.id ||
      element.dataset?.itemId ||
      element.dataset?.itemid;

    if (datasetId) {
      return datasetId;
    }

    const parsedHrefId = parseItemIdFromHref(
      element.getAttribute('href')
    );

    if (parsedHrefId) {
      return parsedHrefId;
    }
  }

  const ownHrefId = parseItemIdFromHref(
    card.getAttribute('href')
  );

  if (ownHrefId) {
    return ownHrefId;
  }

  for (let i = 0; i < fallbackKeys.length; i += 1) {
    const key = fallbackKeys[i];

    const datasetValue =
      htmlCard?.dataset?.[key as keyof DOMStringMap];

    if (datasetValue) {
      return datasetValue;
    }

    const attributeName = `data-${key.replace(
      /[A-Z]/g,
      (match) => `-${match.toLowerCase()}`
    )}`;

    const attributeValue =
      card.getAttribute(attributeName);

    if (attributeValue) {
      return attributeValue;
    }
  }

  if (htmlCard) {
    const ownBackgroundImageId =
      parseItemIdFromBackgroundImage(
        htmlCard.style.backgroundImage ||
          htmlCard.getAttribute('style')
      );

    if (ownBackgroundImageId) {
      return ownBackgroundImageId;
    }
  }

  const backgroundImageHost = card.querySelector(
    '[style*="/Items/"]'
  ) as HTMLElement | null;

  if (backgroundImageHost) {
    const backgroundImageId =
      parseItemIdFromBackgroundImage(
        backgroundImageHost.style.backgroundImage ||
          backgroundImageHost.getAttribute('style')
      );

    if (backgroundImageId) {
      return backgroundImageId;
    }
  }

  return null;
}

/**
 * Returns the element on which the preview should actually be rendered.
 *
 * Jellyfin 12 contains two elements named cardImageContainer:
 * - the actual image container inside .cardContent
 * - an overlay link inside .cardOverlayContainer
 *
 * The real image container must therefore be selected first.
 */
export function getCardImageElement(
  card: Element | null
): HTMLElement | null {
  if (!card || isExcludedCard(card)) {
    return null;
  }

  const selectors = [
    // Jellyfin 12: actual image container.
    '.cardContent > .cardImageContainer.coveredImage',
    '.cardContent > .cardImageContainer:not(a)',
    '.cardScalable .cardContent .cardImageContainer',

    // Older Jellyfin card layouts.
    '.listItemImage',
    '.cardImage',
    'img',
    '.lazy',
    '.itemImage',
    '.cardPadder',

    // Generic fallback. Overlay links are intentionally last.
    '.cardImageContainer:not(a[href*="#/details?id="])',
    '.cardImageContainer'
  ];

  for (let i = 0; i < selectors.length; i += 1) {
    const match = card.querySelector(
      selectors[i]
    ) as HTMLElement | null;

    if (!match) {
      continue;
    }

    if (
      match.classList.contains('cardImageContainer')
    ) {
      return match;
    }

    const nearestContainer = match.closest(
      '.cardImageContainer'
    ) as HTMLElement | null;

    if (
      nearestContainer &&
      !nearestContainer.matches(
        'a[href*="#/details?id="]'
      )
    ) {
      return nearestContainer;
    }

    return match;
  }

  return null;
}

/**
 * Returns the element that should receive the preview layers.
 */
export function getImageRenderHost(
  card: Element | null
): HTMLElement | null {
  if (!card || isExcludedCard(card)) {
    return null;
  }

  const imageElement = getCardImageElement(card);

  if (!imageElement) {
    return null;
  }

  if (
    imageElement.classList.contains(
      'cardImageContainer'
    ) ||
    imageElement.classList.contains('cardPadder')
  ) {
    return imageElement;
  }

  const nearestImageContainer = imageElement.closest(
    '.cardImageContainer'
  ) as HTMLElement | null;

  if (
    nearestImageContainer &&
    !nearestImageContainer.matches(
      'a[href*="#/details?id="]'
    )
  ) {
    return nearestImageContainer;
  }

  const nearestPadder = imageElement.closest(
    '.cardPadder'
  ) as HTMLElement | null;

  if (nearestPadder) {
    return nearestPadder;
  }

  return imageElement.parentElement || imageElement;
}

/**
 * Returns the area in which hover events should activate the preview.
 *
 * Jellyfin 12 places .cardContent and .cardOverlayContainer next to each
 * other inside .cardScalable. Therefore checking only the image container
 * would reject events originating from the overlay.
 */
export function getCardHoverHost(
  card: Element | null
): HTMLElement | null {
  if (!card || isExcludedCard(card)) {
    return null;
  }

  const scalable = card.querySelector(
    '.cardScalable'
  ) as HTMLElement | null;

  if (scalable) {
    return scalable;
  }

  return getImageRenderHost(card);
}

export function getHoverCardFromEventTarget(
  target: EventTarget | null
): HTMLElement | null {
  if (
    !(target instanceof Element) ||
    typeof target.closest !== 'function'
  ) {
    return null;
  }

  const card = normalizeCardElement(
    target.closest(CARD_LOOKUP_SELECTOR)
  );

  if (
    !card ||
    isExcludedCard(card) ||
    !getItemIdFromCard(card)
  ) {
    return null;
  }

  const itemType = getItemTypeFromCard(card);

  if (
    itemType &&
    !SUPPORTED_TYPES.has(itemType)
  ) {
    return null;
  }

  const hoverHost = getCardHoverHost(card);

  if (
    !hoverHost ||
    !(
      target === hoverHost ||
      hoverHost.contains(target)
    )
  ) {
    return null;
  }

  return card;
}

export function getSupportedCardFromEventTarget(
  target: EventTarget | null
): HTMLElement | null {
  if (
    !(target instanceof Element) ||
    typeof target.closest !== 'function'
  ) {
    return null;
  }

  const card = normalizeCardElement(
    target.closest(CARD_LOOKUP_SELECTOR)
  );

  if (
    !card ||
    isExcludedCard(card) ||
    !getItemIdFromCard(card)
  ) {
    return null;
  }

  const itemType = getItemTypeFromCard(card);

  if (
    itemType &&
    !SUPPORTED_TYPES.has(itemType)
  ) {
    return null;
  }

  return card;
}