import { runtimeState } from '../runtime';
import { getHoverCardFromEventTarget, getSupportedCardFromEventTarget } from '../cards/discovery';
import {
  handleFocusEnter,
  handleFocusLeave,
  handleKeyboardPreviewKey,
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

  const onFocusIn = (event: FocusEvent) => {
    const card = getSupportedCardFromEventTarget(event.target);
    if (!card) {
      return;
    }

    const previousCard = getSupportedCardFromEventTarget(event.relatedTarget);
    if (previousCard === card) {
      return;
    }

    handleFocusEnter(card);
  };

  const onFocusOut = (event: FocusEvent) => {
    const card = getSupportedCardFromEventTarget(event.target);
    if (!card) {
      return;
    }

    const nextCard = getSupportedCardFromEventTarget(event.relatedTarget);
    if (nextCard === card) {
      return;
    }

    handleFocusLeave(card);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const card = getSupportedCardFromEventTarget(event.target);
    if (!card) {
      return;
    }

    handleKeyboardPreviewKey(card, event);
  };

  document.addEventListener('pointerover', onPointerOver, true);
  document.addEventListener('pointermove', onPointerMove, true);
  document.addEventListener('pointerout', onPointerOut, true);
  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('mouseout', onMouseOut, true);
  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('focusout', onFocusOut, true);
  document.addEventListener('keydown', onKeyDown, true);
  runtimeState.delegatedHoverHandlers = {
    onPointerOver,
    onPointerMove,
    onPointerOut,
    onMouseOver,
    onMouseMove,
    onMouseOut,
    onFocusIn,
    onFocusOut,
    onKeyDown
  };
  runtimeState.delegatedHoverEventsBound = true;
}

export function unbindDelegatedHoverEvents(): void {
  if (!runtimeState.delegatedHoverHandlers) {
    runtimeState.delegatedHoverEventsBound = false;
    return;
  }

  const handlers = runtimeState.delegatedHoverHandlers;
  document.removeEventListener('pointerover', handlers.onPointerOver, true);
  document.removeEventListener('pointermove', handlers.onPointerMove, true);
  document.removeEventListener('pointerout', handlers.onPointerOut, true);
  document.removeEventListener('mouseover', handlers.onMouseOver, true);
  document.removeEventListener('mousemove', handlers.onMouseMove, true);
  document.removeEventListener('mouseout', handlers.onMouseOut, true);
  document.removeEventListener('focusin', handlers.onFocusIn, true);
  document.removeEventListener('focusout', handlers.onFocusOut, true);
  document.removeEventListener('keydown', handlers.onKeyDown, true);
  runtimeState.delegatedHoverHandlers = null;
  runtimeState.delegatedHoverEventsBound = false;
}
