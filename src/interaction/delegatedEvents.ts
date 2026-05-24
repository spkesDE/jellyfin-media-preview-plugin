import { runtimeState } from '../runtime';
import { getHoverCardFromEventTarget } from '../cards/discovery';
import {
  handleMouseEnter,
  handleMouseLeave,
  handleMouseMove,
  handlePointerEnter,
  handlePointerLeave,
  handlePointerMove
} from './hover';

export function bindDelegatedHoverEvents(): void {
  if (runtimeState.delegatedHoverEventsBound) {
    return;
  }

  const onPointerOver = (event: PointerEvent) => {
    if (event.pointerType && event.pointerType !== 'mouse') {
      return;
    }

    const card = getHoverCardFromEventTarget(event.target);
    if (!card) {
      return;
    }

    const previousCard = getHoverCardFromEventTarget(event.relatedTarget);
    if (previousCard === card) {
      return;
    }

    handlePointerEnter(card, event);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType && event.pointerType !== 'mouse') {
      return;
    }

    const card = getHoverCardFromEventTarget(event.target);
    if (!card) {
      return;
    }

    handlePointerMove(card, event);
  };

  const onPointerOut = (event: PointerEvent) => {
    if (event.pointerType && event.pointerType !== 'mouse') {
      return;
    }

    const card = getHoverCardFromEventTarget(event.target);
    if (!card) {
      return;
    }

    const nextCard = getHoverCardFromEventTarget(event.relatedTarget);
    if (nextCard === card) {
      return;
    }

    handlePointerLeave(card, event);
  };

  const onMouseOver = (event: MouseEvent) => {
    const card = getHoverCardFromEventTarget(event.target);
    if (!card) {
      return;
    }

    const previousCard = getHoverCardFromEventTarget(event.relatedTarget);
    if (previousCard === card) {
      return;
    }

    handleMouseEnter(card, event);
  };

  const onMouseMove = (event: MouseEvent) => {
    const card = getHoverCardFromEventTarget(event.target);
    if (!card) {
      return;
    }

    handleMouseMove(card, event);
  };

  const onMouseOut = (event: MouseEvent) => {
    const card = getHoverCardFromEventTarget(event.target);
    if (!card) {
      return;
    }

    const nextCard = getHoverCardFromEventTarget(event.relatedTarget);
    if (nextCard === card) {
      return;
    }

    handleMouseLeave(card);
  };

  document.addEventListener('pointerover', onPointerOver, true);
  document.addEventListener('pointermove', onPointerMove, true);
  document.addEventListener('pointerout', onPointerOut, true);
  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('mouseout', onMouseOut, true);
  runtimeState.delegatedHoverEventsBound = true;
}
