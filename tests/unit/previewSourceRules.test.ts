import { afterEach, describe, expect, it } from 'vitest';
import { config } from '../../src/config';
import { VALID_CONTENT_TYPE_PREVIEW_SOURCES, VALID_PREVIEW_SOURCES } from '../../src/constants';
import { getContentTypePreviewSource, getResolvedPreviewSource } from '../../src/preview/source';

const originalConfig = {
  previewSource: config.previewSource,
  moviePreviewSource: config.moviePreviewSource,
  libraryPreviewSourceOverrides: [...config.libraryPreviewSourceOverrides]
};

describe('Direct Play preview source rules', () => {
  afterEach(() => {
    config.previewSource = originalConfig.previewSource;
    config.moviePreviewSource = originalConfig.moviePreviewSource;
    config.libraryPreviewSourceOverrides = [...originalConfig.libraryPreviewSourceOverrides];
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
    config.moviePreviewSource = 'direct-play';
    config.libraryPreviewSourceOverrides = [{ libraryId: 'movies', previewSource: 'direct-play' }];

    expect(getContentTypePreviewSource('Movie')).toBe('direct-play');
    expect(getResolvedPreviewSource('Movie', 'movies')).toBe('direct-play');
  });
});
