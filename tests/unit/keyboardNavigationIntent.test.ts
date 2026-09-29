import { afterEach, describe, expect, it } from 'vitest';
import { hasRecentKeyboardNavigationIntent } from '../../src/interaction/delegatedEvents';
import { runtimeState } from '../../src/runtime';

describe('keyboard preview navigation intent', () => {
  afterEach(() => {
    runtimeState.keyboardNavigationIntentUntil = 0;
  });

  it('ignores programmatic focus without recent keyboard navigation', () => {
    runtimeState.keyboardNavigationIntentUntil = 0;

    expect(hasRecentKeyboardNavigationIntent(1000)).toBe(false);
  });

  it('accepts only a still-active keyboard navigation window', () => {
    runtimeState.keyboardNavigationIntentUntil = 2000;

    expect(hasRecentKeyboardNavigationIntent(1999)).toBe(true);
    expect(hasRecentKeyboardNavigationIntent(2001)).toBe(false);
  });
});
