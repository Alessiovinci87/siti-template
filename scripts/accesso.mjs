#!/usr/bin/env node
// Crea (o rinnova) il link personale con cui il cliente modifica il suo sito.
// Rinnovarlo invalida il link precedente: utile se il cliente lo perde o cambia personale.
//
// Uso: npm run accesso -- <cartella-cliente>
// Richiede il file .env.locale (vedi .env.esempio) con l'URL di Supabase e la chiave di servizio.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import path from 'node:path';
import { RADICE, caricaCliente, esci } from '../lib/cliente.mjs';

async function leggiEnv() {
  const file = path.join(RADICE, '.env.locale');
  if (!existsSync(file)) esci('Manca il file .env.locale: copia .env.esempio, rinominalo .env.locale e compila i due valori.');
  const righe = (await readFile(file, 'utf8')).split(/\r?\n/);
  const env = {};
  for (const riga of righe) {
    const m = riga.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) esci('In .env.locale servono SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  return env;
}

const nome = process.argv[2];
const { dati } = await caricaCliente(nome);
if (!dati.gestione?.attiva) esci(`La gestione non è attiva per "${nome}". In dati.json aggiungi: "gestione": { "attiva": true }`);

const env = await leggiEnv();
const codice = randomBytes(24).toString('base64url');
const impronta = createHash('sha256').update(codice).digest('hex');

const risposta = await fetch(`${env.SUPABASE_URL}/rest/v1/siti?on_conflict=id`, {
  method: 'POST',
  headers: {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal',
  },
  body: JSON.stringify({ id: nome, nome: dati.attivita.nome, codice_hash: impronta }),
});
if (!risposta.ok) esci(`Supabase ha risposto ${risposta.status}: ${await risposta.text()}`);

const base = dati.sito?.dominio ? `https://${dati.sito.dominio}` : '<indirizzo-anteprima>';
const link = `${base}/gestione/#${codice}`;
const cartella = path.join(RADICE, 'report', nome);
await mkdir(cartella, { recursive: true });
await writeFile(
  path.join(cartella, 'accesso.txt'),
  `Link di gestione per ${dati.attivita.nome}\nCreato il ${new Date().toLocaleString('it-IT')}\n\n${link}\n\nIl link precedente non funziona più.\n`
);

console.log(`\n✔ Link di gestione per "${dati.attivita.nome}":\n\n  ${link}\n`);
console.log('Mandalo solo al titolare e digli di salvarlo nei preferiti del telefono.');
console.log(`Copia salvata in report/${nome}/accesso.txt (non va su GitHub).\n`);
