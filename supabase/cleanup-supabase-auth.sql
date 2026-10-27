-- One-off: removes the first version of kotes, which lived in `public` and
-- used Supabase Auth with a Resend send-email hook. Everything now lives in
-- the private `kotes` schema (see schema.sql). Safe to re-run.

drop function if exists public.get_feed(int, bigint[]);
drop function if exists public.get_library(text);
drop function if exists public.record_view(bigint, int);
drop function if exists public.set_tastes(text[]);
drop function if exists public.send_email_hook(jsonb);

drop table if exists public.reactions;   -- its trigger goes with it
drop table if exists public.views;
drop table if exists public.tastes;
drop table if exists public.quotes;

drop function if exists public._on_reaction();
drop function if exists public._nudge_taste(uuid, bigint, real);

-- The Resend key now lives in the server's environment, not in Vault.
delete from vault.secrets where name in ('resend_api_key', 'resend_from');
