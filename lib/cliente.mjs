// Caricamento e controllo dei dati di un cliente, condiviso dagli script.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { valida } from './valida.mjs';

export const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function esci(messaggio) {
  console.error(`\n✖ ${messaggio}\n`);
  process.exit(1);
}

export async function leggiJson(percorso, descrizione) {
  if (!existsSync(percorso)) esci(`Non trovo ${descrizione}: ${path.relative(RADICE, percorso)}`);
  try {
    return JSON.parse(await readFile(percorso, 'utf8'));
  } catch (errore) {
    esci(`${descrizione} non è un JSON valido (${path.relative(RADICE, percorso)}):\n  ${errore.message}`);
  }
}

/** Legge e controlla dati.json del cliente. Si ferma con un messaggio chiaro se c'è qualcosa che non va. */
export async function caricaCliente(nome) {
  if (!nome) esci('Indica la cartella del cliente. Esempio: demo-trattoria');
  const cartella = path.join(RADICE, 'clienti', nome);
  const dati = await leggiJson(path.join(cartella, 'dati.json'), 'il file dati del cliente');
  const cartellaTemplate = path.join(RADICE, 'templates', String(dati.template));
  if (!existsSync(cartellaTemplate)) esci(`Template "${dati.template}" non trovato in templates/`);
  const schema = await leggiJson(path.join(cartellaTemplate, 'schema.json'), 'lo schema del template');
  const errori = valida(dati, schema);
  if (errori.length) {
    esci(`Il file dati ha ${errori.length} problem${errori.length === 1 ? 'a' : 'i'} da sistemare:\n${errori.map((e) => `  • ${e}`).join('\n')}`);
  }
  return { dati, cartella, cartellaFoto: path.join(cartella, 'foto'), cartellaTemplate, schema };
}
