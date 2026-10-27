#!/usr/bin/env node
// Crea foto segnaposto per il cliente demo, così il template si può provare
// senza foto vere. Per un cliente reale si usano SOLO le sue foto.
// Uso: npm run demo-foto
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_PATH ?? 'sharp');
const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cartella = path.join(RADICE, 'clienti', 'demo-trattoria', 'foto');

// Ogni foto segnaposto ha due colori (per distinguerle) e un'etichetta.
const FOTO = [
  ['copertina.jpg', 2400, 1500, '#3d4a32', '#a9875a', 'Foto principale: esterno o sala'],
  ['sala-1.jpg', 1800, 1200, '#5a4632', '#c7a77c', 'Sala 1'],
  ['sala-2.jpg', 1800, 1200, '#43503b', '#b9b08f', 'Sala 2'],
  ['piatto-1.jpg', 1600, 1600, '#7a3b26', '#e0b26a', 'Piatto 1'],
  ['piatto-2.jpg', 1600, 1600, '#6e5a2a', '#e6d39a', 'Piatto 2'],
  ['piatto-3.jpg', 1600, 1600, '#2f4a4a', '#9cc0b4', 'Piatto 3'],
  ['piatto-4.jpg', 1600, 1600, '#59362f', '#d99b7d', 'Piatto 4'],
  ['piatto-5.jpg', 1600, 1600, '#3e3a2a', '#c9b98a', 'Piatto 5'],
  ['team.jpg', 1600, 2000, '#38423a', '#b7a888', 'Team o titolare'],
];

function svg(w, h, scuro, chiaro, etichetta) {
  const dimensioneTesto = Math.round(Math.min(w, h) / 16);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <radialGradient id="g" cx="35%" cy="30%" r="85%">
      <stop offset="0" stop-color="${chiaro}"/>
      <stop offset="1" stop-color="${scuro}"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <g fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="${Math.round(w / 300)}">
    <circle cx="${w * 0.62}" cy="${h * 0.58}" r="${Math.min(w, h) * 0.26}"/>
    <circle cx="${w * 0.62}" cy="${h * 0.58}" r="${Math.min(w, h) * 0.18}"/>
  </g>
  <text x="${w / 2}" y="${h * 0.12}" font-family="sans-serif" font-size="${dimensioneTesto}" fill="#ffffff" fill-opacity="0.75" text-anchor="middle">Foto di esempio: ${etichetta}</text>
</svg>`);
}

await mkdir(cartella, { recursive: true });
for (const [file, w, h, scuro, chiaro, etichetta] of FOTO) {
  await sharp(svg(w, h, scuro, chiaro, etichetta)).jpeg({ quality: 85 }).toFile(path.join(cartella, file));
  console.log(`creata ${file}`);
}
