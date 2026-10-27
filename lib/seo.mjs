// SEO locale: dalle informazioni del cliente e dal database seo/parole-chiave.json
// ricava le parole chiave su cui puntare e suggerisce titolo e descrizione.

const ORDINE_PRIORITA = { alta: 0, media: 1, bassa: 2 };

/** "a Sassari" ma "ad Alghero": la "d" eufonica davanti a vocale. */
export function aCitta(citta) {
  return /^[aeiouàèéìòù]/i.test(citta) ? `ad ${citta}` : `a ${citta}`;
}

function minuti(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function condizioni(dati) {
  const fasce = Object.entries(dati.orari)
    .filter(([k]) => k !== 'note')
    .flatMap(([, f]) => f);
  return {
    aperto_domenica: (dati.orari.dom ?? []).length > 0,
    aperto_lunedi: (dati.orari.lun ?? []).length > 0,
    aperto_pranzo: fasce.some(([apre]) => minuti(apre) < 15 * 60),
    aperto_cena: fasce.some(([apre, chiude]) => minuti(apre) >= 18 * 60 || minuti(chiude) >= 21 * 60 || minuti(chiude) < minuti(apre)),
  };
}

/** Trova la voce del database che corrisponde a un testo libero (es. "Trattoria tipica" → "trattoria"). */
function trovaVoce(testo, voci) {
  if (!testo) return null;
  const t = testo.toLowerCase().trim();
  if (voci[t]) return [t, voci[t]];
  const chiavi = Object.keys(voci).sort((a, b) => b.length - a.length);
  const trovata = chiavi.find((k) => t.includes(k));
  return trovata ? [trovata, voci[trovata]] : null;
}

function riempi(frase, valori) {
  const segnaposto = [...frase.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  if (segnaposto.some((k) => !valori[k])) return null; // manca un dato: la frase non si usa
  return frase.replace(/\{(\w+)\}/g, (_, k) => valori[k]).replace(/\s+/g, ' ').trim();
}

/**
 * @returns {{ parole: Array<{frase, priorita, lingua, origine}>, categorieGoogle: string[], valori: object }}
 */
export function paroleChiave(dati, db) {
  const settore = db[dati.template];
  if (!settore) return { parole: [], categorieGoogle: [], valori: {} };

  const citta = dati.contatti.indirizzo.citta;
  const tipo = trovaVoce(dati.attivita.tipo, settore.tipi);
  const cucina = trovaVoce(dati.attivita.cucina, settore.cucine);
  const localita = db.localita?.[citta];

  // una zona si usa solo se il cliente la nomina davvero nei suoi testi
  const testiCliente = [dati.contatti.indirizzo.indicazioni, ...(dati.attivita.chi_siamo ?? []), dati.attivita.slogan]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const zona = localita?.zone.find((z) => testiCliente.includes(z.toLowerCase()));

  const valori = {
    citta,
    a_citta: aCitta(citta),
    tipo: (tipo?.[0] ?? dati.attivita.tipo).toLowerCase(),
    tipo_en: tipo?.[1].en,
    cucina: cucina?.[0] ?? (dati.attivita.cucina ? dati.attivita.cucina.toLowerCase() : null),
    cucina_en: cucina?.[1].en,
    zona,
  };
  const ok = condizioni(dati);
  const visti = new Set();
  const parole = [];
  const aggiungi = (frase, priorita, lingua, origine) => {
    if (!frase) return;
    const chiave = frase.toLowerCase();
    if (visti.has(chiave)) return;
    visti.add(chiave);
    parole.push({ frase, priorita, lingua, origine });
  };

  for (const i of settore.intenti) {
    if (i.se && !ok[i.se]) continue;
    aggiungi(riempi(i.frase, valori), i.priorita, 'it', 'ricerca generale');
  }
  for (const i of settore.intenti_en ?? []) {
    aggiungi(riempi(i.frase, { ...valori, citta: localita?.en ?? citta }), i.priorita, 'en', 'turisti');
  }
  for (const s of [...(tipo?.[1].sinonimi ?? []), ...(cucina?.[1].sinonimi ?? [])]) {
    aggiungi(`${s} ${citta}`, 'media', 'it', 'sinonimo');
  }

  // piatti del menu presenti nel database
  const nomiPiatti = dati.menu.categorie.flatMap((c) => c.piatti.map((p) => `${p.nome} ${p.descrizione ?? ''}`.toLowerCase()));
  for (const [piatto, voce] of Object.entries(settore.piatti)) {
    if (nomiPiatti.some((n) => n.includes(piatto))) {
      voce.frasi.forEach((f) => aggiungi(riempi(f, valori), 'media', 'it', `piatto: ${piatto}`));
    }
  }

  // servizi dichiarati
  for (const servizio of dati.attivita.servizi ?? []) {
    const voce = trovaVoce(servizio, settore.servizi);
    voce?.[1].forEach((f) => aggiungi(riempi(f, valori), 'bassa', 'it', `servizio: ${voce[0]}`));
  }

  parole.sort((a, b) => ORDINE_PRIORITA[a.priorita] - ORDINE_PRIORITA[b.priorita]);

  const categorieGoogle = [...new Set([tipo?.[1].categoria_google, cucina?.[1].categoria_google].filter(Boolean))];
  return { parole, categorieGoogle, valori };
}

/** Titolo della pagina: nome + cosa + dove, entro circa 60 caratteri. */
export function titoloPagina(dati) {
  if (dati.seo?.titolo) return dati.seo.titolo;
  const { nome, tipo, cucina } = dati.attivita;
  const dove = aCitta(dati.contatti.indirizzo.citta);
  const tipoNelNome = nome.toLowerCase().includes(tipo.toLowerCase());
  const cosa = tipoNelNome
    ? cucina ? cucina.toLowerCase() : ''
    : cucina ? `${tipo.toLowerCase()} di ${cucina.toLowerCase()}` : tipo.toLowerCase();
  const completo = cosa ? `${nome}, ${cosa} ${dove}` : `${nome} ${dove}`;
  if (completo.length <= 62) return completo;
  return tipoNelNome ? `${nome} ${dove}` : `${nome}, ${tipo.toLowerCase()} ${dove}`;
}
