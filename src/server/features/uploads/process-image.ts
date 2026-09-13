import sharp from "sharp";

export const MAX_IMAGE_EDGE_PX = 1980;

export async function processUploadedImage(buffer: Buffer) {
  return sharp(buffer, { animated: true })
    .resize({
      fit: "inside",
      height: MAX_IMAGE_EDGE_PX,
      width: MAX_IMAGE_EDGE_PX,
      withoutEnlargement: true,
    })
    .webp()
    .toBuffer();
}
