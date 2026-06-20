// One-off raster asset generator. Rasterises the brand SVGs into the PNG/ICO
// favicons, apple-touch-icon and Open Graph image that crawlers and browsers
// expect. The outputs are committed under public/, so the normal build does not
// depend on `sharp`. Re-run manually after changing og.svg / favicon.svg:
//
//   npm i --no-save sharp png-to-ico
//   node scripts/gen-assets.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const icon = readFileSync(join(pub, 'favicon.svg'));
const og = readFileSync(join(pub, 'og.svg'));

async function png(svg, size, out) {
  await sharp(svg, { density: 384 }).resize(size, size).png().toFile(join(pub, out));
  console.log('wrote', out);
}

await png(icon, 16, 'favicon-16.png');
await png(icon, 32, 'favicon-32.png');
await png(icon, 180, 'apple-touch-icon.png');
await png(icon, 512, 'icon-512.png');
await png(icon, 192, 'icon-192.png');

await sharp(og, { density: 144 }).resize(1200, 630).png().toFile(join(pub, 'og-image.png'));
console.log('wrote og-image.png');

const ico = await pngToIco([join(pub, 'favicon-16.png'), join(pub, 'favicon-32.png')]);
writeFileSync(join(pub, 'favicon.ico'), ico);
console.log('wrote favicon.ico');
