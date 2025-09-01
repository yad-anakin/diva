// Generate placeholder PWA screenshots (wide and narrow) using sharp by rasterizing simple SVGs.
// Usage: npm run shots:gen
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(process.cwd());
const OUT_DIR = path.join(ROOT, 'public', 'screenshots');

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

function makeSVG(width, height, titleAr) {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fce7f3"/>
        <stop offset="100%" stop-color="#ffe4e6"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <g text-anchor="middle" font-family="Arial, 'Segoe UI', Tahoma" fill="#e11d48">
      <text x="50%" y="50%" font-size="${Math.floor(height*0.12)}" font-weight="700">Diva Salon</text>
      <text x="50%" y="65%" font-size="${Math.floor(height*0.06)}" fill="#9d174d">${titleAr}</text>
    </g>
  </svg>`;
}

async function generate() {
  await ensureDir(OUT_DIR);
  // Wide (desktop)
  const wideSvg = makeSVG(1280, 720, 'لقطة شاشة - سطح المكتب');
  await sharp(Buffer.from(wideSvg))
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'wide.png'));

  // Narrow (mobile)
  const narrowSvg = makeSVG(720, 1280, 'لقطة شاشة - الجوال');
  await sharp(Buffer.from(narrowSvg))
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'narrow.png'));

  console.log('Generated screenshots in', OUT_DIR);
}

generate().catch((e) => { console.error(e); process.exit(1); });
