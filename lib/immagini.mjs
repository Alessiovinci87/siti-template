// Ottimizzazione delle foto del cliente: versioni WebP in più larghezze,
// così il telefono scarica la foto piccola e il desktop quella grande.
import { mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let sharp;
function caricaSharp() {
  if (sharp) return sharp;
  try {
    sharp = require('sharp');
  } catch {
    // Fallback per ambienti dove sharp è installato globalmente.
    const globale = process.env.SHARP_PATH;
    if (globale) sharp = require(globale);
    else throw new Error('Manca il pacchetto "sharp". Esegui prima: npm install');
  }
  return sharp;
}

const LARGHEZZE = [480, 960, 1600];
const ESTENSIONI_FOTO = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.heic', '.tif', '.tiff'];

export function trovaFoto(cartellaFoto, nomeFile) {
  const percorso = path.join(cartellaFoto, nomeFile);
  return existsSync(percorso) ? percorso : null;
}

export function estensioneValida(nomeFile) {
  return ESTENSIONI_FOTO.includes(path.extname(nomeFile).toLowerCase()) || nomeFile.toLowerCase().endsWith('.svg');
}

/**
 * Crea le versioni ottimizzate di una foto e restituisce i dati per <img srcset>.
 * @returns {{ src, srcset, width, height, avvisi: string[] }}
 */
export async function preparaFoto(sorgente, cartellaUscita, nomeBase, { larghezzaMinima = 0 } = {}) {
  const s = caricaSharp();
  await mkdir(cartellaUscita, { recursive: true });
  const immagine = s(sorgente, { failOn: 'none' }).rotate();
  const meta = await immagine.metadata();
  const larghezzaOriginale = meta.autoOrient?.width ?? meta.width;
  const altezzaOriginale = meta.autoOrient?.height ?? meta.height;
  const avvisi = [];

  if (larghezzaMinima && larghezzaOriginale < larghezzaMinima) {
    avvisi.push(`${path.basename(sorgente)}: è larga solo ${larghezzaOriginale}px (consigliati almeno ${larghezzaMinima}px), potrebbe apparire sgranata`);
  }

  const larghezze = LARGHEZZE.filter((w) => w < larghezzaOriginale);
  if (larghezze.length === 0 || larghezze.at(-1) < larghezzaOriginale) larghezze.push(Math.min(larghezzaOriginale, 2000));

  const varianti = [];
  for (const w of [...new Set(larghezze)]) {
    const file = `${nomeBase}-${w}.webp`;
    await s(sorgente, { failOn: 'none' })
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 78, effort: 5 })
      .toFile(path.join(cartellaUscita, file));
    varianti.push({ file, w });
  }

  const piuGrande = varianti.at(-1);
  const rapporto = altezzaOriginale / larghezzaOriginale;
  return {
    src: `img/${piuGrande.file}`,
    srcset: varianti.map((v) => `img/${v.file} ${v.w}w`).join(', '),
    width: piuGrande.w,
    height: Math.round(piuGrande.w * rapporto),
    avvisi,
  };
}

/** Logo: copia l'SVG così com'è, oppure crea un PNG/WebP leggero. Genera anche le icone. */
export async function preparaLogo(sorgente, cartellaUscita) {
  await mkdir(cartellaUscita, { recursive: true });
  const icone = path.dirname(cartellaUscita);
  if (sorgente.toLowerCase().endsWith('.svg')) {
    await copyFile(sorgente, path.join(cartellaUscita, 'logo.svg'));
    const s = caricaSharp();
    await s(sorgente).resize(180, 180, { fit: 'contain', background: '#ffffff' }).png().toFile(path.join(icone, 'apple-touch-icon.png'));
    await s(sorgente).resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(icone, 'favicon.png'));
    return { src: 'img/logo.svg' };
  }
  const s = caricaSharp();
  await s(sorgente).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 90 }).toFile(path.join(cartellaUscita, 'logo.webp'));
  await s(sorgente).resize(180, 180, { fit: 'contain', background: '#ffffff' }).png().toFile(path.join(icone, 'apple-touch-icon.png'));
  await s(sorgente).resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(icone, 'favicon.png'));
  const meta = await s(sorgente).metadata();
  return { src: 'img/logo.webp', width: Math.min(480, meta.width), height: Math.round(Math.min(480, meta.width) * (meta.height / meta.width)) };
}

/** Icona del sito quando il cliente non ha un logo: l'iniziale del nome su fondo colorato. */
export async function creaIconaDaIniziale(nome, colore, cartellaUscita) {
  const s = caricaSharp();
  const iniziale = nome.trim().charAt(0).toUpperCase().replace(/[<&>"']/g, '');
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect width="180" height="180" rx="36" fill="${colore}"/><text x="90" y="124" font-family="Georgia, serif" font-size="108" text-anchor="middle" fill="#ffffff">${iniziale}</text></svg>`
  );
  await s(svg).png().toFile(path.join(cartellaUscita, 'apple-touch-icon.png'));
  await s(svg).resize(48, 48).png().toFile(path.join(cartellaUscita, 'favicon.png'));
}

/** Immagine per l'anteprima quando il link viene condiviso su WhatsApp o social. */
export async function preparaImmagineCondivisione(sorgente, cartellaUscita) {
  const s = caricaSharp();
  await mkdir(cartellaUscita, { recursive: true });
  await s(sorgente, { failOn: 'none' }).rotate().resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(cartellaUscita, 'condivisione.jpg'));
  return 'img/condivisione.jpg';
}
