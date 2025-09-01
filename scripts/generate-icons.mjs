// Generate PNG icons from SVG using sharp
// Requires: npm i -D sharp
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(process.cwd());
const ICONS_DIR = path.join(ROOT, 'public', 'icons');
const SRC_SVG = path.join(ICONS_DIR, 'icon-512.svg'); // use the largest svg as source

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function generate() {
  await ensureDir(ICONS_DIR);
  const sizes = [192, 512];
  const srcExists = fs.existsSync(SRC_SVG);
  if (!srcExists) {
    console.error(`Source SVG not found: ${SRC_SVG}`);
    process.exit(1);
  }

  const svgBuffer = await fs.promises.readFile(SRC_SVG);
  for (const size of sizes) {
    const out = path.join(ICONS_DIR, `icon-${size}.png`);
    await sharp(svgBuffer, { density: 384 }) // higher density for crisp rasterization
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log('Generated', out);
  }
}

generate().catch((e) => {
  console.error(e);
  process.exit(1);
});
