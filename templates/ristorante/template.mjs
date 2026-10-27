// Template "Ristorante / Bar".
// Riceve i dati validati del cliente e le foto già ottimizzate,
// e restituisce le pagine HTML del sito.
import {
  esc,
  linkTelefono,
  linkWhatsApp,
  linkMappa,
  indirizzoInRiga,
  formattaPrezzo,
  slug,
  html,
} from '../../lib/util.mjs';
import { icone } from './icone.mjs';
import { titoloPagina } from '../../lib/seo.mjs';

export const GIORNI = [
  { chiave: 'lun', nome: 'Lunedì', schema: 'Monday' },
  { chiave: 'mar', nome: 'Martedì', schema: 'Tuesday' },
  { chiave: 'mer', nome: 'Mercoledì', schema: 'Wednesday' },
  { chiave: 'gio', nome: 'Giovedì', schema: 'Thursday' },
  { chiave: 'ven', nome: 'Venerdì', schema: 'Friday' },
  { chiave: 'sab', nome: 'Sabato', schema: 'Saturday' },
  { chiave: 'dom', nome: 'Domenica', schema: 'Sunday' },
];

/** Font e colori di ogni variante di stile. */
export const VARIANTI = {
  terra: {
    coloreTema: '#4b5d3a',
    font: [
      { famiglia: 'Young Serif', pacchetto: '@fontsource/young-serif', peso: '400', precarica: true },
      { famiglia: 'Figtree Variable', pacchetto: '@fontsource-variable/figtree', peso: 'wght', intervallo: '300 900', precarica: true },
    ],
  },
  mare: {
    coloreTema: '#0f2c3d',
    font: [
      { famiglia: 'Bricolage Grotesque Variable', pacchetto: '@fontsource-variable/bricolage-grotesque', peso: 'wght', intervallo: '200 800', precarica: true },
      { famiglia: 'Figtree Variable', pacchetto: '@fontsource-variable/figtree', peso: 'wght', intervallo: '300 900', precarica: true },
    ],
  },
  notte: {
    coloreTema: '#23141a',
    font: [
      { famiglia: 'Cormorant Garamond', pacchetto: '@fontsource/cormorant-garamond', peso: '500', precarica: true },
      { famiglia: 'Figtree Variable', pacchetto: '@fontsource-variable/figtree', peso: 'wght', intervallo: '300 900', precarica: true },
    ],
  },
};

const TAG_ETICHETTE = {
  vegetariano: 'Vegetariano',
  vegano: 'Vegano',
  'senza glutine': 'Senza glutine',
  piccante: 'Piccante',
  'della casa': 'Della casa',
  stagionale: 'Di stagione',
};

/** Identificativo stabile di un piatto, usato dalle modifiche del cliente. */
export function idPiatto(categoria, piatto) {
  return `${slug(categoria.nome)}/${slug(piatto.nome)}`;
}

function gestioneAttiva(d, config) {
  return Boolean(d.gestione?.attiva && config.gestione?.url_supabase && config.gestione?.chiave_pubblica);
}

// ---------- pezzi riutilizzabili ----------

function immagine(foto, { classe = '', sizes = '100vw', caricamento = 'lazy', priorita = false } = {}) {
  if (!foto) return '';
  return `<img class="${classe}" src="${foto.src}" srcset="${foto.srcset}" sizes="${sizes}" width="${foto.width}" height="${foto.height}" alt="${esc(foto.alt)}" loading="${caricamento}" decoding="async"${priorita ? ' fetchpriority="high"' : ''}>`;
}

function fasciaOraria([apre, chiude]) {
  return `${apre}–${chiude}`;
}

function righeOrari(orari) {
  return GIORNI.map(({ chiave, nome }) => {
    const fasce = orari[chiave] ?? [];
    const testo = fasce.length
      ? fasce.map((f) => `<span class="fascia">${fasciaOraria(f)}</span>`).join('<span class="visivamente-nascosto">, </span>')
      : 'Chiuso';
    return `<tr data-giorno="${chiave}"${fasce.length ? '' : ' class="chiuso"'}><th scope="row">${nome}</th><td>${testo}</td></tr>`;
  }).join('\n');
}

function datiStrutturati(d, risorse, urlSito) {
  const { attivita, contatti, orari } = d;
  const specifiche = [];
  for (const { chiave, schema } of GIORNI) {
    for (const [apre, chiude] of orari[chiave] ?? []) {
      specifiche.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: schema, opens: apre, closes: chiude });
    }
  }
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: attivita.nome,
    description: attivita.descrizione_breve,
    servesCuisine: attivita.cucina || undefined,
    telephone: contatti.telefono,
    email: contatti.email || undefined,
    url: urlSito || undefined,
    image: risorse.condivisione && urlSito ? `${urlSito}/${risorse.condivisione}` : undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: contatti.indirizzo.via,
      postalCode: contatti.indirizzo.cap,
      addressLocality: contatti.indirizzo.citta,
      addressRegion: contatti.indirizzo.provincia,
      addressCountry: 'IT',
    },
    openingHoursSpecification: specifiche,
    hasMenu: urlSito ? `${urlSito}/#menu` : undefined,
    sameAs: Object.values(contatti.social ?? {}).filter(Boolean),
  };
  // JSON-LD dentro <script>: neutralizza "</" per sicurezza.
  return JSON.stringify(json).replaceAll('</', '<\\/');
}

function testa({ d, risorse, config, titolo, descrizione, percorsoRadice = '', urlPagina, indicizza = true }) {
  const variante = VARIANTI[d.stile.variante];
  const urlSito = d.sito?.dominio ? `https://${d.sito.dominio}` : '';
  const precarica = risorse.font.precarica
    .map((f) => `<link rel="preload" href="${percorsoRadice}${f}" as="font" type="font/woff2" crossorigin>`)
    .join('\n');
  return `<!doctype html>
<html lang="it" data-variante="${d.stile.variante}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(titolo)}</title>
<meta name="description" content="${esc(descrizione)}">
${!indicizza || config.anteprima ? '<meta name="robots" content="noindex, nofollow">' : ''}
<meta name="theme-color" content="${variante.coloreTema}">
${urlPagina ? `<link rel="canonical" href="${urlPagina}">` : ''}
<meta property="og:type" content="website">
<meta property="og:locale" content="it_IT">
<meta property="og:title" content="${esc(titolo)}">
<meta property="og:description" content="${esc(descrizione)}">
${risorse.condivisione ? `<meta property="og:image" content="${urlSito ? `${urlSito}/` : percorsoRadice}${risorse.condivisione}">` : ''}
${urlPagina ? `<meta property="og:url" content="${urlPagina}">` : ''}
<link rel="icon" href="${percorsoRadice}favicon.png" type="image/png">
<link rel="apple-touch-icon" href="${percorsoRadice}apple-touch-icon.png">
${precarica}
<link rel="stylesheet" href="${percorsoRadice}stile.css?v=${risorse.versione}">
</head>`;
}

function marchio(d, risorse, percorsoRadice = '') {
  const nome = esc(d.attivita.nome);
  if (risorse.logo) {
    const dim = risorse.logo.width ? ` width="${risorse.logo.width}" height="${risorse.logo.height}"` : '';
    return `<a class="marchio" href="${percorsoRadice || './'}"><img class="marchio-logo" src="${percorsoRadice}${risorse.logo.src}" alt="${nome}"${dim}></a>`;
  }
  return `<a class="marchio" href="${percorsoRadice || './'}"><span class="marchio-nome">${nome}</span></a>`;
}

function intestazione(d, risorse, { percorsoRadice = '', conNavigazione = true } = {}) {
  const wa = d.contatti.whatsapp;
  const azione = wa
    ? `<a class="pulsante pulsante-piccolo" href="${linkWhatsApp(wa, d.contatti.messaggio_whatsapp ?? 'Ciao, vorrei prenotare un tavolo')}" rel="noopener">${icone.prenota}<span>Prenota</span></a>`
    : `<a class="pulsante pulsante-piccolo" href="${linkTelefono(d.contatti.telefono)}">${icone.telefono}<span>Chiama</span></a>`;
  const nav = conNavigazione
    ? `<nav class="nav" aria-label="Sezioni del sito">
  <a href="#menu">Menu</a>
  <a href="#chi-siamo">Chi siamo</a>
  <a href="#orari">Orari e indirizzo</a>
</nav>`
    : `<nav class="nav nav-sempre" aria-label="Navigazione"><a href="${percorsoRadice}">Torna al sito</a></nav>`;
  return `<header class="intestazione">
<div class="contenitore intestazione-riga">
${marchio(d, risorse, percorsoRadice)}
${nav}
${conNavigazione ? azione : ''}
</div>
</header>`;
}

function piede(d, config, percorsoRadice = '') {
  const { legale, contatti, attivita } = d;
  const social = Object.entries(contatti.social ?? {})
    .filter(([, url]) => url)
    .map(([rete, url]) => {
      const etichette = { instagram: 'Instagram', facebook: 'Facebook', tripadvisor: 'Tripadvisor', thefork: 'TheFork' };
      const icona = icone[rete] ?? icone.stella;
      return `<li><a href="${esc(url)}" rel="noopener" target="_blank">${icona}<span>${etichette[rete]}</span></a></li>`;
    })
    .join('');
  const credito =
    config.brand?.mostra_credito && config.brand?.nome
      ? `<p class="piede-credito">Sito realizzato da ${config.brand.sito ? `<a href="${esc(config.brand.sito)}" rel="noopener">${esc(config.brand.nome)}</a>` : esc(config.brand.nome)}</p>`
      : '';
  return `<footer class="piede">
<div class="contenitore piede-griglia">
  <div>
    <p class="piede-nome">${esc(attivita.nome)}</p>
    <p>${esc(indirizzoInRiga(contatti.indirizzo))}</p>
    <p><a href="${linkTelefono(contatti.telefono)}">${esc(contatti.telefono)}</a>${contatti.email ? `<br><a href="mailto:${esc(contatti.email)}">${esc(contatti.email)}</a>` : ''}</p>
  </div>
  ${social ? `<ul class="piede-social" aria-label="Profili social">${social}</ul>` : '<div></div>'}
  <div class="piede-legale">
    <p>${esc(legale.ragione_sociale)}${legale.sede_legale ? `, ${esc(legale.sede_legale)}` : ''}<br>P. IVA ${esc(legale.piva)}</p>
    <p><a href="${percorsoRadice}privacy/">Privacy policy</a></p>
    ${credito}
  </div>
</div>
</footer>`;
}

// ---------- sezioni della home ----------

function sezioneCopertina(d, risorse) {
  const { attivita, contatti } = d;
  const wa = contatti.whatsapp;
  const primario = wa
    ? `<a class="pulsante" href="${linkWhatsApp(wa, contatti.messaggio_whatsapp ?? 'Ciao, vorrei prenotare un tavolo')}" rel="noopener">${icone.messaggio}<span>Prenota su WhatsApp</span></a>`
    : `<a class="pulsante" href="${linkTelefono(contatti.telefono)}">${icone.telefono}<span>Chiama per prenotare</span></a>`;
  const sottotitolo = [attivita.tipo, attivita.cucina, contatti.indirizzo.citta].filter(Boolean).map(esc).join(', ');
  return `<section class="copertina" aria-labelledby="titolo-attivita">
${immagine(risorse.foto.copertina, { classe: 'copertina-foto', caricamento: 'eager', priorita: true })}
<div class="copertina-velo" aria-hidden="true"></div>
<div class="contenitore copertina-testo">
  <p class="copertina-tipo">${sottotitolo}</p>
  <h1 id="titolo-attivita" class="copertina-nome">${esc(attivita.nome)}</h1>
  <p class="copertina-slogan">${esc(attivita.slogan)}</p>
  <p class="stato" data-stato hidden><span class="stato-punto" aria-hidden="true"></span><span data-stato-testo></span></p>
  <div class="copertina-azioni">
    ${primario}
    <a class="pulsante pulsante-secondario" href="#menu"><span>Vedi il menu</span></a>
  </div>
</div>
</section>`;
}

function sezioneChiSiamo(d, risorse) {
  const { attivita } = d;
  const foto = risorse.foto.team ?? risorse.foto.sala[0];
  const servizi = (attivita.servizi ?? []).length
    ? `<ul class="servizi" aria-label="Servizi">${attivita.servizi.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`
    : '';
  const anno = attivita.anno_apertura ? `<p class="chi-siamo-anno">Dal ${attivita.anno_apertura}</p>` : '';
  return `<section id="chi-siamo" class="sezione chi-siamo" aria-labelledby="titolo-chi-siamo">
<div class="contenitore chi-siamo-griglia">
  <div class="chi-siamo-testo">
    ${anno}
    <h2 id="titolo-chi-siamo">Chi siamo</h2>
    ${attivita.chi_siamo.map((p) => `<p>${esc(p)}</p>`).join('\n')}
    ${servizi}
  </div>
  <figure class="chi-siamo-foto">
    ${immagine(foto, { sizes: '(min-width: 900px) 45vw, 100vw' })}
  </figure>
</div>
</section>`;
}

function sezioneMenu(d, conGestione = false) {
  const { menu } = d;
  const categorie = menu.categorie.map((c) => ({ ...c, id: `menu-${slug(c.nome)}` }));
  const indice =
    categorie.length > 1
      ? `<nav class="menu-indice" aria-label="Categorie del menu"><ul>${categorie
          .map((c) => `<li><a href="#${c.id}">${esc(c.nome)}</a></li>`)
          .join('')}</ul></nav>`
      : '';
  const blocchi = categorie
    .map((c) => {
      const piatti = c.piatti
        .map((p) => {
          const tag = (p.tag ?? []).length
            ? `<ul class="piatto-tag">${p.tag.map((t) => `<li>${esc(TAG_ETICHETTE[t] ?? t)}</li>`).join('')}</ul>`
            : '';
          return `<li class="piatto" data-piatto="${idPiatto(c, p)}">
  <p class="piatto-riga"><span class="piatto-nome">${esc(p.nome)}</span><span class="piatto-puntini" aria-hidden="true"></span><span class="piatto-prezzo" data-prezzo>${esc(formattaPrezzo(p.prezzo))}</span></p>
  ${p.descrizione ? `<p class="piatto-descrizione">${esc(p.descrizione)}</p>` : ''}
  ${tag}
</li>`;
        })
        .join('\n');
      return `<section class="menu-categoria" id="${c.id}" aria-labelledby="${c.id}-titolo">
  <h3 id="${c.id}-titolo">${esc(c.nome)}</h3>
  <ul class="piatti">${piatti}</ul>
</section>`;
    })
    .join('\n');
  const note = [menu.coperto ? `Coperto: ${esc(menu.coperto)}` : '', menu.nota_allergeni ? esc(menu.nota_allergeni) : '']
    .filter(Boolean)
    .map((n) => `<p>${n}</p>`)
    .join('');
  return `<section id="menu" class="sezione menu" aria-labelledby="titolo-menu">
<div class="contenitore">
  <div class="menu-testa">
    <h2 id="titolo-menu">Il menu</h2>
    ${menu.intro ? `<p class="menu-intro">${esc(menu.intro)}</p>` : ''}
  </div>
  ${conGestione ? `<aside class="piatto-giorno" data-piatto-giorno hidden aria-label="Piatto del giorno">
    <p class="piatto-giorno-etichetta">Piatto del giorno</p>
    <p class="piatto-riga"><span class="piatto-nome" data-pg-nome></span><span class="piatto-puntini" aria-hidden="true"></span><span class="piatto-prezzo" data-pg-prezzo></span></p>
    <p class="piatto-descrizione" data-pg-descrizione></p>
  </aside>` : ''}
  ${indice}
  <div class="menu-carta">
    ${blocchi}
  </div>
  ${note ? `<div class="menu-note">${note}</div>` : ''}
</div>
</section>`;
}

function sezioneGalleria(d, risorse) {
  const foto = [...risorse.foto.piatti, ...risorse.foto.sala.slice(risorse.foto.team ? 0 : 1)];
  const elementi = foto
    .map(
      (f) =>
        `<li class="galleria-elemento">${immagine(f, { sizes: '(min-width: 640px) 33vw, 50vw' })}</li>`
    )
    .join('\n');
  return `<section class="sezione galleria" aria-labelledby="titolo-galleria">
<div class="contenitore">
  <h2 id="titolo-galleria">I nostri piatti e la sala</h2>
  <ul class="galleria-griglia">${elementi}</ul>
</div>
</section>`;
}

function sezioneOrariDove(d) {
  const { orari, contatti } = d;
  const indirizzo = contatti.indirizzo;
  const datiOrari = esc(JSON.stringify(Object.fromEntries(GIORNI.map(({ chiave }) => [chiave, orari[chiave] ?? []]))));
  return `<section id="orari" class="sezione orari" aria-labelledby="titolo-orari">
<div class="contenitore orari-griglia">
  <div class="orari-tabella-box">
    <h2 id="titolo-orari">Orari</h2>
    <table class="orari-tabella" data-orari="${datiOrari}">
      <caption class="visivamente-nascosto">Orari di apertura settimanali</caption>
      <tbody>
${righeOrari(orari)}
      </tbody>
    </table>
    ${orari.note ? `<p class="orari-note">${esc(orari.note)}</p>` : ''}
  </div>
  <div class="dove">
    <h2>Dove siamo</h2>
    <address class="dove-indirizzo">
      <p>${esc(indirizzo.via)}<br>${esc([indirizzo.cap, indirizzo.citta].filter(Boolean).join(' '))}${indirizzo.provincia ? ` (${esc(indirizzo.provincia)})` : ''}</p>
      ${indirizzo.indicazioni ? `<p class="dove-indicazioni">${esc(indirizzo.indicazioni)}</p>` : ''}
    </address>
    <div class="dove-azioni">
      <a class="pulsante" href="${esc(linkMappa(indirizzo))}" rel="noopener" target="_blank">${icone.luogo}<span>Apri in Google Maps</span></a>
      <a class="pulsante pulsante-secondario" href="${linkTelefono(contatti.telefono)}">${icone.telefono}<span>${esc(contatti.telefono)}</span></a>
    </div>
  </div>
</div>
</section>`;
}

function barraAzioni(d) {
  const { contatti } = d;
  const voci = [
    `<a href="${linkTelefono(contatti.telefono)}">${icone.telefono}<span>Chiama</span></a>`,
    contatti.whatsapp
      ? `<a href="${linkWhatsApp(contatti.whatsapp, contatti.messaggio_whatsapp ?? 'Ciao, vorrei prenotare un tavolo')}" rel="noopener">${icone.messaggio}<span>WhatsApp</span></a>`
      : '',
    `<a href="${esc(linkMappa(contatti.indirizzo))}" rel="noopener" target="_blank">${icone.luogo}<span>Indicazioni</span></a>`,
    `<a href="#menu">${icone.prenota}<span>Menu</span></a>`,
  ].filter(Boolean);
  return `<nav class="barra-azioni" aria-label="Azioni rapide">${voci.join('')}</nav>`;
}

// ---------- pagine ----------

function attributiGestione(d, risorse, config) {
  if (!gestioneAttiva(d, config)) return '';
  const g = config.gestione;
  return ` data-sito="${esc(risorse.idSito)}" data-gestione-url="${esc(g.url_supabase.replace(/\/$/, ''))}" data-gestione-chiave="${esc(g.chiave_pubblica)}"`;
}

function paginaHome(d, risorse, config) {
  const urlSito = d.sito?.dominio ? `https://${d.sito.dominio}` : '';
  const titolo = titoloPagina(d);
  return html([
    testa({ d, risorse, config, titolo, descrizione: d.attivita.descrizione_breve, urlPagina: urlSito ? `${urlSito}/` : '' }),
    `<body${attributiGestione(d, risorse, config)}>`,
    '<a class="salta" href="#contenuto">Vai al contenuto</a>',
    intestazione(d, risorse),
    gestioneAttiva(d, config)
      ? '<div class="avviso" data-avviso hidden role="status"><div class="contenitore"><p data-avviso-testo></p></div></div>'
      : '',
    '<main id="contenuto">',
    sezioneCopertina(d, risorse),
    sezioneMenu(d, gestioneAttiva(d, config)),
    sezioneChiSiamo(d, risorse),
    sezioneGalleria(d, risorse),
    sezioneOrariDove(d),
    '</main>',
    piede(d, config),
    barraAzioni(d),
    `<script type="application/ld+json">${datiStrutturati(d, risorse, urlSito)}</script>`,
    `<script src="script.js?v=${risorse.versione}" defer></script>`,
    '</body>',
    '</html>',
  ]);
}

function paginaPrivacy(d, risorse, config, testoPrivacy) {
  const urlSito = d.sito?.dominio ? `https://${d.sito.dominio}` : '';
  return html([
    testa({
      d,
      risorse,
      config,
      titolo: `Privacy policy, ${d.attivita.nome}`,
      descrizione: `Informativa sul trattamento dei dati personali del sito di ${d.attivita.nome}.`,
      percorsoRadice: '../',
      urlPagina: urlSito ? `${urlSito}/privacy/` : '',
      indicizza: false,
    }),
    '<body>',
    '<a class="salta" href="#contenuto">Vai al contenuto</a>',
    intestazione(d, risorse, { percorsoRadice: '../', conNavigazione: false }),
    `<main id="contenuto" class="sezione pagina-testo"><div class="contenitore contenitore-stretto">${testoPrivacy}</div></main>`,
    piede(d, config, '../'),
    '</body>',
    '</html>',
  ]);
}

function paginaGestione(d, risorse, config) {
  const g = config.gestione;
  const menu = d.menu.categorie.map((c) => ({
    nome: c.nome,
    piatti: c.piatti.map((p) => ({ id: idPiatto(c, p), nome: p.nome, prezzo: formattaPrezzo(p.prezzo) })),
  }));
  const datiMenu = JSON.stringify(menu).replaceAll('</', '<\\/');
  return html([
    testa({
      d,
      risorse,
      config: { ...config, anteprima: true },
      titolo: `Gestione, ${d.attivita.nome}`,
      descrizione: 'Pannello di gestione riservato al titolare.',
      percorsoRadice: '../',
      indicizza: false,
    }),
    `<body class="gestione" data-sito="${esc(risorse.idSito)}" data-funzione="${esc(g.url_supabase.replace(/\/$/, ''))}/functions/v1/gestione" data-chiave="${esc(g.chiave_pubblica)}">`,
    `<header class="intestazione"><div class="contenitore intestazione-riga">${marchio(d, risorse, '../')}<nav class="nav nav-sempre" aria-label="Navigazione"><a href="../" target="_blank" rel="noopener">Vedi il sito</a></nav></div></header>`,
    `<main id="contenuto" class="contenitore contenitore-stretto gestione-corpo">
<h1>Gestione del sito</h1>
<p class="gestione-intro">Le modifiche compaiono sul sito subito dopo il salvataggio.</p>

<div class="gestione-messaggio" data-messaggio role="status" aria-live="polite" hidden></div>

<div data-senza-accesso hidden>
  <p>Per entrare apri il <strong>link personale</strong> che hai ricevuto. Se l'hai perso, chiedine uno nuovo a chi ha realizzato il sito.</p>
</div>

<div data-pannello hidden>
  <section class="gestione-blocco" aria-labelledby="g-avviso">
    <h2 id="g-avviso">Avviso in alto</h2>
    <p class="gestione-aiuto">Compare in cima al sito. Es. "Stasera chiusi per evento privato".</p>
    <form data-form-stato="avviso">
      <label class="interruttore"><input type="checkbox" name="avviso_attivo"><span>Mostra l'avviso</span></label>
      <label class="campo-g"><span>Testo</span><textarea name="avviso_testo" maxlength="160" rows="2"></textarea></label>
      <label class="campo-g"><span>Nascondi automaticamente dopo il (facoltativo)</span><input type="date" name="avviso_fino_al"></label>
      <button class="pulsante" type="submit">Salva avviso</button>
    </form>
  </section>

  <section class="gestione-blocco" aria-labelledby="g-piatto">
    <h2 id="g-piatto">Piatto del giorno</h2>
    <p class="gestione-aiuto">Compare in evidenza all'inizio del menu.</p>
    <form data-form-stato="piatto">
      <label class="interruttore"><input type="checkbox" name="piatto_giorno_attivo"><span>Mostra il piatto del giorno</span></label>
      <label class="campo-g"><span>Nome del piatto</span><input name="piatto_giorno_nome" maxlength="70"></label>
      <label class="campo-g"><span>Descrizione (facoltativa)</span><textarea name="piatto_giorno_descrizione" maxlength="200" rows="2"></textarea></label>
      <label class="campo-g"><span>Prezzo</span><input name="piatto_giorno_prezzo" maxlength="20" inputmode="decimal" placeholder="Es. 14"></label>
      <button class="pulsante" type="submit">Salva piatto del giorno</button>
    </form>
  </section>

  <section class="gestione-blocco" aria-labelledby="g-menu">
    <h2 id="g-menu">Prezzi e disponibilità</h2>
    <p class="gestione-aiuto">Cambia un prezzo o segna un piatto come esaurito. "Ripristina" torna al prezzo originale.</p>
    <div data-elenco-menu></div>
  </section>
</div>
</main>`,
    `<script type="application/json" id="dati-menu">${datiMenu}</script>`,
    `<script src="../gestione.js?v=${risorse.versione}" defer></script>`,
    '</body>',
    '</html>',
  ]);
}

/** Restituisce l'elenco delle pagine da scrivere. */
export function generaPagine(d, risorse, config, testoPrivacy) {
  const pagine = [
    { percorso: 'index.html', contenuto: paginaHome(d, risorse, config) },
    { percorso: 'privacy/index.html', contenuto: paginaPrivacy(d, risorse, config, testoPrivacy) },
  ];
  if (gestioneAttiva(d, config)) pagine.push({ percorso: 'gestione/index.html', contenuto: paginaGestione(d, risorse, config) });
  return pagine;
}

export { gestioneAttiva };
