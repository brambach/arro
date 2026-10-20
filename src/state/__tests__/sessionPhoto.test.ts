import { describe, expect, it } from '@jest/globals';
import { sessionCrop } from '../sessionPhoto';

describe('session photos', () => {
  it('crops a landscape photo to 4:3, centered, and shrinks it to 1440 on the long edge', () => {
    const { crop, size } = sessionCrop(4032, 2268); // 16:9
    expect(crop).toEqual({ originX: 504, originY: 0, width: 3024, height: 2268 });
    expect(size).toEqual({ width: 1440, height: 1080 });
  });

  it('crops a portrait photo to 3:4', () => {
    const { crop, size } = sessionCrop(3024, 4032);
    expect(crop.width / crop.height).toBeCloseTo(3 / 4);
    expect(size).toEqual({ width: 1080, height: 1440 });
  });

  it('never grows a small photo', () => {
    const { size } = sessionCrop(800, 600);
    expect(size).toEqual({ width: 800, height: 600 });
  });
});
