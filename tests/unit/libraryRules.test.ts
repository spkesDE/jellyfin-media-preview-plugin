import { describe, expect, it } from 'vitest';
import { resolveConfiguredLibraryId } from '../../src/preview/library';

describe('library rule resolution', () => {
  it('matches the configured library anywhere in the Jellyfin ancestor chain', () => {
    const ancestors = [
      { Id: 'season' },
      { Id: 'series' },
      { Id: 'movies-library', CollectionType: 'movies' },
      { Id: 'user-root' }
    ];

    expect(resolveConfiguredLibraryId(ancestors, ['movies-library'])).toBe('movies-library');
  });

  it('does not mistake Jellyfin root for the configured library', () => {
    const ancestors = [{ Id: 'movies-library', CollectionType: 'movies' }, { Id: 'user-root' }];

    expect(resolveConfiguredLibraryId(ancestors, ['other-library'])).toBeNull();
  });

  it('matches library ids case-insensitively and returns the configured form', () => {
    expect(resolveConfiguredLibraryId([{ Id: 'ABCDEF' }], ['abcdef'])).toBe('abcdef');
  });
});
