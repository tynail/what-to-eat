import { PNG } from 'pngjs';

/** Allows only the measured rounding noise from Chromium's blurred modal backdrop. */
export function compareVisuals(actual: Buffer, expected: Buffer) {
  if (actual.equals(expected))
    return { matches: true, differingPixels: 0, maximumChannelDelta: 0 };
  const image = PNG.sync.read(actual);
  const baseline = PNG.sync.read(expected);
  if (image.width !== baseline.width || image.height !== baseline.height) {
    return {
      matches: false,
      differingPixels: Infinity,
      maximumChannelDelta: Infinity,
    };
  }
  let differingPixels = 0;
  let maximumChannelDelta = 0;
  for (let offset = 0; offset < image.data.length; offset += 4) {
    let changed = false;
    for (let channel = 0; channel < 4; channel++) {
      const delta = Math.abs(
        image.data.readUInt8(offset + channel) -
          baseline.data.readUInt8(offset + channel),
      );
      if (delta > 0) changed = true;
      maximumChannelDelta = Math.max(maximumChannelDelta, delta);
    }
    if (changed) differingPixels++;
  }
  return {
    matches: differingPixels <= 8 && maximumChannelDelta <= 1,
    differingPixels,
    maximumChannelDelta,
  };
}
