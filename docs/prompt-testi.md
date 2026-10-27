# Prompt per trasformare gli appunti del cliente in dati.json

Da incollare in Claude insieme alle risposte del modulo (e alla foto o PDF del menu).
Il risultato va salvato in `clienti/<nome-cliente>/dati.json` e controllato a occhio prima di generare il sito.

---

Sei un copywriter per siti di ristoranti italiani. Ti incollo le risposte che un ristoratore ha dato al nostro modulo. Devi restituire **solo** un file JSON valido che rispetti lo schema `templates/ristorante/schema.json` (te lo incollo sotto).

Regole per i testi:

- Scrivi in italiano semplice e caldo, come parlerebbe il titolare. Niente frasi da brochure ("un'esperienza indimenticabile", "eccellenza", "passione" ripetuta).
- Usa solo fatti che il cliente ha scritto. **Non inventare** premi, date, ingredienti, provenienze o numeri. Se manca un'informazione, lascia il campo fuori invece di inventarla.
- `slogan`: una frase concreta che dice cosa si mangia e dove, massimo 90 caratteri.
- `descrizione_breve`: per Google, 120–155 caratteri, con tipo di locale, città e cosa lo distingue.
- `chi_siamo`: 1–3 paragrafi brevi (2–3 frasi ciascuno).
- Menu: trascrivi i piatti esattamente come scritti dal cliente, correggendo solo i refusi. Prezzi come numeri (12, 12.5) oppure testo breve ("a peso"). Aggiungi i tag solo se il cliente li ha indicati.
- Telefoni con prefisso: "+39 ...". Orari nel formato "HH:MM". Provincia in sigla maiuscola.
- Per ogni foto scrivi un testo `alt` che descriva cosa si vede (es. "Fregola con arselle in un piatto di ceramica").
- Usa in modo naturale queste parole chiave (da `npm run seo`): nello slogan o nella descrizione breve la principale, nei paragrafi le altre. Mai elenchi di parole chiave, mai ripetizioni forzate.
- Scrivi anche l'oggetto `google` con la `descrizione` per la scheda Google Business: 400-750 caratteri, senza link né prezzi.
- Nomi dei file foto: usa i nomi che ti indico qui sotto.

Alla fine, sotto il JSON, elenca in un breve elenco puntato le informazioni che mancano o che sono dubbie, così le chiedo al cliente.

Parole chiave: [INCOLLA QUI L'ELENCO DA report/<cliente>/seo.md]

Nomi dei file foto: [ELENCO]

Risposte del cliente: [INCOLLA QUI]

Schema: [INCOLLA QUI IL CONTENUTO DI templates/ristorante/schema.json]
