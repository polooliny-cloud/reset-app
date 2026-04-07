import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const iconsDir = path.join(publicDir, 'icons');

function svgForSize(size) {
  const fontSize = Math.round(size * 0.14);
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#000000"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="system-ui,Segoe UI,Arial,sans-serif" font-weight="700" font-size="${fontSize}">Reset</text>
</svg>`;
}

async function main() {
  fs.mkdirSync(iconsDir, { recursive: true });

  for (const size of [192, 512]) {
    const buf = await sharp(Buffer.from(svgForSize(size)))
      .png()
      .toBuffer();
    const out = path.join(iconsDir, `icon-${size}.png`);
    fs.writeFileSync(out, buf);
    console.log('wrote', out);
  }

  const fav = await sharp(Buffer.from(svgForSize(32))).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), fav);
  console.log('wrote', path.join(publicDir, 'favicon.png'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
