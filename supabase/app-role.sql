-- ─────────────────────────────────────────────────────────────
-- kotes · least-privilege database role for the app server
--
-- The server connects as `kotes_app`, never as `postgres`. If the app were
-- ever compromised, this role can only do what kotes itself does: no other
-- schemas (auth, storage, vault), no DDL, no reading of Supabase's secrets,
-- and no single statement can run longer than 5 seconds.
--
-- Its password is set by `npm run db:apply` from APP_DB_PASSWORD. Safe to re-run.
-- ─────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'kotes_app') then
    create role kotes_app nologin noinherit nocreatedb nocreaterole;
  end if;
end $$;

alter role kotes_app set search_path = '';
alter role kotes_app set statement_timeout = '5s';
alter role kotes_app set lock_timeout = '3s';
alter role kotes_app set idle_in_transaction_session_timeout = '15s';

grant usage on schema kotes to kotes_app;

-- Exactly what the app does, table by table.
revoke all on all tables in schema kotes from kotes_app;
grant select                         on kotes.quotes      to kotes_app;
grant select, insert, update, delete on kotes.readers     to kotes_app;
grant select, insert, update, delete on kotes.login_codes to kotes_app;
grant select, insert, update, delete on kotes.sessions    to kotes_app;
grant select, insert, update         on kotes.tastes      to kotes_app;
grant select, insert, delete         on kotes.reactions   to kotes_app;
grant select, insert, update         on kotes.views       to kotes_app;
grant usage on all sequences in schema kotes to kotes_app;
grant execute on all functions in schema kotes to kotes_app;

-- Row level security stays on for every table; these policies let kotes_app
-- (and only kotes_app) through. API roles (anon, authenticated) still see nothing.
do $$
declare
  t text;
begin
  foreach t in array array['readers', 'login_codes', 'sessions', 'tastes', 'reactions', 'views'] loop
    execute format('drop policy if exists app_rw on kotes.%I', t);
    execute format('create policy app_rw on kotes.%I for all to kotes_app using (true) with check (true)', t);
  end loop;
  drop policy if exists app_read on kotes.quotes;
  create policy app_read on kotes.quotes for select to kotes_app using (true);
end $$;
