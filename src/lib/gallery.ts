export type GalleryGroup = 'paintings' | 'prints' | 'illustration' | 'photography';

export interface GalleryItem {
  slug: string;
  title: string;
  artist: string;
  year: string;
  category: string;
  group: GalleryGroup;
  license: string;
  source_page: string;
  source_url: string | null;
  note: string;
  file: string;
  thumb: string;
  width: number;
  height: number;
  bytes: number;
  orientation: 'landscape' | 'portrait' | 'square';
}

export const GALLERY_GROUP_FILTERS: { id: GalleryGroup | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'paintings', label: 'Paintings' },
  { id: 'prints', label: 'Prints & patterns' },
  { id: 'illustration', label: 'Natural history' },
  { id: 'photography', label: 'Photography' },
];

const GALLERY_BASE = `${import.meta.env.BASE_URL}gallery-candidates/`;

export const galleryImageUrl = (item: GalleryItem): string => GALLERY_BASE + item.file;

export const galleryThumbUrl = (item: GalleryItem): string => GALLERY_BASE + item.thumb;

let manifestPromise: Promise<GalleryItem[]> | null = null;

export function fetchGalleryItems(): Promise<GalleryItem[]> {
  if (!manifestPromise) {
    manifestPromise = fetch(`${GALLERY_BASE}manifest.json`).then((res) => {
      if (!res.ok) throw new Error(`Gallery manifest failed to load (HTTP ${res.status})`);
      return res.json() as Promise<GalleryItem[]>;
    });
  }
  return manifestPromise;
}
