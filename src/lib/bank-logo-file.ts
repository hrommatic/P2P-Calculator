const MAX_EDGE = 256;
const MAX_OUTPUT_BYTES = 450_000;
const JPEG_QUALITY = 0.88;

export async function readBankLogoFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Оберіть файл зображення (PNG, JPG або WebP)");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Файл занадто великий (макс. 5 МБ)");
  }

  const dataUrl = await loadImageAsDataUrl(file);
  const resized = await resizeDataUrl(dataUrl, MAX_EDGE);

  if (resized.length > MAX_OUTPUT_BYTES) {
    throw new Error("Зображення занадто велике після стиснення — спробуйте менший файл");
  }

  return resized;
}

function loadImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Не вдалося прочитати файл"));
    };
    reader.onerror = () => reject(new Error("Не вдалося прочитати файл"));
    reader.readAsDataURL(file);
  });
}

function resizeDataUrl(dataUrl: string, maxEdge: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const scale = Math.min(1, maxEdge / Math.max(w, h));
      const tw = Math.max(1, Math.round(w * scale));
      const th = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement("canvas");
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Не вдалося обробити зображення"));
        return;
      }
      ctx.drawImage(img, 0, 0, tw, th);

      let out = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      if (out.length > MAX_OUTPUT_BYTES) {
        out = canvas.toDataURL("image/jpeg", 0.75);
      }
      resolve(out);
    };
    img.onerror = () => reject(new Error("Некоректне зображення"));
    img.src = dataUrl;
  });
}
