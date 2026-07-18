import type { ImageMetadata } from 'astro';
import type { CollectionEntry } from 'astro:content';
import alleyCover from '../assets/images/covers/scene-alley.webp';
import balconyCover from '../assets/images/covers/scene-balcony.webp';
import bloomCover from '../assets/images/covers/scene-bloom.webp';
import orbitCover from '../assets/images/covers/scene-orbit.webp';
import windowCover from '../assets/images/covers/scene-window.webp';

export interface BlogCoverArtwork {
  image: ImageMetadata;
  key: string;
  position: string;
}

const blogCoverLibrary: BlogCoverArtwork[] = [
  { image: alleyCover, key: 'alley', position: 'center 42%' },
  { image: bloomCover, key: 'bloom', position: 'center 45%' },
  { image: orbitCover, key: 'orbit', position: 'center' },
  { image: windowCover, key: 'window', position: 'center 40%' },
  { image: balconyCover, key: 'balcony', position: 'center 42%' },
];

function stableIndex(value: string, length: number): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}

export function getBlogCover(article: CollectionEntry<'blog'>): BlogCoverArtwork {
  if (article.data.cover) {
    return { image: article.data.cover, key: 'custom', position: 'center' };
  }
  return blogCoverLibrary[stableIndex(article.id, blogCoverLibrary.length)];
}

export function createBlogCoverMap(
  articles: CollectionEntry<'blog'>[],
): Map<string, BlogCoverArtwork> {
  const ordered = [...articles].sort(
    (articleA, articleB) =>
      Number(Boolean(articleB.data.featured)) - Number(Boolean(articleA.data.featured)) ||
      (articleB.data.publishedAt ?? '').localeCompare(articleA.data.publishedAt ?? '') ||
      articleA.id.localeCompare(articleB.id),
  );
  const covers = new Map<string, BlogCoverArtwork>();
  let previousLibraryKey = '';

  for (const article of ordered) {
    let artwork = getBlogCover(article);
    if (artwork.key !== 'custom' && artwork.key === previousLibraryKey) {
      const currentIndex = blogCoverLibrary.findIndex((candidate) => candidate.key === artwork.key);
      artwork = blogCoverLibrary[(currentIndex + 1) % blogCoverLibrary.length];
    }
    covers.set(article.id, artwork);
    previousLibraryKey = artwork.key === 'custom' ? '' : artwork.key;
  }

  return covers;
}
