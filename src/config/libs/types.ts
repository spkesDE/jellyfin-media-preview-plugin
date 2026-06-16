import type {
  ContentTypePreviewSource,
  PreviewSource
} from '../../types/config';

export interface ConfigLibraryOverride {
  LibraryId: string;
  PreviewSource: ContentTypePreviewSource;
}

export interface ConfigLibrary {
  Id: string;
  Name: string;
  CollectionType?: string;
}

export interface AppearancePreview {
  title: string;
  year: string;
  runtime: string;
  officialRating: string;
  communityRating: string;
  posterUrl: string;
  previewUrl: string;
}

export type ConfigTab = 'general' | 'keyboard' | 'trickplay' | 'trailer' | 'appearance' | 'advanced';
export type SaveState = 'clean' | 'dirty' | 'saved';
