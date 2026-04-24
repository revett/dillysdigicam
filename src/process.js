const LONG_EDGE = 1600;
const JPEG_QUALITY = 0.72;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function getTargetSize(srcWidth, srcHeight, maxLongEdge) {
  const scale = maxLongEdge / Math.max(srcWidth, srcHeight);
  if (scale >= 1) return { width: srcWidth, height: srcHeight };
  return {
    width: Math.round(srcWidth * scale),
    height: Math.round(srcHeight * scale),
  };
}

function applyColorGrade(data) {
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // S-curve contrast boost (midtone punch)
    r = 255 * ((r / 255 - 0.5) * 1.2 + 0.5);
    g = 255 * ((g / 255 - 0.5) * 1.2 + 0.5);
    b = 255 * ((b / 255 - 0.5) * 1.2 + 0.5);

    // Light shadow lift (keeps some detail in darks)
    r = r + (12 - r * 0.05);
    g = g + (12 - g * 0.05);
    b = b + (12 - b * 0.05);

    // Highlight compression (blown flash look)
    if (r > 210) r = 210 + (r - 210) * 0.4;
    if (g > 210) g = 210 + (g - 210) * 0.4;
    if (b > 210) b = 210 + (b - 210) * 0.4;

    // Strong green/yellow cast (cheap CCD sensor)
    r = r - 5;
    g = g + 15;
    b = b - 10;

    // Warm push in highlights (flash-lit skin goes slightly yellow)
    const lum = (r + g + b) / 3;
    if (lum > 160) {
      const t = (lum - 160) / 95;
      r = r + 8 * t;
      g = g + 3 * t;
      b = b - 6 * t;
    }

    // Slight desaturation
    const avg = (r + g + b) / 3;
    const sat = 0.85;
    r = avg + (r - avg) * sat;
    g = avg + (g - avg) * sat;
    b = avg + (b - avg) * sat;

    data[i] = Math.max(0, Math.min(255, Math.round(r)));
    data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
    data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
  }
}

function applyGrain(data) {
  // Fine 1px grain with colour noise in shadows
  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const strength = 20 * (1 - (lum / 255) * 0.3);
    const base = (Math.random() - 0.5) * strength;

    // Per-channel colour speckle in dark areas (CCD noise)
    const colourNoise = lum < 120 ? 6 : 0;

    data[i] = Math.max(
      0,
      Math.min(255, data[i] + base + (Math.random() - 0.5) * colourNoise),
    );
    data[i + 1] = Math.max(
      0,
      Math.min(255, data[i + 1] + base + (Math.random() - 0.5) * colourNoise),
    );
    data[i + 2] = Math.max(
      0,
      Math.min(255, data[i + 2] + base + (Math.random() - 0.5) * colourNoise),
    );
  }
}

function applyFlashFalloff(ctx, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(width, height) * 0.7;

  // Flash hotspot (bright centre wash)
  const bright = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.5);
  bright.addColorStop(0, "rgba(255, 255, 240, 0.18)");
  bright.addColorStop(0.5, "rgba(255, 255, 240, 0.06)");
  bright.addColorStop(1, "rgba(255, 255, 240, 0)");
  ctx.fillStyle = bright;
  ctx.fillRect(0, 0, width, height);

  // Heavy edge/corner darken (flash range falloff)
  const dark = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius);
  dark.addColorStop(0, "rgba(0, 0, 0, 0)");
  dark.addColorStop(0.5, "rgba(0, 0, 0, 0.2)");
  dark.addColorStop(0.8, "rgba(0, 0, 0, 0.5)");
  dark.addColorStop(1, "rgba(0, 0, 0, 0.75)");
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, width, height);
}

function addDateStamp(ctx, width, height) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const text = `'${yy} ${m} ${d}`;

  const fontSize = Math.round(width * 0.028);
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.fillStyle = "rgba(255, 165, 50, 0.85)";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(text, width - fontSize * 0.8, height - fontSize * 0.6);
}

export async function processPhoto(url) {
  const img = await loadImage(url);
  const { width, height } = getTargetSize(
    img.naturalWidth,
    img.naturalHeight,
    LONG_EDGE,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Sharp draw (no blur; compact cameras had glass lenses)
  ctx.drawImage(img, 0, 0, width, height);

  // Pixel manipulation: colour grade + grain
  const imageData = ctx.getImageData(0, 0, width, height);
  applyColorGrade(imageData.data);
  applyGrain(imageData.data);
  ctx.putImageData(imageData, 0, 0);

  // Canvas compositing: flash falloff + date stamp
  applyFlashFalloff(ctx, width, height);
  addDateStamp(ctx, width, height);

  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
  });
}
