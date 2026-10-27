// Font ospitati sul sito stesso (niente Google Fonts = niente dati inviati a terzi).
// I file arrivano dai pacchetti @fontsource installati con "npm install".
import { readdirSync, existsSync } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

/**
 * Cerca nel pacchetto il file woff2 del sottoinsieme "latin" (copre italiano e inglese).
 * pesoOVariabile: "400", "500"... oppure "wght" per i font variabili.
 */
function trovaFileFont(radiceProgetto, pacchetto, pesoOVariabile) {
  const cartella = path.join(radiceProgetto, 'node_modules', pacchetto, 'files');
  if (!existsSync(cartella)) return null;
  const file = readdirSync(cartella).find(
    (f) => f.endsWith('.woff2') && f.includes('-latin-') && !f.includes('-latin-ext-') && f.includes(`-${pesoOVariabile}-normal`)
  );
  return file ? path.join(cartella, file) : null;
}

/**
 * @param fonts elenco di { famiglia, pacchetto, peso, intervallo? }
 * @returns {{ css: string, precarica: string[], avvisi: string[] }}
 */
export async function preparaFont(radiceProgetto, fonts, cartellaUscita) {
  await mkdir(cartellaUscita, { recursive: true });
  const regole = [];
  const precarica = [];
  const avvisi = [];

  for (const font of fonts) {
    const sorgente = trovaFileFont(radiceProgetto, font.pacchetto, font.peso);
    if (!sorgente) {
      avvisi.push(`Font "${font.famiglia}" non trovato (esegui "npm install"): verrà usato un font di sistema`);
      continue;
    }
    const nomeFile = path.basename(sorgente);
    await copyFile(sorgente, path.join(cartellaUscita, nomeFile));
    const peso = font.peso === 'wght' ? (font.intervallo ?? '300 800') : font.peso;
    regole.push(
      `@font-face{font-family:"${font.famiglia}";font-style:normal;font-display:swap;font-weight:${peso};src:url("font/${nomeFile}") format("woff2");}`
    );
    if (font.precarica) precarica.push(`font/${nomeFile}`);
  }

  return { css: regole.join('\n'), precarica, avvisi };
}
