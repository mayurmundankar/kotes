-- ─────────────────────────────────────────────────────────────
-- kotes · database schema
--
-- Everything lives in the private `kotes` schema. Supabase's Data API never
-- exposes it, and only the Next.js server (connecting as postgres) can read
-- or write it. kotes has its own auth (email code → session cookie) and
-- does not use Supabase Auth.
--
-- Apply with `npm run db:apply`. Safe to re-run.
-- ─────────────────────────────────────────────────────────────

create schema if not exists kotes;
revoke all on schema kotes from public, anon, authenticated;

-- ── Readers & auth ──────────────────────────────────────────

create table if not exists kotes.readers (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique check (email = lower(email)),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz
);

-- One-time sign-in codes. Only a salted hash is stored.
create table if not exists kotes.login_codes (
  id         bigint generated always as identity primary key,
  email      text not null,
  code_hash  text not null,
  attempts   int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz
);
create index if not exists login_codes_email_idx on kotes.login_codes (email, created_at desc);
create index if not exists login_codes_created_idx on kotes.login_codes (created_at);

-- Signed-in devices. The cookie holds a random token; only its hash is stored.
create table if not exists kotes.sessions (
  token_hash   text primary key,
  reader_id    uuid not null references kotes.readers (id) on delete cascade,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  user_agent   text
);
create index if not exists sessions_reader_idx on kotes.sessions (reader_id);

-- ── Library ─────────────────────────────────────────────────

create table if not exists kotes.quotes (
  id         bigint generated always as identity primary key,
  body       text not null unique,
  author     text not null,
  source     text,
  tags       text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists quotes_tags_idx on kotes.quotes using gin (tags);

-- A reader's taste: one weight per theme ('love') or author ('by:Seneca').
create table if not exists kotes.tastes (
  reader_id  uuid not null references kotes.readers (id) on delete cascade,
  feature    text not null,
  weight     real not null default 0,
  updated_at timestamptz not null default now(),
  primary key (reader_id, feature)
);
-- Themes the reader chose at onboarding or retune (weights alone drift with reading).
alter table kotes.tastes add column if not exists picked boolean not null default false;

create table if not exists kotes.reactions (
  reader_id  uuid not null references kotes.readers (id) on delete cascade,
  quote_id   bigint not null references kotes.quotes (id) on delete cascade,
  kind       text not null check (kind in ('like', 'save')),
  created_at timestamptz not null default now(),
  primary key (reader_id, quote_id, kind)
);
create index if not exists reactions_reader_kind_idx on kotes.reactions (reader_id, kind, created_at desc);

create table if not exists kotes.views (
  reader_id uuid not null references kotes.readers (id) on delete cascade,
  quote_id  bigint not null references kotes.quotes (id) on delete cascade,
  dwell_ms  int not null default 0,
  seen_at   timestamptz not null default now(),
  primary key (reader_id, quote_id)
);

-- Belt and braces: RLS on with no policies means API roles see nothing,
-- even if the schema were ever exposed. The server's postgres role bypasses RLS.
alter table kotes.readers     enable row level security;
alter table kotes.login_codes enable row level security;
alter table kotes.sessions    enable row level security;
alter table kotes.quotes      enable row level security;
alter table kotes.tastes      enable row level security;
alter table kotes.reactions   enable row level security;
alter table kotes.views       enable row level security;
revoke all on all tables in schema kotes from public, anon, authenticated;

-- ── Taste engine ────────────────────────────────────────────
-- Signal weights (keep in sync with SIGNAL in src/server/data.ts):
--   like +3 · save +5 · chosen theme 4 · author gets 0.6× the theme delta
--   dwell < 1.5s −0.5 · 1.5–5s +0.25 · > 5s +1   (first view only)

create or replace function kotes.nudge_taste(p_reader uuid, p_quote bigint, p_delta real)
returns void
language sql
set search_path = ''
as $$
  insert into kotes.tastes (reader_id, feature, weight)
  select p_reader, f.feature, p_delta * f.share
  from kotes.quotes q
  cross join lateral (
    select unnest(q.tags) as feature, 1.0::real as share
    union all
    select 'by:' || q.author, 0.6::real
  ) f
  where q.id = p_quote
  on conflict (reader_id, feature)
  do update set weight = kotes.tastes.weight + excluded.weight, updated_at = now();
$$;

create or replace function kotes.on_reaction()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform kotes.nudge_taste(new.reader_id, new.quote_id, case new.kind when 'save' then 5 else 3 end);
    return new;
  end if;
  -- Skip when the reader themself is being deleted (the cascade lands here).
  if exists (select 1 from kotes.readers where id = old.reader_id) then
    perform kotes.nudge_taste(old.reader_id, old.quote_id, case old.kind when 'save' then -5 else -3 end);
  end if;
  return old;
end;
$$;

drop trigger if exists reactions_taste on kotes.reactions;
create trigger reactions_taste
  after insert or delete on kotes.reactions
  for each row execute function kotes.on_reaction();

create or replace function kotes.record_view(p_reader uuid, p_quote bigint, p_dwell int)
returns void
language plpgsql
set search_path = ''
as $$
declare
  first_view boolean;
begin
  insert into kotes.views (reader_id, quote_id, dwell_ms)
  values (p_reader, p_quote, greatest(p_dwell, 0))
  on conflict (reader_id, quote_id)
  do update set dwell_ms = greatest(kotes.views.dwell_ms, excluded.dwell_ms), seen_at = now()
  returning (xmax = 0) into first_view;

  if first_view then
    perform kotes.nudge_taste(p_reader, p_quote,
      case when p_dwell < 1500 then -0.5 when p_dwell > 5000 then 1 else 0.25 end);
  end if;
end;
$$;

-- Onboarding / "retune": chosen themes rise to at least 4, dropped ones fall to at most 0.
create or replace function kotes.set_tastes(p_reader uuid, p_tags text[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  update kotes.tastes
  set weight = least(weight, 0), picked = false, updated_at = now()
  where reader_id = p_reader and feature not like 'by:%' and not (feature = any (p_tags));

  insert into kotes.tastes (reader_id, feature, weight, picked)
  select p_reader, t, 4, true from unnest(p_tags) t
  on conflict (reader_id, feature)
  do update set weight = greatest(kotes.tastes.weight, 4), picked = true, updated_at = now();
end;
$$;

-- A reader's themes: the ones they picked, plus any theme they've liked or kept
-- two or more quotes from. Only explicit choices count; lingering doesn't.
-- Readers who onboarded before picks were recorded fall back to their three
-- strongest themes until they retune.
create or replace function kotes.fav_themes(p_reader uuid)
returns setof text
language sql
stable
set search_path = ''
as $$
  with picks as (
    select feature from kotes.tastes where reader_id = p_reader and picked
  )
  select feature from picks
  union
  (select feature from kotes.tastes
   where reader_id = p_reader and feature not like 'by:%' and weight > 0
     and not exists (select 1 from picks)
   order by weight desc limit 3)
  union
  select tag
  from kotes.reactions r
  join kotes.quotes q on q.id = r.quote_id
  cross join lateral unnest(q.tags) as tag
  where r.reader_id = p_reader
  group by tag
  having count(distinct r.quote_id) >= 2;
$$;

-- The feed. Your themes come from kotes.fav_themes().
-- About 85% of each batch comes from your themes and the rest explores, so
-- the feed stays yours without going stale. Within each group, unseen quotes
-- come first, then a weighted-random race where a quote's chance grows
-- exponentially with how well it matches your taste. When a group runs short,
-- the other fills in; when everything has been seen, it recycles.
create or replace function kotes.get_feed(p_reader uuid, p_limit int default 8, p_exclude bigint[] default '{}')
returns table (id bigint, body text, author text, source text, tags text[], liked boolean, saved boolean)
language sql
volatile
set search_path = ''
as $$
  with t as (
    select feature, weight from kotes.tastes where reader_id = p_reader
  ),
  favs as (
    select f as feature from kotes.fav_themes(p_reader) f
  ),
  quota as (
    select n, case when n >= 4 then greatest(1, round(n * 0.15))::int else 0 end as explore
    from (select least(greatest(p_limit, 1), 30) as n) l
  ),
  scale as (
    select greatest(4, coalesce(max(abs(weight)), 0) / 3) as tau from t
  ),
  scored as (
    select q.id, q.body, q.author, q.source, q.tags,
      coalesce((select sum(t.weight) from t where t.feature = any (q.tags)), 0)
        + coalesce((select t.weight from t where t.feature = 'by:' || q.author), 0) as score,
      exists (select 1 from favs where favs.feature = any (q.tags)) as fav,
      v.seen_at is not null as seen
    from kotes.quotes q
    left join kotes.views v on v.quote_id = q.id and v.reader_id = p_reader
    where not (q.id = any (coalesce(p_exclude, '{}')))
  ),
  ranked as (
    select s.*, row_number() over (
      partition by s.fav
      order by s.seen, -ln(1 - random()) / exp(greatest(least(s.score / scale.tau, 6), -6))
    ) as rn
    from scored s, scale
  ),
  slotted as (
    select r.*,
      case when (r.fav and r.rn <= quota.n - quota.explore) or (not r.fav and r.rn <= quota.explore)
        then 0 else 1 end as tier
    from ranked r, quota
  )
  select p.id, p.body, p.author, p.source, p.tags,
    exists (select 1 from kotes.reactions r where r.reader_id = p_reader and r.quote_id = p.id and r.kind = 'like'),
    exists (select 1 from kotes.reactions r where r.reader_id = p_reader and r.quote_id = p.id and r.kind = 'save')
  from slotted p
  -- Quota first, shuffled so the explorer isn't always last; then fill-ins.
  order by p.tier, case when p.tier = 0 then random() end, not p.fav, p.seen, p.rn
  limit (select n from quota);
$$;

-- Kept or liked quotes, newest first.
create or replace function kotes.get_library(p_reader uuid, p_kind text)
returns table (id bigint, body text, author text, source text, tags text[], liked boolean, saved boolean)
language sql
stable
set search_path = ''
as $$
  select q.id, q.body, q.author, q.source, q.tags,
    exists (select 1 from kotes.reactions l where l.reader_id = p_reader and l.quote_id = q.id and l.kind = 'like'),
    exists (select 1 from kotes.reactions s where s.reader_id = p_reader and s.quote_id = q.id and s.kind = 'save')
  from kotes.reactions r
  join kotes.quotes q on q.id = r.quote_id
  where r.reader_id = p_reader and r.kind = p_kind
  order by r.created_at desc;
$$;

revoke all on all functions in schema kotes from public, anon, authenticated;

-- ── Housekeeping ────────────────────────────────────────────
-- Expired codes and sessions are deleted by the server as it goes;
-- this is here for a manual sweep or a pg_cron job.
create or replace function kotes.sweep()
returns void
language sql
set search_path = ''
as $$
  delete from kotes.login_codes where created_at < now() - interval '1 day';
  delete from kotes.sessions where expires_at < now();
$$;
