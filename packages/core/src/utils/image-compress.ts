const MAX_COMPRESS_WIDTH = 1920;
const MAX_COMPRESS_HEIGHT = 1080;
const COMPRESS_QUALITY = 0.8;
const IMAGE_COMPRESS_THRESHOLD = 5 * 1024 * 1024;

export function shouldCompressImage(file: File): boolean {
  if (!file.type.startsWith("image/")) return false;
  return file.size > IMAGE_COMPRESS_THRESHOLD;
}

export async function compressImage(file: File): Promise<File> {
  if (typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") {
    throw new Error("Image compression requires OffscreenCanvas and createImageBitmap support");
  }

  const bitmap = await createImageBitmap(file);

  let width = bitmap.width;
  let height = bitmap.height;

  if (width > MAX_COMPRESS_WIDTH) {
    const ratio = MAX_COMPRESS_WIDTH / width;
    width = MAX_COMPRESS_WIDTH;
    height = Math.round(height * ratio);
  }
  if (height > MAX_COMPRESS_HEIGHT) {
    const ratio = MAX_COMPRESS_HEIGHT / height;
    height = MAX_COMPRESS_HEIGHT;
    width = Math.round(width * ratio);
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: "image/webp", quality: COMPRESS_QUALITY });

  const originalName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${originalName}.webp`, { type: "image/webp" });
}
