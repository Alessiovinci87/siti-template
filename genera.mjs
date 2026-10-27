#!/usr/bin/env node
// Genera il sito di un cliente partendo dal suo file dati.
//
// Uso:
//   node genera.mjs <cartella-cliente> [--anteprima] [--variante terra|mare|notte]
//
// Esempio:
//   node genera.mjs demo-trattoria --anteprima
//
// Risultato: dist/<cartella-cliente>/ pronto da pubblicare.
import { readFile, writeFile, mkdir, rm, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { valida } from './lib/valida.mjs';
import {
  preparaFoto,
  preparaLogo,
  preparaImmagineCondivisione,
  creaIconaDaIniziale,
  trovaFoto,
  estensioneValida,
} from './lib/immagini.mjs';
import { preparaFont } from './lib/font.mjs';
import { testoPrivacy } from './lib/privacy.mjs';

const RADICE = path.dirname(fileURLToPath(import.meta.url));

function leggiArgomenti(argv) {
  const opzioni = { cliente: null, anteprima: false, variante: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--anteprima') opzioni.anteprima = true;
    else if (a === '--variante') opzioni.variante = argv[++i];
    else if (!a.startsWith('--')) opzioni.cliente = a;
  }
  return opzioni;
}

function esci(messaggio) {
  console.error(`\n✖ ${messaggio}\n`);
  process.exit(1);
}

async function leggiJson(percorso, descrizione) {
  if (!existsSync(percorso)) esci(`Non trovo ${descrizione}: ${path.relative(RADICE, percorso)}`);
  try {
    return JSON.parse(await readFile(percorso, 'utf8'));
  } catch (errore) {
    esci(`${descrizione} non è un JSON valido (${path.relative(RADICE, percorso)}):\n  ${errore.message}`);
  }
}

function impronta(...contenuti) {
  const h = createHash('sha256');
  contenuti.forEach((c) => h.update(c));
  return h.digest('hex').slice(0, 8);
}

/** Elenca tutte le foto dichiarate nei dati, con le regole di dimensione. */
function fotoDichiarate(foto) {
  const elenco = [];
  if (foto.copertina) elenco.push({ ruolo: 'copertina', ...foto.copertina, larghezzaMinima: 1600 });
  (foto.sala ?? []).forEach((f, i) => elenco.push({ ruolo: `sala-${i + 1}`, ...f, larghezzaMinima: 1200 }));
  (foto.piatti ?? []).forEach((f, i) => elenco.push({ ruolo: `piatto-${i + 1}`, ...f, larghezzaMinima: 1000 }));
  if (foto.team) elenco.push({ ruolo: 'team', ...foto.team, larghezzaMinima: 1000 });
  return elenco;
}

async function main() {
  const inizio = Date.now();
  const opzioni = leggiArgomenti(process.argv.slice(2));
  if (!opzioni.cliente) esci('Indica la cartella del cliente. Esempio: node genera.mjs demo-trattoria');

  const cartellaCliente = path.join(RADICE, 'clienti', opzioni.cliente);
  const cartellaFoto = path.join(cartellaCliente, 'foto');
  const config = await leggiJson(path.join(RADICE, 'config.json'), 'la configurazione generale');
  const dati = await leggiJson(path.join(cartellaCliente, 'dati.json'), 'il file dati del cliente');

  if (opzioni.variante) dati.stile = { ...dati.stile, variante: opzioni.variante };

  // 1. Template e controllo dati
  const nomeTemplate = dati.template;
  const cartellaTemplate = path.join(RADICE, 'templates', String(nomeTemplate));
  if (!nomeTemplate || !existsSync(cartellaTemplate)) esci(`Template "${nomeTemplate}" non trovato in templates/`);
  const schema = await leggiJson(path.join(cartellaTemplate, 'schema.json'), 'lo schema del template');
  const errori = valida(dati, schema);
  if (errori.length) {
    esci(`Il file dati ha ${errori.length} problem${errori.length === 1 ? 'a' : 'i'} da sistemare:\n${errori.map((e) => `  • ${e}`).join('\n')}`);
  }

  // 2. Controllo foto: si parte solo se ci sono tutte
  const elencoFoto = fotoDichiarate(dati.foto);
  const mancanti = elencoFoto.filter((f) => !trovaFoto(cartellaFoto, f.file)).map((f) => `${f.ruolo}: ${f.file}`);
  if (dati.foto.logo && !trovaFoto(cartellaFoto, dati.foto.logo)) mancanti.push(`logo: ${dati.foto.logo}`);
  if (mancanti.length) esci(`Mancano ${mancanti.length} foto nella cartella ${path.relative(RADICE, cartellaFoto)}:\n${mancanti.map((m) => `  • ${m}`).join('\n')}`);
  const formatiStrani = elencoFoto.filter((f) => !estensioneValida(f.file)).map((f) => f.file);
  if (formatiStrani.length) esci(`Formato foto non supportato: ${formatiStrani.join(', ')}`);

  const template = await import(path.join(cartellaTemplate, 'template.mjs'));

  // 3. Cartella di uscita pulita
  const uscita = path.join(RADICE, 'dist', opzioni.cliente);
  await rm(uscita, { recursive: true, force: true });
  await mkdir(path.join(uscita, 'img'), { recursive: true });
  const avvisi = [];

  // 4. Foto ottimizzate
  const pronte = {};
  for (const f of elencoFoto) {
    const risultato = await preparaFoto(path.join(cartellaFoto, f.file), path.join(uscita, 'img'), f.ruolo, { larghezzaMinima: f.larghezzaMinima });
    avvisi.push(...risultato.avvisi);
    pronte[f.ruolo] = { ...risultato, alt: f.alt };
  }
  const risorse = {
    foto: {
      copertina: pronte.copertina,
      sala: dati.foto.sala.map((_, i) => pronte[`sala-${i + 1}`]),
      piatti: dati.foto.piatti.map((_, i) => pronte[`piatto-${i + 1}`]),
      team: dati.foto.team ? pronte.team : null,
    },
    logo: null,
    condivisione: await preparaImmagineCondivisione(path.join(cartellaFoto, dati.foto.copertina.file), path.join(uscita, 'img')),
  };
  if (dati.foto.logo) {
    risorse.logo = await preparaLogo(path.join(cartellaFoto, dati.foto.logo), path.join(uscita, 'img'));
  } else {
    // senza logo: icona generata dall'iniziale, con il colore della variante
    await creaIconaDaIniziale(dati.attivita.nome, template.VARIANTI[dati.stile.variante].coloreTema, uscita);
  }

  // 5. Font, stile e script
  const font = await preparaFont(RADICE, template.VARIANTI[dati.stile.variante].font, path.join(uscita, 'font'));
  avvisi.push(...font.avvisi);
  const cssTemplate = await readFile(path.join(cartellaTemplate, 'stile.css'), 'utf8');
  const jsTemplate = await readFile(path.join(cartellaTemplate, 'script.js'), 'utf8');
  const css = `${font.css}\n${cssTemplate}`;
  await writeFile(path.join(uscita, 'stile.css'), css);
  await writeFile(path.join(uscita, 'script.js'), jsTemplate);
  risorse.font = font;
  risorse.versione = impronta(css, jsTemplate);

  // 6. Pagine
  const configPagine = { ...config, anteprima: opzioni.anteprima };
  const pagine = template.generaPagine(dati, risorse, configPagine, testoPrivacy(dati));
  for (const pagina of pagine) {
    const destinazione = path.join(uscita, pagina.percorso);
    await mkdir(path.dirname(destinazione), { recursive: true });
    await writeFile(destinazione, pagina.contenuto);
  }

  // 7. File per i motori di ricerca
  const dominio = dati.sito?.dominio;
  if (opzioni.anteprima) {
    await writeFile(path.join(uscita, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  } else {
    await writeFile(path.join(uscita, 'robots.txt'), `User-agent: *\nAllow: /\n${dominio ? `Sitemap: https://${dominio}/sitemap.xml\n` : ''}`);
    if (dominio) {
      const oggi = new Date().toISOString().slice(0, 10);
      const url = [`https://${dominio}/`];
      await writeFile(
        path.join(uscita, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${url.map((u) => `  <url><loc>${u}</loc><lastmod>${oggi}</lastmod></url>`).join('\n')}\n</urlset>\n`
      );
    } else {
      avvisi.push('Manca sito.dominio nei dati: niente sitemap e niente link canonico (va bene per l\'anteprima)');
    }
  }

  // 8. Riepilogo
  const secondi = ((Date.now() - inizio) / 1000).toFixed(1);
  console.log(`\n✔ Sito di "${dati.attivita.nome}" generato in ${secondi}s`);
  console.log(`  Cartella: ${path.relative(RADICE, uscita)}`);
  console.log(`  Variante: ${dati.stile.variante}${opzioni.anteprima ? ', modalità anteprima (non indicizzato)' : ''}`);
  if (avvisi.length) console.log(`\n⚠ Da controllare:\n${avvisi.map((a) => `  • ${a}`).join('\n')}`);
  console.log(`\nPer vederlo: npm run anteprima -- ${opzioni.cliente}\n`);
}

main().catch((errore) => esci(errore.stack ?? errore.message));
