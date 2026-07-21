import { pageDimensionsMm, clampZoom, ZOOM_MIN, ZOOM_MAX, DEFAULT_PAGE_SETUP } from '../page-setup';

describe('page-setup — paper dimensions and zoom clamping', () => {
  test('A4 portrait is 210mm x 297mm', () => {
    expect(pageDimensionsMm('A4', 'portrait')).toEqual({ width: 210, height: 297 });
  });

  test('A4 landscape swaps width and height', () => {
    expect(pageDimensionsMm('A4', 'landscape')).toEqual({ width: 297, height: 210 });
  });

  test('Letter portrait is 215.9mm x 279.4mm', () => {
    expect(pageDimensionsMm('LETTER', 'portrait')).toEqual({ width: 215.9, height: 279.4 });
  });

  test('Letter landscape swaps width and height', () => {
    expect(pageDimensionsMm('LETTER', 'landscape')).toEqual({ width: 279.4, height: 215.9 });
  });

  test('zoom clamps to the documented min/max range', () => {
    expect(clampZoom(10)).toBe(ZOOM_MIN);
    expect(clampZoom(500)).toBe(ZOOM_MAX);
    expect(clampZoom(100)).toBe(100);
  });

  test('default page setup uses A4 portrait with sensible legal-drafting defaults', () => {
    expect(DEFAULT_PAGE_SETUP.paperSize).toBe('A4');
    expect(DEFAULT_PAGE_SETUP.orientation).toBe('portrait');
    expect(DEFAULT_PAGE_SETUP.zoom).toBe(100);
    expect(DEFAULT_PAGE_SETUP.showPageNumbers).toBe(true);
  });
});
