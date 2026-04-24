const LONG_EDGE = 1600;
const JPEG_QUALITY = 0.78;

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

    // Lift shadows (warm brown-grey, not true black)
    r = r + (25 - r * 0.1);
    g = g + (18 - g * 0.08);
    b = b + (10 - b * 0.06);

    // Compress highlights (soft rolloff)
    if (r > 200) r = 200 + (r - 200) * 0.6;
    if (g > 200) g = 200 + (g - 200) * 0.6;
    if (b > 200) b = 200 + (b - 200) * 0.6;

    // Warm shift
    r = r + 10;
    g = g + 3;
    b = b - 12;

    // Desaturate slightly
    const avg = (r + g + b) / 3;
    const sat = 0.82;
    r = avg + (r - avg) * sat;
    g = avg + (g - avg) * sat;
    b = avg + (b - avg) * sat;

    data[i] = Math.max(0, Math.min(255, Math.round(r)));
    data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
    data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
  }
}

function applyGrain(data, width, height) {
  // 2x2 block noise for chunky, film-like grain
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const idx = (y * width + x) * 4;
      const luminance = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      // More grain in shadows, less in highlights
      const strength = 30 * (1 - (luminance / 255) * 0.5);
      const noise = (Math.random() - 0.5) * strength;

      for (let dy = 0; dy < 2 && y + dy < height; dy++) {
        for (let dx = 0; dx < 2 && x + dx < width; dx++) {
          const bi = ((y + dy) * width + (x + dx)) * 4;
          data[bi] = Math.max(0, Math.min(255, data[bi] + noise));
          data[bi + 1] = Math.max(0, Math.min(255, data[bi + 1] + noise));
          data[bi + 2] = Math.max(0, Math.min(255, data[bi + 2] + noise));
        }
      }
    }
  }
}

function applyVignette(ctx, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(width, height) * 0.7;

  const gradient = ctx.createRadialGradient(
    cx,
    cy,
    radius * 0.4,
    cx,
    cy,
    radius,
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.4)");

  ctx.fillStyle = gradient;
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

  // Slight blur for soft plastic lens feel
  ctx.filter = "blur(0.4px)";
  ctx.drawImage(img, 0, 0, width, height);
  ctx.filter = "none";

  // Pixel manipulation: colour grade + grain
  const imageData = ctx.getImageData(0, 0, width, height);
  applyColorGrade(imageData.data);
  applyGrain(imageData.data, width, height);
  ctx.putImageData(imageData, 0, 0);

  // Canvas compositing: vignette + date stamp
  applyVignette(ctx, width, height);
  addDateStamp(ctx, width, height);

  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
  });
}
