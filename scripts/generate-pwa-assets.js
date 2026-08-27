import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, getPixel) {
  // width, height
  const rowSize = width * 4 + 1; // 1 filter byte per row + RGBA
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a !== undefined ? a : 255;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      for (let j = 0; j < 8; j++) {
        const bit = (byte ^ crc) & 1;
        crc = (crc >>> 1) ^ (bit ? 0xedb88320 : 0);
        byte >>>= 1;
      }
    }
    return (crc ^ -1) >>> 0;
  }

  function createChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crcVal = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crcVal, 8 + len);
    return buf;
  }

  // Header: 8 bytes
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR data: width (4), height (4), bit depth (1), color type (1 = RGBA: 6), comp (1), filter (1), interlace (1)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Icon generator (Blue gradient background with modern BFL monogram shape)
function iconPixel(x, y, w, h, isMaskable) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background gradient from sky blue (#0284c7) to deep indigo (#0f172a)
  const t = y / h;
  let r = Math.round(2 + t * 13);
  let g = Math.round(132 - t * 109);
  let b = Math.round(199 - t * 157);

  // If not maskable, round corners
  if (!isMaskable) {
    const cornerRadius = w * 0.22;
    const qx = Math.max(0, Math.abs(dx) - (cx - cornerRadius));
    const qy = Math.max(0, Math.abs(dy) - (cy - cornerRadius));
    const cornerDist = Math.sqrt(qx * qx + qy * qy);
    if (cornerDist > cornerRadius) {
      return [0, 0, 0, 0]; // Transparent
    }
  }

  // Draw central emblem / BFL shield highlight
  const radius = w * 0.35;
  if (dist < radius) {
    const shieldT = (dist / radius);
    r = Math.min(255, Math.round(r + (1 - shieldT) * 90));
    g = Math.min(255, Math.round(g + (1 - shieldT) * 90));
    b = Math.min(255, Math.round(b + (1 - shieldT) * 60));
  }

  return [r, g, b, 255];
}

// Generate Icons
console.log('Generating PWA Icons...');
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), createPNG(192, 192, (x, y, w, h) => iconPixel(x, y, w, h, false)));
fs.writeFileSync(path.join(publicDir, 'icon-192-maskable.png'), createPNG(192, 192, (x, y, w, h) => iconPixel(x, y, w, h, true)));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), createPNG(512, 512, (x, y, w, h) => iconPixel(x, y, w, h, false)));
fs.writeFileSync(path.join(publicDir, 'icon-512-maskable.png'), createPNG(512, 512, (x, y, w, h) => iconPixel(x, y, w, h, true)));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, (x, y, w, h) => iconPixel(x, y, w, h, false)));

// Generate Mobile & Desktop screenshots
console.log('Generating PWA Screenshots...');
fs.writeFileSync(path.join(publicDir, 'screenshot-mobile.png'), createPNG(540, 960, (x, y, w, h) => {
  const t = y / h;
  return [Math.round(15 + t * 10), Math.round(23 + t * 15), Math.round(42 + t * 20), 255];
}));

fs.writeFileSync(path.join(publicDir, 'screenshot-desktop.png'), createPNG(960, 540, (x, y, w, h) => {
  const t = y / h;
  return [Math.round(15 + t * 10), Math.round(23 + t * 15), Math.round(42 + t * 20), 255];
}));

console.log('PWA Assets successfully generated in public/ folder!');
