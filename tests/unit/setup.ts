import { afterEach } from 'vitest';
import { clearPreviewCaches } from '../../src/core/storage';

afterEach(() => {
  clearPreviewCaches();
  document.body.replaceChildren();
});
