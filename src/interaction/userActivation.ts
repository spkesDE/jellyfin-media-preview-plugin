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
  runtimeState.userActivationEventsBound = true;
}
