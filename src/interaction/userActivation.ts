import { runtimeState } from '../runtime';

export function bindUserActivationEvents(): void {
  if (runtimeState.userActivationEventsBound) {
    return;
  }

  const markActivated = (): void => {
    runtimeState.pageHasUserActivation = true;
  };

  window.addEventListener('pointerdown', markActivated, { passive: true, once: true });
  window.addEventListener('keydown', markActivated, { passive: true, once: true });
  window.addEventListener('click', markActivated, { passive: true, once: true });
  runtimeState.userActivationHandler = markActivated;
  runtimeState.userActivationEventsBound = true;
}

export function unbindUserActivationEvents(): void {
  if (runtimeState.userActivationHandler) {
    window.removeEventListener('pointerdown', runtimeState.userActivationHandler);
    window.removeEventListener('keydown', runtimeState.userActivationHandler);
    window.removeEventListener('click', runtimeState.userActivationHandler);
  }

  runtimeState.userActivationHandler = null;
  runtimeState.userActivationEventsBound = false;
  runtimeState.pageHasUserActivation = false;
}
