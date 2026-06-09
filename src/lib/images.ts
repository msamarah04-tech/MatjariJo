const readAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error ?? new Error('Could not read image.'));
  reader.readAsDataURL(file);
});

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Could not load image.'));
  img.src = src;
});

const canvasToDataUrl = (canvas: HTMLCanvasElement, quality: number) => canvas.toDataURL('image/jpeg', quality);

export async function prepareImageDataUrl(file: File, options: { maxDimension?: number; maxBytes?: number } = {}) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  const maxDimension = options.maxDimension ?? 1200;
  const maxBytes = options.maxBytes ?? 450_000;
  const original = await readAsDataUrl(file);
  const image = await loadImage(original);

  let scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  let quality = 0.86;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image processing is not available in this browser.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    const dataUrl = canvasToDataUrl(canvas, quality);
    if (dataUrl.length <= maxBytes) return dataUrl;
    if (quality > 0.58) quality -= 0.1;
    else scale *= 0.82;
  }

  throw new Error('Image is too large. Try a smaller file.');
}
