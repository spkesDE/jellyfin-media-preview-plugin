import { afterEach, describe, expect, it } from 'vitest';
import { config } from '../../src/config';
import { VALID_CONTENT_TYPE_PREVIEW_SOURCES, VALID_PREVIEW_SOURCES } from '../../src/constants';
import { getContentTypePreviewSource, getPreviewSourceChain, getResolvedPreviewSource } from '../../src/preview/source';

const originalConfig = {
  previewSource: config.previewSource,
  inProgressPreviewSource: config.inProgressPreviewSource,
  moviePreviewSource: config.moviePreviewSource,
  libraryPreviewSourceOverrides: [...config.libraryPreviewSourceOverrides],
  preferTrailerFallbacks: [...config.preferTrailerFallbacks],
  preferTrickplayFallbacks: [...config.preferTrickplayFallbacks],
  preferDirectPlayFallbacks: [...config.preferDirectPlayFallbacks]
};

describe('Direct Play preview source rules', () => {
  afterEach(() => {
    config.previewSource = originalConfig.previewSource;
    config.inProgressPreviewSource = originalConfig.inProgressPreviewSource;
    config.moviePreviewSource = originalConfig.moviePreviewSource;
    config.libraryPreviewSourceOverrides = [...originalConfig.libraryPreviewSourceOverrides];
    config.preferTrailerFallbacks = [...originalConfig.preferTrailerFallbacks];
    config.preferTrickplayFallbacks = [...originalConfig.preferTrickplayFallbacks];
    config.preferDirectPlayFallbacks = [...originalConfig.preferDirectPlayFallbacks];
  });

  it('is valid as a default and inherited rule source', () => {
    expect(VALID_PREVIEW_SOURCES.has('direct-play')).toBe(true);
    expect(VALID_CONTENT_TYPE_PREVIEW_SOURCES.has('direct-play')).toBe(true);

    config.previewSource = 'direct-play';
    config.moviePreviewSource = 'inherit';
    expect(getContentTypePreviewSource('Movie')).toBe('direct-play');
  });

  it('wins at type and library rule priority', () => {
    config.previewSource = 'trickplay';
    config.moviePreviewSource = 'trailer';
    config.libraryPreviewSourceOverrides = [{ libraryId: 'movies', previewSource: 'direct-play' }];

    expect(getContentTypePreviewSource('Movie')).toBe('trailer');
    expect(getResolvedPreviewSource('Movie', 'movies')).toBe('direct-play');
    expect(getResolvedPreviewSource('Movie', 'MOVIES')).toBe('direct-play');
  });

  it('lets an in-progress rule override library and type rules', () => {
    config.previewSource = 'trickplay';
    config.moviePreviewSource = 'trailer';
    config.libraryPreviewSourceOverrides = [{ libraryId: 'movies', previewSource: 'prefer-trailer' }];
    config.inProgressPreviewSource = 'direct-play';

    expect(getResolvedPreviewSource('Movie', 'movies', false)).toBe('prefer-trailer');
    expect(getResolvedPreviewSource('Movie', 'movies', true)).toBe('direct-play');

    config.inProgressPreviewSource = 'inherit';
    expect(getResolvedPreviewSource('Movie', 'movies', true)).toBe('prefer-trailer');
  });

  it('uses configured order and skips disabled preferred fallbacks', () => {
    config.preferTrailerFallbacks = [
      { source: 'local-trailer', enabled: true },
      { source: 'trickplay', enabled: true },
      { source: 'remote-trailer', enabled: false },
      { source: 'direct-play', enabled: false }
    ];
    config.preferDirectPlayFallbacks = [
      { source: 'trickplay', enabled: false },
      { source: 'remote-trailer', enabled: true },
      { source: 'local-trailer', enabled: true }
    ];

    expect(getPreviewSourceChain('prefer-trailer')).toEqual(['local-trailer', 'trickplay']);
    expect(getPreviewSourceChain('prefer-direct-play')).toEqual(['direct-play', 'remote-trailer', 'local-trailer']);
  });

  it('allows Remote Trailer to lead the Prefer Trailer chain', () => {
    config.preferTrailerFallbacks = [
      { source: 'remote-trailer', enabled: true },
      { source: 'local-trailer', enabled: true },
      { source: 'direct-play', enabled: false },
      { source: 'trickplay', enabled: false }
    ];

    expect(getPreviewSourceChain('prefer-trailer')).toEqual(['remote-trailer', 'local-trailer']);
  });

  it('keeps Direct Play first in an editable Prefer Trailer chain', () => {
    config.preferTrailerFallbacks = [
      { source: 'direct-play', enabled: true },
      { source: 'remote-trailer', enabled: true },
      { source: 'local-trailer', enabled: true },
      { source: 'trickplay', enabled: true }
    ];

    expect(getPreviewSourceChain('prefer-trailer')).toEqual([
      'direct-play',
      'remote-trailer',
      'local-trailer',
      'trickplay'
    ]);
  });
});
