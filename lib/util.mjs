// Funzioni di supporto comuni a tutti i template.

/** Escape per testo dentro HTML. */
export function esc(valore) {
  return String(valore ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Solo le cifre di un numero di telefono, con prefisso internazionale. */
export function cifreTelefono(numero, prefissoPredefinito = '39') {
  let cifre = String(numero ?? '').replace(/[^\d+]/g, '');
  if (cifre.startsWith('+')) return cifre.slice(1);
  if (cifre.startsWith('00')) return cifre.slice(2);
  return prefissoPredefinito + cifre;
}

export function linkTelefono(numero) {
  return `tel:+${cifreTelefono(numero)}`;
}

export function linkWhatsApp(numero, messaggio = '') {
  const testo = messaggio ? `?text=${encodeURIComponent(messaggio)}` : '';
  return `https://wa.me/${cifreTelefono(numero)}${testo}`;
}

/** Link a Google Maps senza incorporare la mappa (nessun cookie sul sito). */
export function linkMappa(indirizzo) {
  if (indirizzo.link_mappa) return indirizzo.link_mappa;
  const query = [indirizzo.via, indirizzo.cap, indirizzo.citta, indirizzo.provincia]
    .filter(Boolean)
    .join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function indirizzoInRiga(indirizzo) {
  const cittaCompleta = [indirizzo.cap, indirizzo.citta].filter(Boolean).join(' ');
  const provincia = indirizzo.provincia ? ` (${indirizzo.provincia})` : '';
  return `${indirizzo.via}, ${cittaCompleta}${provincia}`;
}

export function formattaPrezzo(prezzo) {
  if (typeof prezzo === 'number') {
    const decimali = Number.isInteger(prezzo) ? 0 : 2;
    return `${prezzo.toLocaleString('it-IT', { minimumFractionDigits: decimali, maximumFractionDigits: 2 })} €`;
  }
  return String(prezzo);
}

export function slug(testo) {
  return String(testo)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Unisce più pezzi di HTML ignorando quelli vuoti. */
export function html(pezzi) {
  return pezzi.filter(Boolean).join('\n');
}
