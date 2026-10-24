import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';
import { compareVisuals } from './visualComparison';

function image({ width = 10, changedPixels = 0, delta = 0 } = {}) {
  const png = new PNG({ width, height: 1 });
  png.data.fill(100);
  for (let pixel = 0; pixel < changedPixels; pixel++)
    png.data.writeUInt8(100 + delta, pixel * 4);
  return PNG.sync.write(png);
}

describe('same-host visual comparison bounds', () => {
  it('accepts identical PNGs', () => {
    expect(compareVisuals(image(), image())).toEqual({
      matches: true,
      differingPixels: 0,
      maximumChannelDelta: 0,
    });
  });
  it('accepts exactly eight pixels differing by one channel unit', () => {
    expect(
      compareVisuals(image({ changedPixels: 8, delta: 1 }), image()),
    ).toEqual({ matches: true, differingPixels: 8, maximumChannelDelta: 1 });
  });
  it('rejects nine pixels even when each changes by only one unit', () => {
    expect(
      compareVisuals(image({ changedPixels: 9, delta: 1 }), image()).matches,
    ).toBe(false);
  });
  it('rejects a two-unit change in even one pixel', () => {
    expect(
      compareVisuals(image({ changedPixels: 1, delta: 2 }), image()).matches,
    ).toBe(false);
  });
  it('rejects changed dimensions', () => {
    expect(compareVisuals(image({ width: 9 }), image()).matches).toBe(false);
  });
});
