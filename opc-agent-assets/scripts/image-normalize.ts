import { PNG } from "pngjs";

export function normalizePngDimensions(buffer: Buffer, width: number, height: number): Buffer {
  const source = PNG.sync.read(buffer);
  if (source.width === width && source.height === height) {
    return buffer;
  }

  const target = new PNG({ width, height, colorType: 6 });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(source.width - 1, Math.floor((x / width) * source.width));
      const sy = Math.min(source.height - 1, Math.floor((y / height) * source.height));
      const sourceIndex = (source.width * sy + sx) << 2;
      const targetIndex = (target.width * y + x) << 2;
      target.data[targetIndex] = source.data[sourceIndex];
      target.data[targetIndex + 1] = source.data[sourceIndex + 1];
      target.data[targetIndex + 2] = source.data[sourceIndex + 2];
      target.data[targetIndex + 3] = source.data[sourceIndex + 3];
    }
  }

  return PNG.sync.write(target);
}
