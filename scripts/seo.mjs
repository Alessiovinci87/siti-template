#!/usr/bin/env node
// Report SEO di un cliente: parole chiave su cui puntare e suggerimenti per i testi.
// Uso: npm run seo -- <cartella-cliente>
// Risultato: report/<cartella-cliente>/seo.md
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { RADICE, caricaCliente, leggiJson } from '../lib/cliente.mjs';
import { paroleChiave, titoloPagina } from '../lib/seo.mjs';

const nome = process.argv[2];
const { dati } = await caricaCliente(nome);
const db = await leggiJson(path.join(RADICE, 'seo', 'parole-chiave.json'), 'il database delle parole chiave');
const { parole, categorieGoogle } = paroleChiave(dati, db);

const it = parole.filter((p) => p.lingua === 'it');
const en = parole.filter((p) => p.lingua === 'en');
const principali = it.filter((p) => p.priorita === 'alta').slice(0, 5);
const titolo = titoloPagina(dati);
const descrizione = dati.attivita.descrizione_breve;
const citta = dati.contatti.indirizzo.citta;

const controlli = [
  [titolo.length <= 65, `Titolo di ${titolo.length} caratteri (consigliati massimo 60-65)`],
  [titolo.toLowerCase().includes(citta.toLowerCase()), 'La città è nel titolo'],
  [descrizione.length >= 120 && descrizione.length <= 160, `Descrizione di ${descrizione.length} caratteri (consigliati 120-160)`],
  [descrizione.toLowerCase().includes(citta.toLowerCase()), 'La città è nella descrizione'],
  [dati.attivita.chi_siamo.join(' ').toLowerCase().includes(citta.toLowerCase()), 'La città compare nel testo "Chi siamo"'],
  [Boolean(dati.sito?.dominio), 'Dominio indicato (serve per sitemap e link canonico)'],
  [dati.foto.piatti.every((f) => f.alt.length >= 10), 'Tutte le foto dei piatti hanno una descrizione'],
];

const riga = (p) => `| ${p.frase} | ${p.priorita} | ${p.origine} |`;
const report = `# SEO: ${dati.attivita.nome}

Generato il ${new Date().toLocaleDateString('it-IT')}. Le priorità indicano quanto la ricerca è vicina alla decisione di andare nel locale, non il volume di ricerca.

## Da usare nei testi

Parole chiave principali, da incollare nel prompt dei testi (docs/prompt-testi.md):

${principali.map((p) => `- ${p.frase}`).join('\n')}

Per salvarle nel sito, aggiungi in dati.json:

\`\`\`json
"seo": { "parole_chiave": ${JSON.stringify(principali.map((p) => p.frase))} }
\`\`\`

## Titolo e descrizione per Google

- **Titolo:** ${titolo}
- **Descrizione:** ${descrizione}

## Controlli

${controlli.map(([ok, testo]) => `- ${ok ? '✅' : '⚠️'} ${testo}`).join('\n')}

## Tutte le parole chiave in italiano

| Ricerca | Priorità | Da dove arriva |
|---|---|---|
${it.map(riga).join('\n')}

## Per i turisti (inglese)

| Ricerca | Priorità | Da dove arriva |
|---|---|---|
${en.map(riga).join('\n') || '| (nessuna) | | |'}

## Scheda Google Business

Categorie suggerite (da verificare nell'elenco di Google): ${categorieGoogle.join(', ') || 'nessuna, scegline una a mano'}

Ricorda: su Google il posizionamento locale dipende soprattutto da scheda Google completa, recensioni e dati identici ovunque (nome, indirizzo, telefono). Il sito aiuta, la scheda conta di più.
`;

const cartella = path.join(RADICE, 'report', nome);
await mkdir(cartella, { recursive: true });
await writeFile(path.join(cartella, 'seo.md'), report);

console.log(`\n✔ Report SEO di "${dati.attivita.nome}": report/${nome}/seo.md\n`);
console.log('Parole chiave principali:');
principali.forEach((p) => console.log(`  • ${p.frase}`));
const problemi = controlli.filter(([ok]) => !ok);
if (problemi.length) {
  console.log('\n⚠ Da migliorare:');
  problemi.forEach(([, t]) => console.log(`  • ${t}`));
}
console.log('');
