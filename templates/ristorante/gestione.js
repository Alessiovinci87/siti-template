// Pannello di gestione del cliente.
// Il codice personale arriva nell'indirizzo dopo il # (non viene mai inviato al server del sito)
// e resta salvato solo su questo dispositivo, così il titolare non deve riaprire il link ogni volta.
(function () {
  'use strict';

  var corpo = document.body;
  var sito = corpo.getAttribute('data-sito');
  var funzione = corpo.getAttribute('data-funzione');
  var chiave = corpo.getAttribute('data-chiave');
  var CHIAVE_ARCHIVIO = 'gestione:' + sito;
  var menu = JSON.parse(document.getElementById('dati-menu').textContent);

  var messaggio = document.querySelector('[data-messaggio]');
  var pannello = document.querySelector('[data-pannello]');
  var senzaAccesso = document.querySelector('[data-senza-accesso]');
  var timerMessaggio;

  function mostra(testo, tipo) {
    clearTimeout(timerMessaggio);
    messaggio.textContent = testo;
    messaggio.setAttribute('data-tipo', tipo || 'ok');
    messaggio.hidden = false;
    if (tipo !== 'errore') timerMessaggio = setTimeout(function () { messaggio.hidden = true; }, 3500);
  }

  function leggiArchivio() {
    try { return localStorage.getItem(CHIAVE_ARCHIVIO); } catch (e) { return null; }
  }
  function scriviArchivio(valore) {
    try {
      if (valore) localStorage.setItem(CHIAVE_ARCHIVIO, valore);
      else localStorage.removeItem(CHIAVE_ARCHIVIO);
    } catch (e) { /* archivio non disponibile: si usa solo il link */ }
  }

  // Il codice dal link ha la precedenza; poi si toglie dall'indirizzo visibile.
  var codice = decodeURIComponent((location.hash || '').slice(1));
  if (codice) {
    scriviArchivio(codice);
    history.replaceState(null, '', location.pathname);
  } else {
    codice = leggiArchivio();
  }

  function chiama(azione, dati) {
    var richiesta = Object.assign({ sito: sito, codice: codice, azione: azione }, dati || {});
    return fetch(funzione, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: chiave },
      body: JSON.stringify(richiesta),
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) {
          var errore = new Error(j.errore || 'Qualcosa non ha funzionato, riprova');
          errore.stato = r.status;
          throw errore;
        }
        return j;
      });
    });
  }

  // ---------- avviso e piatto del giorno ----------

  var formStato = document.querySelectorAll('[data-form-stato]');
  var statoCorrente = {};

  function compilaStato(stato) {
    statoCorrente = stato || {};
    formStato.forEach(function (form) {
      Array.prototype.forEach.call(form.elements, function (campo) {
        if (!campo.name) return;
        var valore = statoCorrente[campo.name];
        if (campo.type === 'checkbox') campo.checked = Boolean(valore);
        else campo.value = valore == null ? '' : valore;
      });
    });
  }

  function valoriStato() {
    var valori = {};
    formStato.forEach(function (form) {
      Array.prototype.forEach.call(form.elements, function (campo) {
        if (!campo.name) return;
        valori[campo.name] = campo.type === 'checkbox' ? campo.checked : campo.value.trim() || null;
      });
    });
    return valori;
  }

  formStato.forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var pulsante = form.querySelector('button[type="submit"]');
      pulsante.disabled = true;
      chiama('salva_stato', valoriStato())
        .then(function () {
          mostra(form.getAttribute('data-form-stato') === 'avviso' ? 'Avviso salvato' : 'Piatto del giorno salvato');
        })
        .catch(function (err) { mostra(err.message, 'errore'); })
        .then(function () { pulsante.disabled = false; });
    });
  });

  // ---------- prezzi e disponibilità ----------

  var elenco = document.querySelector('[data-elenco-menu]');

  function creaRiga(piatto, modifica) {
    var riga = document.createElement('div');
    riga.className = 'riga-piatto';
    riga.setAttribute('data-id', piatto.id);

    var nome = document.createElement('p');
    nome.className = 'riga-piatto-nome';
    nome.textContent = piatto.nome;

    var controlli = document.createElement('div');
    controlli.className = 'riga-piatto-controlli';

    var etichettaPrezzo = document.createElement('label');
    etichettaPrezzo.className = 'campo-g campo-prezzo';
    var testoPrezzo = document.createElement('span');
    testoPrezzo.textContent = 'Prezzo';
    var prezzo = document.createElement('input');
    prezzo.inputMode = 'decimal';
    prezzo.maxLength = 20;
    prezzo.placeholder = piatto.prezzo;
    prezzo.value = modifica && modifica.prezzo ? modifica.prezzo : '';
    etichettaPrezzo.appendChild(testoPrezzo);
    etichettaPrezzo.appendChild(prezzo);

    var etichettaDisp = document.createElement('label');
    etichettaDisp.className = 'interruttore';
    var disponibile = document.createElement('input');
    disponibile.type = 'checkbox';
    disponibile.checked = !modifica || modifica.disponibile !== false;
    var testoDisp = document.createElement('span');
    testoDisp.textContent = 'Disponibile';
    etichettaDisp.appendChild(disponibile);
    etichettaDisp.appendChild(testoDisp);

    var salva = document.createElement('button');
    salva.type = 'button';
    salva.className = 'pulsante pulsante-piccolo';
    salva.textContent = 'Salva';

    var ripristina = document.createElement('button');
    ripristina.type = 'button';
    ripristina.className = 'pulsante pulsante-piccolo pulsante-secondario';
    ripristina.textContent = 'Ripristina';
    ripristina.hidden = !modifica;

    controlli.appendChild(etichettaPrezzo);
    controlli.appendChild(etichettaDisp);
    controlli.appendChild(salva);
    controlli.appendChild(ripristina);
    riga.appendChild(nome);
    riga.appendChild(controlli);

    function aggiornaAspetto() {
      riga.classList.toggle('esaurito', !disponibile.checked);
    }
    aggiornaAspetto();
    disponibile.addEventListener('change', aggiornaAspetto);

    salva.addEventListener('click', function () {
      salva.disabled = true;
      chiama('salva_piatto', { piatto_id: piatto.id, prezzo: prezzo.value.trim() || null, disponibile: disponibile.checked })
        .then(function () {
          ripristina.hidden = false;
          mostra(piatto.nome + ': salvato');
        })
        .catch(function (err) { mostra(err.message, 'errore'); })
        .then(function () { salva.disabled = false; });
    });

    ripristina.addEventListener('click', function () {
      ripristina.disabled = true;
      chiama('ripristina_piatto', { piatto_id: piatto.id })
        .then(function () {
          prezzo.value = '';
          disponibile.checked = true;
          aggiornaAspetto();
          ripristina.hidden = true;
          mostra(piatto.nome + ': tornato al prezzo originale');
        })
        .catch(function (err) { mostra(err.message, 'errore'); })
        .then(function () { ripristina.disabled = false; });
    });

    return riga;
  }

  function compilaMenu(modifiche) {
    var perId = {};
    (modifiche || []).forEach(function (m) { perId[m.piatto_id] = m; });
    elenco.textContent = '';
    menu.forEach(function (categoria) {
      var titolo = document.createElement('h3');
      titolo.textContent = categoria.nome;
      elenco.appendChild(titolo);
      categoria.piatti.forEach(function (p) {
        elenco.appendChild(creaRiga(p, perId[p.id]));
      });
    });
  }

  // ---------- avvio ----------

  // Se si apre un nuovo link mentre la pagina è già aperta, si riparte da capo.
  window.addEventListener('hashchange', function () { location.reload(); });

  if (!codice) {
    senzaAccesso.hidden = false;
    return;
  }

  chiama('leggi')
    .then(function (dati) {
      compilaStato(dati.stato);
      compilaMenu(dati.modifiche);
      pannello.hidden = false;
    })
    .catch(function (err) {
      if (err.stato === 401) {
        scriviArchivio(null);
        senzaAccesso.hidden = false;
      }
      mostra(err.message, 'errore');
    });
})();
