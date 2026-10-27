-- Modifiche in autonomia del cliente (piano Plus).
-- Lettura pubblica (il sito mostra prezzi, avvisi e piatto del giorno),
-- scrittura SOLO tramite la funzione "gestione", che controlla il codice personale.

-- Un record per ogni sito cliente. Contiene l'impronta del codice di accesso:
-- nessuna policy, quindi dal browser non è leggibile da nessuno.
create table public.siti (
  id text primary key check (id ~ '^[a-z0-9-]{2,60}$'),
  nome text not null check (char_length(nome) <= 80),
  codice_hash text not null check (codice_hash ~ '^[0-9a-f]{64}$'),
  creato_il timestamptz not null default now()
);

-- Avviso in alto e piatto del giorno.
create table public.stato_sito (
  sito_id text primary key references public.siti(id) on delete cascade,
  avviso_attivo boolean not null default false,
  avviso_testo text check (char_length(avviso_testo) <= 160),
  avviso_fino_al date,
  piatto_giorno_attivo boolean not null default false,
  piatto_giorno_nome text check (char_length(piatto_giorno_nome) <= 70),
  piatto_giorno_descrizione text check (char_length(piatto_giorno_descrizione) <= 200),
  piatto_giorno_prezzo text check (char_length(piatto_giorno_prezzo) <= 20),
  aggiornato_il timestamptz not null default now()
);

-- Prezzo modificato e disponibilità dei piatti del menu.
-- piatto_id = "<categoria>/<piatto>" come generato dal template.
create table public.modifiche_menu (
  sito_id text not null references public.siti(id) on delete cascade,
  piatto_id text not null check (char_length(piatto_id) <= 140),
  prezzo text check (char_length(prezzo) <= 20),
  disponibile boolean not null default true,
  aggiornato_il timestamptz not null default now(),
  primary key (sito_id, piatto_id)
);

alter table public.siti enable row level security;
alter table public.stato_sito enable row level security;
alter table public.modifiche_menu enable row level security;

-- Sola lettura pubblica per i dati che il sito deve mostrare.
create policy "lettura pubblica stato" on public.stato_sito
  for select to anon, authenticated using (true);

create policy "lettura pubblica modifiche" on public.modifiche_menu
  for select to anon, authenticated using (true);

-- Nessuna policy di scrittura: inserimenti e modifiche passano solo dalla funzione,
-- che usa la chiave di servizio dopo aver verificato il codice del cliente.
revoke insert, update, delete on public.stato_sito, public.modifiche_menu from anon, authenticated;
revoke all on public.siti from anon, authenticated;
grant select on public.stato_sito, public.modifiche_menu to anon, authenticated;
