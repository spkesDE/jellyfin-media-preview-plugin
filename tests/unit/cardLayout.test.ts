import { describe, expect, it } from 'vitest';
import { getCardLayoutKind } from '../../src/cards/layout';

describe('card layout detection', () => {
  it('keeps Home video backdrop cards out of portrait expansion', () => {
    const card = document.createElement('div');
    card.innerHTML = `
      <div class="cardScalable">
        <div class="cardPadder cardPadder-backdrop"></div>
        <a class="cardImageContainer coveredImage"></a>
      </div>
    `;

    expect(getCardLayoutKind(card)).toBe('backdrop');
  });

  it('detects explicit portrait card geometry', () => {
    const card = document.createElement('div');
    card.innerHTML = '<div class="cardPadder cardPadder-portrait"></div>';

    expect(getCardLayoutKind(card)).toBe('portrait');
  });
});
