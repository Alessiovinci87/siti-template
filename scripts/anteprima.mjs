#!/usr/bin/env node
// Piccolo server locale per vedere un sito generato.
// Uso: npm run anteprima -- <cartella-cliente>   (poi apri http://localhost:4321)
// Per vederlo dal telefono sulla stessa rete Wi-Fi: http://<IP-del-PC>:4321
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cliente = process.argv[2];
const porta = Number(process.env.PORT ?? 4321);

if (!cliente) {
  console.error('Uso: npm run anteprima -- <cartella-cliente>');
  process.exit(1);
}

const cartella = path.join(RADICE, 'dist', cliente);
const TIPI = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

createServer(async (richiesta, risposta) => {
  try {
    let percorso = decodeURIComponent(new URL(richiesta.url, 'http://x').pathname);
    let file = path.normalize(path.join(cartella, percorso));
    if (!file.startsWith(cartella)) throw new Error('fuori cartella');
    if ((await stat(file).catch(() => null))?.isDirectory()) file = path.join(file, 'index.html');
    const contenuto = await readFile(file);
    risposta.writeHead(200, { 'Content-Type': TIPI[path.extname(file)] ?? 'application/octet-stream' });
    risposta.end(contenuto);
  } catch {
    risposta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    risposta.end('Pagina non trovata');
  }
}).listen(porta, '0.0.0.0', () => {
  const ip = Object.values(networkInterfaces())
    .flat()
    .find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
  console.log(`\nAnteprima di "${cliente}":`);
  console.log(`  Sul PC:       http://localhost:${porta}`);
  if (ip) console.log(`  Dal telefono: http://${ip}:${porta}  (stessa rete Wi-Fi)`);
  console.log('\nPremi Ctrl+C per fermare.\n');
});
