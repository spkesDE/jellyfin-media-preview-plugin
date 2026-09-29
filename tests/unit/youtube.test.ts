import { describe, expect, it } from 'vitest';
import { extractYouTubeVideoId } from '../../src/trailerOverlay/youtube';

const videoId = 'dQw4w9WgXcQ';

describe('extractYouTubeVideoId', () => {
  it.each([
    `https://www.youtube.com/watch?v=${videoId}`,
    `https://youtu.be/${videoId}`,
    `https://www.youtube.com/embed/${videoId}`,
    `https://youtube.com/shorts/${videoId}`,
    `https://youtube.com/live/${videoId}`,
    `https://music.youtube.com/watch?v=${videoId}`,
    `https://www.youtube-nocookie.com/embed/${videoId}`
  ])('extracts supported URL %s', (url) => {
    expect(extractYouTubeVideoId(url)).toBe(videoId);
  });

  it.each([
    'https://example.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=too-short',
    'https://youtube.com/shorts/too-short'
  ])('rejects unsupported or malformed URL %s', (url) => {
    expect(extractYouTubeVideoId(url)).toBeNull();
  });
});
