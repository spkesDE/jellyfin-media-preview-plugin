import type { PortraitCardCompressionMode } from '../types/config';

const MIN_CARD_WIDTH_PX = 96;
const MIN_CARD_WIDTH_RATIO = 0.55;
const EPSILON = 0.01;

export interface RowCompressionPlan {
  reductions: number[];
  providedWidth: number;
}

export function getMinimumCompressedCardWidth(width: number): number {
  return Math.min(width, Math.max(MIN_CARD_WIDTH_PX, width * MIN_CARD_WIDTH_RATIO));
}

function allocateEvenly(
  indices: number[],
  capacities: number[],
  reductions: number[],
  requestedWidth: number
): number {
  let remaining = requestedWidth;

  while (remaining > EPSILON) {
    const available = indices.filter((index) => capacities[index] - reductions[index] > EPSILON);
    if (!available.length) {
      break;
    }

    const share = remaining / available.length;
    let distributed = 0;
    available.forEach((index) => {
      const amount = Math.min(share, capacities[index] - reductions[index]);
      reductions[index] += amount;
      distributed += amount;
    });

    if (distributed <= EPSILON) {
      break;
    }
    remaining -= distributed;
  }

  return requestedWidth - remaining;
}

export function planRowCompression(
  widths: number[],
  activeIndex: number,
  requestedWidth: number,
  mode: PortraitCardCompressionMode
): RowCompressionPlan {
  const reductions = widths.map(() => 0);
  const capacities = widths.map((width, index) => index === activeIndex
    ? 0
    : Math.max(0, width - getMinimumCompressedCardWidth(width)));
  let remaining = Math.max(0, requestedWidth);

  if (mode === 'neighbors') {
    const distances = Array.from(new Set(widths
      .map((_, index) => Math.abs(index - activeIndex))
      .filter((distance, index) => index !== activeIndex && distance > 0)))
      .sort((left, right) => left - right);

    distances.forEach((distance) => {
      if (remaining <= EPSILON) {
        return;
      }
      const group = widths
        .map((_, index) => index)
        .filter((index) => Math.abs(index - activeIndex) === distance);
      remaining -= allocateEvenly(group, capacities, reductions, remaining);
    });
  } else {
    while (remaining > EPSILON) {
      const available = widths
        .map((_, index) => index)
        .filter((index) => capacities[index] - reductions[index] > EPSILON);
      if (!available.length) {
        break;
      }

      const totalWeight = available.reduce(
        (sum, index) => sum + Math.abs(index - activeIndex),
        0
      );
      const passWidth = remaining;
      let distributed = 0;
      available.forEach((index) => {
        const weight = Math.abs(index - activeIndex);
        const share = passWidth * (weight / totalWeight);
        const amount = Math.min(share, capacities[index] - reductions[index]);
        reductions[index] += amount;
        distributed += amount;
      });

      if (distributed <= EPSILON) {
        break;
      }
      remaining -= distributed;
    }
  }

  return {
    reductions,
    providedWidth: Math.max(0, requestedWidth - remaining)
  };
}
