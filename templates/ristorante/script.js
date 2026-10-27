// Script del template Ristorante: niente cookie, niente dati salvati.
// 1. Mostra "Aperto ora / Chiuso" in base agli orari (ora italiana).
// 2. Evidenzia il giorno di oggi nella tabella orari.
// 3. Evidenzia la categoria del menu che si sta guardando.
(function () {
  'use strict';

  var CHIAVI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  var NOMI = { lun: 'lunedì', mar: 'martedì', mer: 'mercoledì', gio: 'giovedì', ven: 'venerdì', sab: 'sabato', dom: 'domenica' };

  var tabella = document.querySelector('[data-orari]');
  if (!tabella) return;

  var orari;
  try {
    orari = JSON.parse(tabella.getAttribute('data-orari'));
  } catch (e) {
    return;
  }

  function minuti(hhmm) {
    var parti = hhmm.split(':');
    return parseInt(parti[0], 10) * 60 + parseInt(parti[1], 10);
  }

  // Ora corrente a Roma, indipendentemente dal fuso del visitatore.
  function adessoInItalia() {
    var formato = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Rome',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    var parti = {};
    formato.formatToParts(new Date()).forEach(function (p) {
      parti[p.type] = p.value;
    });
    var indiceGiorno = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parti.weekday);
    return { giorno: indiceGiorno, minuti: parseInt(parti.hour, 10) * 60 + parseInt(parti.minute, 10) };
  }

  // Fasce del giorno come intervalli in minuti; una fascia che passa la mezzanotte
  // (es. 19:00–01:00) finisce sul giorno dopo.
  function fasce(indiceGiorno) {
    return (orari[CHIAVI[indiceGiorno]] || []).map(function (f) {
      var inizio = minuti(f[0]);
      var fine = minuti(f[1]);
      if (fine <= inizio) fine += 24 * 60;
      return { inizio: inizio, fine: fine, apre: f[0], chiude: f[1] };
    });
  }

  function calcolaStato() {
    var ora = adessoInItalia();

    // Aperto ora? Controlla oggi e la coda di ieri dopo mezzanotte.
    var oggi = fasce(ora.giorno);
    for (var i = 0; i < oggi.length; i++) {
      if (ora.minuti >= oggi[i].inizio && ora.minuti < oggi[i].fine) {
        return { aperto: true, testo: 'Aperto ora, chiude alle ' + oggi[i].chiude };
      }
    }
    var ieri = fasce((ora.giorno + 6) % 7);
    for (var j = 0; j < ieri.length; j++) {
      if (ieri[j].fine > 24 * 60 && ora.minuti < ieri[j].fine - 24 * 60) {
        return { aperto: true, testo: 'Aperto ora, chiude alle ' + ieri[j].chiude };
      }
    }

    // Prossima apertura.
    for (var k = 0; k < oggi.length; k++) {
      if (oggi[k].inizio > ora.minuti) return { aperto: false, testo: 'Chiuso ora, apre oggi alle ' + oggi[k].apre };
    }
    for (var giorni = 1; giorni <= 7; giorni++) {
      var indice = (ora.giorno + giorni) % 7;
      var prossime = fasce(indice);
      if (prossime.length) {
        var quando = giorni === 1 ? 'domani' : NOMI[CHIAVI[indice]];
        return { aperto: false, testo: 'Chiuso ora, apre ' + quando + ' alle ' + prossime[0].apre };
      }
    }
    return null;
  }

  function aggiorna() {
    var stato = calcolaStato();
    var box = document.querySelector('[data-stato]');
    if (stato && box) {
      box.querySelector('[data-stato-testo]').textContent = stato.testo;
      box.setAttribute('data-aperto', stato.aperto ? 'si' : 'no');
      box.hidden = false;
    }
    var oggi = CHIAVI[adessoInItalia().giorno];
    var righe = tabella.querySelectorAll('tr[data-giorno]');
    for (var r = 0; r < righe.length; r++) {
      righe[r].classList.toggle('oggi', righe[r].getAttribute('data-giorno') === oggi);
    }
  }

  aggiorna();
  setInterval(aggiorna, 60 * 1000);

  // Categoria del menu visibile.
  var collegamenti = document.querySelectorAll('.menu-indice a');
  if (collegamenti.length && 'IntersectionObserver' in window) {
    var perId = {};
    collegamenti.forEach(function (a) {
      perId[a.getAttribute('href').slice(1)] = a;
    });
    var osservatore = new IntersectionObserver(
      function (voci) {
        voci.forEach(function (voce) {
          if (!voce.isIntersecting) return;
          collegamenti.forEach(function (a) {
            a.removeAttribute('aria-current');
          });
          var attivo = perId[voce.target.id];
          if (attivo) {
            attivo.setAttribute('aria-current', 'true');
            // scorre solo la fila delle categorie, mai la pagina
            var fila = attivo.closest('ul');
            var spostamento = attivo.getBoundingClientRect().left - fila.getBoundingClientRect().left - 16;
            fila.scrollBy({ left: spostamento, behavior: 'smooth' });
          }
        });
      },
      { rootMargin: '-35% 0px -60% 0px' }
    );
    document.querySelectorAll('.menu-categoria').forEach(function (s) {
      osservatore.observe(s);
    });
  }
})();

// Modifiche del titolare (piano Plus): prezzi, piatti esauriti, piatto del giorno, avviso.
// Se il servizio non risponde, resta semplicemente il menu originale.
(function () {
  'use strict';

  var corpo = document.body;
  var url = corpo.getAttribute('data-gestione-url');
  var chiave = corpo.getAttribute('data-gestione-chiave');
  var sito = corpo.getAttribute('data-sito');
  if (!url || !chiave || !sito || !window.fetch) return;

  var intestazioni = { apikey: chiave };
  if (chiave.indexOf('eyJ') === 0) intestazioni.Authorization = 'Bearer ' + chiave;

  function leggi(tabella, campi) {
    var indirizzo = url + '/rest/v1/' + tabella + '?sito_id=eq.' + encodeURIComponent(sito) + '&select=' + campi;
    return fetch(indirizzo, { headers: intestazioni, cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('lettura non riuscita');
      return r.json();
    });
  }

  // "12" o "12,5" diventano "12 €" / "12,50 €"; un testo libero resta com'è.
  function prezzoLeggibile(valore) {
    var v = String(valore).trim();
    if (/^\d+([.,]\d{1,2})?$/.test(v)) {
      var numero = parseFloat(v.replace(',', '.'));
      var decimali = Math.round(numero) === numero ? 0 : 2;
      return numero.toLocaleString('it-IT', { minimumFractionDigits: decimali, maximumFractionDigits: 2 }) + ' €';
    }
    return v;
  }

  function oggiInItalia() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
  }

  function applicaStato(stato) {
    if (!stato) return;
    var avviso = document.querySelector('[data-avviso]');
    var scaduto = stato.avviso_fino_al && stato.avviso_fino_al < oggiInItalia();
    if (avviso && stato.avviso_attivo && stato.avviso_testo && !scaduto) {
      avviso.querySelector('[data-avviso-testo]').textContent = stato.avviso_testo;
      avviso.hidden = false;
    }
    var pg = document.querySelector('[data-piatto-giorno]');
    if (pg && stato.piatto_giorno_attivo && stato.piatto_giorno_nome) {
      pg.querySelector('[data-pg-nome]').textContent = stato.piatto_giorno_nome;
      pg.querySelector('[data-pg-prezzo]').textContent = stato.piatto_giorno_prezzo ? prezzoLeggibile(stato.piatto_giorno_prezzo) : '';
      var descrizione = pg.querySelector('[data-pg-descrizione]');
      descrizione.textContent = stato.piatto_giorno_descrizione || '';
      descrizione.hidden = !stato.piatto_giorno_descrizione;
      pg.hidden = false;
    }
  }

  function applicaModifiche(modifiche) {
    modifiche.forEach(function (m) {
      var piatto = document.querySelector('[data-piatto="' + m.piatto_id.replace(/"/g, '') + '"]');
      if (!piatto) return;
      if (m.prezzo) piatto.querySelector('[data-prezzo]').textContent = prezzoLeggibile(m.prezzo);
      if (m.disponibile === false) {
        piatto.classList.add('esaurito');
        var riga = piatto.querySelector('.piatto-riga');
        if (!riga.querySelector('.piatto-esaurito')) {
          var etichetta = document.createElement('span');
          etichetta.className = 'piatto-esaurito';
          etichetta.textContent = 'Esaurito';
          riga.querySelector('.piatto-nome').appendChild(etichetta);
        }
      }
    });
  }

  leggi('stato_sito', '*').then(function (righe) { applicaStato(righe[0]); }).catch(function () {});
  leggi('modifiche_menu', 'piatto_id,prezzo,disponibile').then(applicaModifiche).catch(function () {});
})();
