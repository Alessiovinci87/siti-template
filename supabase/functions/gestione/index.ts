// Funzione "gestione": salva le modifiche del cliente dopo aver verificato il suo codice.
// Il codice viaggia solo nel corpo della richiesta (HTTPS) e nel database c'è solo la sua impronta SHA-256.
//
// Richiesta: POST JSON { sito, codice, azione, ...dati }
// Azioni: "leggi", "salva_stato", "salva_piatto", "ripristina_piatto"
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
  "Access-Control-Max-Age": "86400",
};

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

function risposta(stato: number, corpo: unknown) {
  return new Response(JSON.stringify(corpo), {
    status: stato,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

async function sha256(testo: string) {
  const byte = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(testo));
  return [...new Uint8Array(byte)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function uguali(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Testo pulito: niente caratteri di controllo, spazi ai lati tolti, lunghezza massima. */
function testo(valore: unknown, massimo: number): string | null {
  if (valore === null || valore === undefined) return null;
  const pulito = String(valore).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!pulito) return null;
  if (pulito.length > massimo) throw new Error(`Testo troppo lungo (massimo ${massimo} caratteri)`);
  return pulito;
}

function data(valore: unknown): string | null {
  if (!valore) return null;
  const s = String(valore);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error("Data non valida");
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return risposta(405, { errore: "Metodo non consentito" });

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return risposta(400, { errore: "Richiesta non valida" });
  }

  const sito = String(corpo.sito ?? "");
  const codice = String(corpo.codice ?? "");
  if (!/^[a-z0-9-]{2,60}$/.test(sito) || codice.length < 20 || codice.length > 100) {
    return risposta(401, { errore: "Link di accesso non valido" });
  }

  const { data: record, error: erroreSito } = await db.from("siti").select("codice_hash").eq("id", sito).maybeSingle();
  if (erroreSito) return risposta(500, { errore: "Servizio non disponibile, riprova tra poco" });
  if (!record || !uguali(await sha256(codice), record.codice_hash)) {
    // pausa breve per rendere inutili i tentativi a raffica
    await new Promise((r) => setTimeout(r, 600));
    return risposta(401, { errore: "Link di accesso non valido o scaduto" });
  }

  try {
    switch (corpo.azione) {
      case "leggi": {
        const [stato, modifiche] = await Promise.all([
          db.from("stato_sito").select("*").eq("sito_id", sito).maybeSingle(),
          db.from("modifiche_menu").select("piatto_id, prezzo, disponibile").eq("sito_id", sito),
        ]);
        if (stato.error || modifiche.error) throw new Error("Lettura non riuscita");
        return risposta(200, { stato: stato.data, modifiche: modifiche.data });
      }

      case "salva_stato": {
        const riga = {
          sito_id: sito,
          avviso_attivo: Boolean(corpo.avviso_attivo),
          avviso_testo: testo(corpo.avviso_testo, 160),
          avviso_fino_al: data(corpo.avviso_fino_al),
          piatto_giorno_attivo: Boolean(corpo.piatto_giorno_attivo),
          piatto_giorno_nome: testo(corpo.piatto_giorno_nome, 70),
          piatto_giorno_descrizione: testo(corpo.piatto_giorno_descrizione, 200),
          piatto_giorno_prezzo: testo(corpo.piatto_giorno_prezzo, 20),
          aggiornato_il: new Date().toISOString(),
        };
        if (riga.avviso_attivo && !riga.avviso_testo) throw new Error("Scrivi il testo dell'avviso");
        if (riga.piatto_giorno_attivo && !riga.piatto_giorno_nome) throw new Error("Scrivi il nome del piatto del giorno");
        const { error } = await db.from("stato_sito").upsert(riga);
        if (error) throw new Error("Salvataggio non riuscito");
        return risposta(200, { ok: true });
      }

      case "salva_piatto": {
        const piattoId = testo(corpo.piatto_id, 140);
        if (!piattoId || !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(piattoId)) throw new Error("Piatto non valido");
        const { error } = await db.from("modifiche_menu").upsert({
          sito_id: sito,
          piatto_id: piattoId,
          prezzo: testo(corpo.prezzo, 20),
          disponibile: corpo.disponibile !== false,
          aggiornato_il: new Date().toISOString(),
        });
        if (error) throw new Error("Salvataggio non riuscito");
        return risposta(200, { ok: true });
      }

      case "ripristina_piatto": {
        const piattoId = testo(corpo.piatto_id, 140);
        if (!piattoId) throw new Error("Piatto non valido");
        const { error } = await db.from("modifiche_menu").delete().eq("sito_id", sito).eq("piatto_id", piattoId);
        if (error) throw new Error("Ripristino non riuscito");
        return risposta(200, { ok: true });
      }

      default:
        return risposta(400, { errore: "Azione sconosciuta" });
    }
  } catch (errore) {
    return risposta(400, { errore: errore instanceof Error ? errore.message : "Errore" });
  }
});
