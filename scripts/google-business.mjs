#!/usr/bin/env node
// Scheda Google Business pronta da copiare: tutti i campi già formattati,
// con un pulsante "Copia" accanto a ognuno, più le foto già esportate.
// Uso: npm run google -- <cartella-cliente>
// Risultato: report/<cartella-cliente>/scheda-google.html (si apre con doppio clic)
import { writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { RADICE, caricaCliente, leggiJson } from '../lib/cliente.mjs';
import { paroleChiave } from '../lib/seo.mjs';
import { esc, linkWhatsApp, formattaPrezzo } from '../lib/util.mjs';

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_PATH ?? 'sharp');

const GIORNI = [
  ['lun', 'Lunedì'],
  ['mar', 'Martedì'],
  ['mer', 'Mercoledì'],
  ['gio', 'Giovedì'],
  ['ven', 'Venerdì'],
  ['sab', 'Sabato'],
  ['dom', 'Domenica'],
];
const LIMITE_DESCRIZIONE = 750;

const nome = process.argv[2];
const { dati, cartellaFoto } = await caricaCliente(nome);
const db = await leggiJson(path.join(RADICE, 'seo', 'parole-chiave.json'), 'il database delle parole chiave');
const { categorieGoogle } = paroleChiave(dati, db);
const { attivita, contatti, orari, menu, legale } = dati;
const ind = contatti.indirizzo;
const urlSito = dati.sito?.dominio ? `https://${dati.sito.dominio}` : '';

// ---------- descrizione ----------
function descrizioneAutomatica() {
  let testo = attivita.chi_siamo.join(' ');
  if ((attivita.servizi ?? []).length) testo += ` Servizi: ${attivita.servizi.join(', ').toLowerCase()}.`;
  if (testo.length <= LIMITE_DESCRIZIONE) return testo;
  const tagliato = testo.slice(0, LIMITE_DESCRIZIONE);
  return tagliato.slice(0, tagliato.lastIndexOf('.') + 1) || tagliato;
}
const descrizione = dati.google?.descrizione ?? descrizioneAutomatica();

// ---------- foto esportate per Google (JPG, lato lungo 2000px, sotto i 5 MB) ----------
const cartellaReport = path.join(RADICE, 'report', nome);
const cartellaFotoGoogle = path.join(cartellaReport, 'foto-google');
await rm(cartellaFotoGoogle, { recursive: true, force: true });
await mkdir(cartellaFotoGoogle, { recursive: true });

const daEsportare = [];
if (dati.foto.logo) daEsportare.push({ sorgente: dati.foto.logo, nome: '01-logo', dove: 'Logo', quadrata: true });
daEsportare.push({ sorgente: dati.foto.copertina.file, nome: '02-copertina', dove: 'Foto di copertina' });
dati.foto.sala.forEach((f, i) => daEsportare.push({ sorgente: f.file, nome: `03-interno-${i + 1}`, dove: 'Foto > Interno' }));
dati.foto.piatti.forEach((f, i) => daEsportare.push({ sorgente: f.file, nome: `04-cibo-${i + 1}`, dove: 'Foto > Cibo e bevande' }));
if (dati.foto.team) daEsportare.push({ sorgente: dati.foto.team.file, nome: '05-team', dove: 'Foto > Team' });

for (const f of daEsportare) {
  const immagine = sharp(path.join(cartellaFoto, f.sorgente), { failOn: 'none' }).rotate();
  const lavorata = f.quadrata
    ? immagine.resize(1080, 1080, { fit: 'contain', background: '#ffffff' })
    : immagine.resize(2000, 2000, { fit: 'inside', withoutEnlargement: true });
  await lavorata.flatten({ background: '#ffffff' }).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(cartellaFotoGoogle, `${f.nome}.jpg`));
}

// ---------- campi ----------
const orariTesto = GIORNI.map(([k, n]) => {
  const fasce = orari[k] ?? [];
  return `${n}: ${fasce.length ? fasce.map(([a, c]) => `${a}–${c}`).join(', ') : 'chiuso'}`;
}).join('\n');

const menuTesto = menu.categorie
  .map((c) => `${c.nome}\n${c.piatti.map((p) => `  ${p.nome}, ${formattaPrezzo(p.prezzo)}${p.descrizione ? `\n    ${p.descrizione}` : ''}`).join('\n')}`)
  .join('\n\n');

const attributi = [...(attivita.servizi ?? [])];
const tagMenu = new Set(menu.categorie.flatMap((c) => c.piatti.flatMap((p) => p.tag ?? [])));
if (tagMenu.has('vegetariano') && !attributi.some((a) => /vegetarian/i.test(a))) attributi.push('Opzioni vegetariane');
if (tagMenu.has('vegano') && !attributi.some((a) => /vegan/i.test(a))) attributi.push('Opzioni vegane');
if (tagMenu.has('senza glutine') && !attributi.some((a) => /glutine/i.test(a))) attributi.push('Opzioni senza glutine');

const categoriaPrincipale = dati.google?.categoria_principale ?? categorieGoogle[0] ?? attivita.tipo;
const secondarie = dati.google?.categorie_secondarie ?? categorieGoogle.filter((c) => c !== categoriaPrincipale);

const primoPost = `${attivita.slogan}\n\n${contatti.whatsapp ? 'Prenota il tuo tavolo su WhatsApp.' : `Prenota al ${contatti.telefono}.`}`;

const campi = [
  { sezione: 'Informazioni di base', voci: [
    ['Nome dell\'attività', attivita.nome, 'Solo il nome reale, senza aggiungere città o parole chiave: Google lo vieta e può sospendere la scheda.'],
    ['Categoria principale', categoriaPrincipale, 'Suggerita: cercala nell\'elenco di Google e scegli la voce più vicina.'],
    ['Categorie aggiuntive', secondarie.join('\n'), secondarie.length ? '' : 'Nessuna suggerita.'],
    ['Data di apertura', attivita.anno_apertura ? String(attivita.anno_apertura) : '', ''],
  ]},
  { sezione: 'Contatti e posizione', voci: [
    ['Indirizzo', ind.via, ''],
    ['CAP', ind.cap ?? '', ''],
    ['Città', ind.citta, ''],
    ['Provincia', ind.provincia ?? '', ''],
    ['Telefono principale', contatti.telefono, 'Deve essere identico a quello sul sito.'],
    ['Sito web', urlSito, urlSito ? '' : 'Da inserire quando il sito è online con il dominio definitivo.'],
    ['Link al menu', urlSito ? `${urlSito}/#menu` : '', ''],
    ['Link per prenotare', contatti.whatsapp ? linkWhatsApp(contatti.whatsapp, contatti.messaggio_whatsapp ?? 'Ciao, vorrei prenotare un tavolo') : '', 'Nella sezione "Prenotazioni" o "Link per gli ordini".'],
  ]},
  { sezione: 'Orari', voci: [
    ['Orari di apertura', orariTesto, 'Inseriscili giorno per giorno. Per pranzo e cena usa "Aggiungi orari".'],
    ['Orari speciali', orari.note ?? '', orari.note ? 'Inseriscili come "Orari speciali" sulle date di chiusura.' : ''],
  ]},
  { sezione: 'Descrizione e servizi', voci: [
    ['Descrizione', descrizione, `${descrizione.length} caratteri su ${LIMITE_DESCRIZIONE}. Niente link, prezzi o promozioni.`],
    ['Attributi da spuntare', attributi.join('\n'), 'Cercali nella sezione "Altro" o "Attributi".'],
  ]},
  { sezione: 'Menu', voci: [
    ['Menu (per l\'editor menu di Google)', menuTesto, 'Google lo mostra direttamente nella scheda. In alternativa basta il link al menu.'],
  ]},
  { sezione: 'Social e primo post', voci: [
    ['Instagram', contatti.social?.instagram ?? '', ''],
    ['Facebook', contatti.social?.facebook ?? '', ''],
    ['Testo del primo post', primoPost, 'Pubblicalo come "Aggiornamento" con la foto di copertina.'],
  ]},
].map((s) => ({ ...s, voci: s.voci.filter(([, valore]) => valore) }));

// ---------- pagina ----------
const blocco = ([etichetta, valore, nota], id) => `
<div class="campo">
  <div class="campo-testa">
    <label for="c${id}">${esc(etichetta)}</label>
    <button type="button" data-copia="c${id}">Copia</button>
  </div>
  ${valore.includes('\n') || valore.length > 90
    ? `<textarea id="c${id}" rows="${Math.min(14, valore.split('\n').length + Math.ceil(valore.length / 90))}" readonly>${esc(valore)}</textarea>`
    : `<input id="c${id}" value="${esc(valore)}" readonly>`}
  ${nota ? `<p class="nota">${esc(nota)}</p>` : ''}
</div>`;

let contatore = 0;
const sezioniHtml = campi
  .map((s) => `<section><h2>${esc(s.sezione)}</h2>${s.voci.map((v) => blocco(v, contatore++)).join('')}</section>`)
  .join('\n');

const fotoHtml = daEsportare.map((f) => `<li><code>foto-google/${f.nome}.jpg</code>: ${esc(f.dove)}</li>`).join('');

const pagina = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Scheda Google: ${esc(attivita.nome)}</title>
<style>
:root{--sfondo:#f4f5f2;--carta:#fff;--testo:#1d211e;--tenue:#5c625d;--linea:#d9ddd5;--accento:#2f5d50}
@media (prefers-color-scheme:dark){:root{--sfondo:#161a18;--carta:#1f2421;--testo:#e9ece8;--tenue:#a3aaa4;--linea:#343b37;--accento:#7fc2ad}}
*{box-sizing:border-box}
body{margin:0;background:var(--sfondo);color:var(--testo);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:46rem;margin:0 auto;padding:2rem 1rem 4rem}
h1{font-size:1.8rem;line-height:1.2;margin:0 0 .4rem}
h2{font-size:1.15rem;margin:2.2rem 0 .8rem}
.intro{color:var(--tenue)}
ol{padding-left:1.25rem}
section{margin-top:1rem}
.campo{background:var(--carta);border:1px solid var(--linea);border-radius:10px;padding:.85rem 1rem;margin-bottom:.6rem}
.campo-testa{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:.4rem}
label{font-weight:600}
input,textarea{width:100%;font:inherit;color:inherit;background:transparent;border:1px solid var(--linea);border-radius:6px;padding:.5rem .6rem;resize:vertical}
button{font:inherit;font-weight:600;font-size:.9rem;padding:.35rem .9rem;border-radius:6px;border:1px solid var(--accento);background:var(--accento);color:var(--carta);cursor:pointer;min-height:2.25rem}
button.fatto{background:transparent;color:var(--accento)}
button:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid var(--accento);outline-offset:2px}
.nota{margin:.45rem 0 0;font-size:.88rem;color:var(--tenue)}
code{font-size:.9em}
</style>
</head>
<body>
<main>
<h1>Scheda Google: ${esc(attivita.nome)}</h1>
<p class="intro">Tutto pronto da copiare nella scheda Google Business. Generata il ${new Date().toLocaleDateString('it-IT')} dai dati del sito, quindi nome, indirizzo e telefono coincidono ovunque.</p>

<h2>Come procedere</h2>
<ol>
  <li>Accedi a <strong>business.google.com</strong> con l'account Google del titolare (la scheda deve essere sua, non nostra).</li>
  <li>Cerca il locale: se la scheda esiste già, richiedine la proprietà; se non esiste, scegli "Aggiungi la tua attività".</li>
  <li>Compila i campi qui sotto nell'ordine, con il pulsante Copia.</li>
  <li>Completa la verifica che chiede Google (di solito un video del locale, una telefonata o una cartolina): la fa il titolare.</li>
  <li>Carica le foto della cartella <code>foto-google</code> e pubblica il primo post.</li>
  <li>Invita i primi clienti soddisfatti a lasciare una recensione: è il fattore che conta di più.</li>
</ol>

${sezioniHtml}

<section>
<h2>Foto da caricare</h2>
<p class="intro">Già esportate in JPG nella cartella <code>foto-google</code>, accanto a questo file.</p>
<ul>${fotoHtml}</ul>
</section>

<p class="intro">Intestatario: ${esc(legale.ragione_sociale)}, P. IVA ${esc(legale.piva)}</p>
</main>
<script>
document.addEventListener('click', async function (e) {
  var pulsante = e.target.closest('[data-copia]');
  if (!pulsante) return;
  var campo = document.getElementById(pulsante.getAttribute('data-copia'));
  try { await navigator.clipboard.writeText(campo.value); }
  catch (err) { campo.select(); document.execCommand('copy'); }
  pulsante.textContent = 'Copiato';
  pulsante.classList.add('fatto');
  setTimeout(function () { pulsante.textContent = 'Copia'; pulsante.classList.remove('fatto'); }, 1600);
});
</script>
</body>
</html>`;

await writeFile(path.join(cartellaReport, 'scheda-google.html'), pagina);
console.log(`\n✔ Scheda Google di "${attivita.nome}": report/${nome}/scheda-google.html`);
console.log(`  ${daEsportare.length} foto esportate in report/${nome}/foto-google/`);
if (descrizione.length > LIMITE_DESCRIZIONE) console.log(`\n⚠ Descrizione troppo lunga: ${descrizione.length} caratteri su ${LIMITE_DESCRIZIONE}`);
console.log('');
