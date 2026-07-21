/**
 * Page Setup — paper size, orientation, margins, zoom, and header/footer
 * settings for the Document Creator's print-ready canvas. Purely a
 * client-side presentation/serialization concern: these values are never
 * validated or interpreted server-side, they just travel inside the
 * autosaved draft payload (see draft-payload.ts) alongside the rich-text
 * content.
 */

export type PaperSize = 'A4' | 'LETTER';
export type Orientation = 'portrait' | 'landscape';

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PageSetup {
  paperSize: PaperSize;
  orientation: Orientation;
  margins: Margins;
  zoom: number;
  header: string;
  footer: string;
  showPageNumbers: boolean;
}

export const DEFAULT_MARGINS: Margins = { top: 25, right: 25, bottom: 25, left: 25 };

export const DEFAULT_PAGE_SETUP: PageSetup = {
  paperSize: 'A4',
  orientation: 'portrait',
  margins: DEFAULT_MARGINS,
  zoom: 100,
  header: '',
  footer: '',
  showPageNumbers: true,
};

// Paper dimensions in millimetres, portrait orientation.
const PAPER_SIZE_MM: Record<PaperSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  LETTER: { width: 215.9, height: 279.4 },
};

export function pageDimensionsMm(paperSize: PaperSize, orientation: Orientation): { width: number; height: number } {
  const { width, height } = PAPER_SIZE_MM[paperSize];
  return orientation === 'landscape' ? { width: height, height: width } : { width, height };
}

export const ZOOM_MIN = 50;
export const ZOOM_MAX = 150;
export const ZOOM_STEP = 10;

export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}
