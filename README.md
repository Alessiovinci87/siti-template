# siti-template

Generatore di siti vetrina per attività locali, a partire da template pronti.
Il cliente compila un modulo, i dati finiscono in un file `dati.json`, un comando genera il sito.

- **Responsive** su telefono, tablet e desktop (con barra Chiama / WhatsApp / Indicazioni sul telefono)
- **Nessun cookie** e nessuna risorsa di terze parti: font e immagini ospitati sul sito stesso, quindi niente banner cookie
- **Sito statico**: veloce, sicuro, pubblicabile gratis o quasi su Cloudflare Pages, Netlify o qualsiasi hosting
- Dati strutturati per Google (orari, indirizzo, menu), anteprima per WhatsApp e social, sitemap

Template disponibili: `ristorante` (ristorante, trattoria, pizzeria, bar), con 3 stili: **terra**, **mare**, **notte**.

## Struttura

```
clienti/<nome-cliente>/dati.json   i dati del cliente
clienti/<nome-cliente>/foto/       le sue foto
templates/ristorante/              template: schema dati, HTML, stile, script
docs/                              modulo per il cliente e prompt per i testi
dist/<nome-cliente>/               il sito generato, pronto da pubblicare
config.json                        nome del brand (credito nel piede del sito)
```

## Prima installazione (una volta sola)

Serve [Node.js](https://nodejs.org) versione 20 o superiore. In PowerShell, dalla cartella del progetto:

```powershell
npm install
```

## Provare la demo

```powershell
npm run demo-foto
npm run sito -- demo-trattoria --anteprima
npm run anteprima -- demo-trattoria
```

Poi apri http://localhost:4321. Per vedere gli altri stili:

```powershell
npm run sito -- demo-trattoria --anteprima --variante mare
npm run sito -- demo-trattoria --anteprima --variante notte
```

## Nuovo cliente

1. Copia la cartella `clienti/demo-trattoria` e rinominala, es. `clienti/trattoria-rossi`
2. Cancella le foto di esempio e metti in `foto/` quelle del cliente
3. Compila i dati di base (nome, tipo, città, menu) e lancia `npm run seo -- trattoria-rossi`: ti dà le parole chiave da usare
4. Prepara i testi di `dati.json` con il prompt in `docs/prompt-testi.md`, insieme alle parole chiave (in VS Code i campi hanno suggerimenti automatici)
5. Genera l'anteprima: `npm run sito -- trattoria-rossi --anteprima`
   - se manca qualcosa (un campo, una foto, un orario scritto male) il comando lo dice in chiaro e si ferma
6. Controlla su telefono e PC, manda l'anteprima al cliente
7. Dopo l'approvazione, genera la versione finale senza `--anteprima` e pubblica la cartella `dist/trattoria-rossi`

8. Scheda Google: `npm run google -- trattoria-rossi` crea `report/trattoria-rossi/scheda-google.html`, da aprire con doppio clic. Ogni campo ha il pulsante Copia, e le foto sono già esportate per Google

`--anteprima` blocca l'indicizzazione su Google: usalo per tutte le versioni non definitive.

## SEO

Il database `seo/parole-chiave.json` contiene, per settore, le ricerche tipiche (tipo di locale, cucina, piatti, servizi, turisti in inglese) e le località con le loro zone. `npm run seo` le combina con i dati del cliente e scrive `report/<cliente>/seo.md` con le parole principali, titolo e descrizione per Google e alcuni controlli.

Le priorità indicano quanto la ricerca è vicina alla decisione di andare nel locale, non il volume di ricerca. Per aggiungere nuove città, piatti o servizi basta modificare il file JSON.

## Privacy

`lib/privacy.mjs` contiene un modello di privacy policy per siti **senza cookie e senza moduli**.
Va fatto verificare una volta da un professionista prima di usarlo con i clienti, e aggiornato
se un sito aggiunge statistiche, mappe o video incorporati, o moduli di contatto.
