import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoverMocks = vi.hoisted(() => ({
  startTouchPreview: vi.fn(() => true),
  scrubTouchPreview: vi.fn(),
  stopTouchPreview: vi.fn()
}));

vi.mock('../../src/interaction/hover', () => hoverMocks);
vi.mock('../../src/cards/discovery', () => ({
  getHoverCardFromEventTarget: (target: EventTarget | null) =>
    target instanceof Element ? (target.closest('[data-test-card]') as HTMLElement | null) : null
}));

import { config } from '../../src/config';
import { getDetailItemId } from '../../src/detailPreview/detailPreview';
import { bindTouchEvents, getActiveTouchCard, unbindTouchEvents } from '../../src/interaction/touch';
import { adjustStartForSegments } from '../../src/preview/mediaSegments';

const TICKS = 10_000_000;

describe('media segments', () => {
  const segments = [
    { Type: 'Recap', StartTicks: 0, EndTicks: 60 * TICKS },
    { Type: 'Intro', StartTicks: 60 * TICKS, EndTicks: 150 * TICKS },
    { Type: 'Outro', StartTicks: 2500 * TICKS, EndTicks: 2600 * TICKS }
  ];

  it('moves a start out of back-to-back recap and intro segments', () => {
    expect(adjustStartForSegments(30, segments, 15, 2600)).toBe(150);
  });

  it('keeps the preview window ahead of the credits', () => {
    expect(adjustStartForSegments(2495, segments, 15, 2600)).toBe(2485);
  });

  it('leaves a start alone when no segment applies', () => {
    expect(adjustStartForSegments(600, segments, 15, 2600)).toBe(600);
    expect(adjustStartForSegments(600, [], 15, 2600)).toBe(600);
  });
});

describe('detail page route', () => {
  const id = '0123456789abcdef0123456789abcdef';

  it('finds the item id on detail routes only', () => {
    expect(getDetailItemId(`https://jf.example/web/#/details?id=${id}&serverId=s`)).toBe(id);
    expect(getDetailItemId(`https://jf.example/web/#!/details?id=${id}`)).toBe(id);
    expect(getDetailItemId(`https://jf.example/web/#/tv?id=${id}`)).toBeNull();
    expect(getDetailItemId('https://jf.example/web/#/details?id=not-an-id')).toBeNull();
  });
});

function touchEvent(type: string, target: Element, x = 10, y = 10, touches = 1): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const list = touches ? [{ clientX: x, clientY: y }] : [];
  Object.defineProperty(event, 'touches', { value: list });
  target.dispatchEvent(event);
  return event;
}

describe('touch previews', () => {
  let card: HTMLElement;
  let image: HTMLElement;
  const originalTouch = config.touchPreviewEnabled;

  beforeEach(() => {
    vi.useFakeTimers();
    Object.values(hoverMocks).forEach((mock) => mock.mockClear());
    config.touchPreviewEnabled = true;
    config.touchLongPressMs = 400;
    card = document.createElement('div');
    card.dataset.testCard = 'true';
    image = document.createElement('div');
    card.appendChild(image);
    document.body.appendChild(card);
    bindTouchEvents();
  });

  afterEach(() => {
    unbindTouchEvents();
    vi.useRealTimers();
    config.touchPreviewEnabled = originalTouch;
  });

  it('starts after a long-press and keeps running after the finger lifts', () => {
    touchEvent('touchstart', image, 20, 30);
    vi.advanceTimersByTime(399);
    expect(hoverMocks.startTouchPreview).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(hoverMocks.startTouchPreview).toHaveBeenCalledWith(card, 20, 30);

    const end = touchEvent('touchend', image, 20, 30, 0);
    expect(end.defaultPrevented).toBe(true);
    expect(getActiveTouchCard()).toBe(card);
    expect(hoverMocks.stopTouchPreview).not.toHaveBeenCalled();
  });

  it('treats early movement as a scroll', () => {
    touchEvent('touchstart', image, 20, 30);
    touchEvent('touchmove', image, 20, 60);
    vi.advanceTimersByTime(1000);
    expect(hoverMocks.startTouchPreview).not.toHaveBeenCalled();
  });

  it('scrubs while held and blocks page scrolling', () => {
    touchEvent('touchstart', image, 20, 30);
    vi.advanceTimersByTime(400);
    const move = touchEvent('touchmove', image, 80, 32);
    expect(move.defaultPrevented).toBe(true);
    expect(hoverMocks.scrubTouchPreview).toHaveBeenCalledWith(card, 80);
  });

  it('suppresses the click that follows a long-press but not a later tap', () => {
    touchEvent('touchstart', image);
    vi.advanceTimersByTime(400);
    touchEvent('touchend', image, 10, 10, 0);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    image.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);

    const laterClick = new MouseEvent('click', { bubbles: true, cancelable: true });
    image.dispatchEvent(laterClick);
    expect(laterClick.defaultPrevented).toBe(false);
  });

  it('stops the preview when another place is touched', () => {
    touchEvent('touchstart', image);
    vi.advanceTimersByTime(400);
    touchEvent('touchend', image, 10, 10, 0);

    touchEvent('touchstart', document.body);
    expect(hoverMocks.stopTouchPreview).toHaveBeenCalledWith(card);
    expect(getActiveTouchCard()).toBeNull();
  });

  it('does nothing while touch previews are off', () => {
    unbindTouchEvents();
    config.touchPreviewEnabled = false;
    bindTouchEvents();
    touchEvent('touchstart', image);
    vi.advanceTimersByTime(1000);
    expect(hoverMocks.startTouchPreview).not.toHaveBeenCalled();
  });
});
