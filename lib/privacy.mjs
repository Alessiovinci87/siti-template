// Modello di privacy policy per siti vetrina SENZA cookie e SENZA moduli di raccolta dati.
// ATTENZIONE: è un modello di partenza. Va fatto verificare una volta da un professionista
// (avvocato o consulente privacy) prima di usarlo con i clienti.
// Se un sito aggiunge statistiche, mappe incorporate, video o moduli, il testo va aggiornato.
import { esc, indirizzoInRiga } from './util.mjs';

export function testoPrivacy(d, { dataAggiornamento = new Date(), conGestione = false } = {}) {
  const { legale, contatti, attivita } = d;
  const titolare = esc(legale.ragione_sociale);
  const emailPrivacy = legale.email_privacy || contatti.email;
  const recapito = emailPrivacy
    ? `scrivendo a <a href="mailto:${esc(emailPrivacy)}">${esc(emailPrivacy)}</a>`
    : `chiamando il numero <a href="tel:${esc(contatti.telefono)}">${esc(contatti.telefono)}</a>`;
  const data = dataAggiornamento.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

  return `<!-- MODELLO DA FAR VERIFICARE A UN PROFESSIONISTA -->
<h1>Privacy policy</h1>
<p class="pagina-data">Ultimo aggiornamento: ${data}</p>

<h2>Chi tratta i dati</h2>
<p>Il titolare del trattamento è ${titolare}${legale.sede_legale ? `, con sede in ${esc(legale.sede_legale)}` : ''}, P. IVA ${esc(legale.piva)}, che gestisce ${esc(attivita.nome)} in ${esc(indirizzoInRiga(contatti.indirizzo))}. Per qualsiasi domanda sui tuoi dati puoi contattarci ${recapito}.</p>

<h2>Quali dati raccogliamo</h2>
<p>Questo sito è una vetrina informativa: non ha moduli da compilare, non richiede registrazione e non vende nulla online.</p>
<p>Come accade per qualsiasi sito, il servizio di hosting che lo ospita registra automaticamente alcuni dati tecnici di navigazione (ad esempio indirizzo IP, data e ora della visita, pagina richiesta, tipo di browser). Questi dati servono solo a far funzionare il sito e a garantirne la sicurezza, non vengono usati per identificarti e vengono conservati per il tempo strettamente necessario.</p>

${conGestione ? `<p>Per mostrare il menu sempre aggiornato (prezzi, piatto del giorno, avvisi), le pagine caricano queste informazioni da Supabase, un servizio di database con server nell'Unione Europea. Come per qualsiasi richiesta su internet, il servizio riceve l'indirizzo IP del visitatore per il tempo necessario a rispondere; non vengono inviati altri dati e non vengono usati cookie.</p>` : ''}

<h2>Cookie</h2>
<p>Questo sito non usa cookie, né tecnici né di profilazione, e non usa strumenti di statistica o pubblicità di terze parti. Per questo non trovi alcun banner sui cookie.</p>

<h2>Quando ci contatti</h2>
<p>Se ci chiami, ci scrivi su WhatsApp o ci mandi un'email, usiamo i dati che ci fornisci (nome, numero di telefono, eventuali richieste) solo per risponderti e gestire la tua prenotazione o richiesta. La base giuridica è la risposta a una tua richiesta. Non cediamo i tuoi dati a terzi per finalità commerciali.</p>
<p>I collegamenti a WhatsApp, Google Maps e ai social network portano su servizi esterni, che trattano i dati secondo le proprie informative privacy.</p>

<h2>I tuoi diritti</h2>
<p>In base al Regolamento UE 2016/679 (GDPR) puoi chiedere in qualsiasi momento di accedere ai tuoi dati, correggerli, cancellarli, limitarne il trattamento o opporti, ${recapito}. Hai anche il diritto di presentare un reclamo al Garante per la protezione dei dati personali (<a href="https://www.garanteprivacy.it" rel="noopener">garanteprivacy.it</a>).</p>`;
}
