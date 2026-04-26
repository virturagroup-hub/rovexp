do $$
begin
  if not exists (select 1 from pg_type where typname = 'quest_candidate_status') then
    create type public.quest_candidate_status as enum ('draft', 'approved', 'rejected', 'published');
  end if;

  if not exists (select 1 from pg_type where typname = 'quest_candidate_generation_method') then
    create type public.quest_candidate_generation_method as enum ('rules', 'ai', 'manual');
  end if;
end
$$;

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  external_source text,
  external_id text,
  name text not null,
  description text,
  place_type text not null,
  latitude double precision not null,
  longitude double precision not null,
  address text,
  city text,
  state_id uuid references public.states (id) on delete set null,
  state_code text,
  rating numeric(3, 2),
  review_count integer,
  website text,
  phone text,
  image_url text,
  price_level integer,
  is_publicly_visitable boolean not null default true,
  is_active boolean not null default true,
  source_metadata jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint places_latitude_range check (latitude between -90 and 90),
  constraint places_longitude_range check (longitude between -180 and 180),
  constraint places_price_level_range check (price_level is null or price_level between 0 and 4),
  constraint places_review_count_nonnegative check (review_count is null or review_count >= 0),
  constraint places_state_code_format check (state_code is null or char_length(state_code) = 2)
);

create unique index if not exists places_external_ref_idx
  on public.places (external_source, external_id)
  where external_source is not null and external_id is not null;

create index if not exists places_state_idx on public.places (state_id, is_active);
create index if not exists places_type_idx on public.places (place_type, is_active);

create table if not exists public.quest_candidates (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  title text not null,
  description text not null,
  suggested_category_id uuid references public.quest_categories (id) on delete set null,
  suggested_rarity public.quest_rarity not null default 'common',
  suggested_xp_reward integer not null default 100,
  suggested_radius_meters integer not null default 120,
  discovery_type public.quest_discovery_type not null default 'popular',
  sponsor_business_id uuid references public.sponsor_businesses (id) on delete set null,
  generation_method public.quest_candidate_generation_method not null default 'rules',
  generation_notes jsonb,
  status public.quest_candidate_status not null default 'draft',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  published_quest_id uuid references public.quests (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint quest_candidates_title_length check (char_length(title) >= 3),
  constraint quest_candidates_description_length check (char_length(description) >= 12),
  constraint quest_candidates_radius_positive check (suggested_radius_meters between 25 and 5000),
  constraint quest_candidates_xp_positive check (suggested_xp_reward between 25 and 5000),
  constraint quest_candidates_review_state check (
    (status = 'draft' and reviewed_at is null and reviewed_by is null)
    or (status <> 'draft')
  )
);

create unique index if not exists quest_candidates_place_idx
  on public.quest_candidates (place_id);

create unique index if not exists quest_candidates_published_quest_idx
  on public.quest_candidates (published_quest_id)
  where published_quest_id is not null;

create index if not exists quest_candidates_status_idx
  on public.quest_candidates (status, updated_at desc);

alter table public.quests
  add column if not exists place_id uuid references public.places (id) on delete set null,
  add column if not exists quest_candidate_id uuid references public.quest_candidates (id) on delete set null;

create unique index if not exists quests_place_candidate_idx
  on public.quests (quest_candidate_id)
  where quest_candidate_id is not null;

drop trigger if exists set_places_updated_at on public.places;
create trigger set_places_updated_at
before update on public.places
for each row
execute function public.handle_updated_at();

drop trigger if exists set_quest_candidates_updated_at on public.quest_candidates;
create trigger set_quest_candidates_updated_at
before update on public.quest_candidates
for each row
execute function public.handle_updated_at();

alter table public.places enable row level security;
alter table public.quest_candidates enable row level security;

create policy "admins manage places"
on public.places
for all
using (public.is_admin())
with check (public.is_admin());

create policy "admins manage quest candidates"
on public.quest_candidates
for all
using (public.is_admin())
with check (public.is_admin());

insert into public.states (id, code, name)
values
  ('11111111-1111-1111-1111-111111111111', 'IL', 'Illinois'),
  ('22222222-2222-2222-2222-222222222222', 'CA', 'California'),
  ('33333333-3333-3333-3333-333333333333', 'CO', 'Colorado'),
  ('44444444-4444-4444-4444-444444444444', 'NY', 'New York'),
  ('55555555-5555-5555-5555-555555555555', 'TX', 'Texas'),
  ('66666666-6666-6666-6666-666666666666', 'WA', 'Washington'),
  ('00000000-0000-0000-0000-000000000007', 'AL', 'Alabama'),
  ('00000000-0000-0000-0000-000000000008', 'AK', 'Alaska'),
  ('00000000-0000-0000-0000-000000000009', 'AZ', 'Arizona'),
  ('00000000-0000-0000-0000-000000000010', 'AR', 'Arkansas'),
  ('00000000-0000-0000-0000-000000000011', 'CT', 'Connecticut'),
  ('00000000-0000-0000-0000-000000000012', 'DE', 'Delaware'),
  ('00000000-0000-0000-0000-000000000013', 'FL', 'Florida'),
  ('00000000-0000-0000-0000-000000000014', 'GA', 'Georgia'),
  ('00000000-0000-0000-0000-000000000015', 'HI', 'Hawaii'),
  ('00000000-0000-0000-0000-000000000016', 'ID', 'Idaho'),
  ('00000000-0000-0000-0000-000000000017', 'IN', 'Indiana'),
  ('00000000-0000-0000-0000-000000000018', 'IA', 'Iowa'),
  ('00000000-0000-0000-0000-000000000019', 'KS', 'Kansas'),
  ('00000000-0000-0000-0000-000000000020', 'KY', 'Kentucky'),
  ('00000000-0000-0000-0000-000000000021', 'LA', 'Louisiana'),
  ('00000000-0000-0000-0000-000000000022', 'ME', 'Maine'),
  ('00000000-0000-0000-0000-000000000023', 'MD', 'Maryland'),
  ('00000000-0000-0000-0000-000000000024', 'MA', 'Massachusetts'),
  ('00000000-0000-0000-0000-000000000025', 'MI', 'Michigan'),
  ('00000000-0000-0000-0000-000000000026', 'MN', 'Minnesota'),
  ('00000000-0000-0000-0000-000000000027', 'MS', 'Mississippi'),
  ('00000000-0000-0000-0000-000000000028', 'MO', 'Missouri'),
  ('00000000-0000-0000-0000-000000000029', 'MT', 'Montana'),
  ('00000000-0000-0000-0000-000000000030', 'NE', 'Nebraska'),
  ('00000000-0000-0000-0000-000000000031', 'NV', 'Nevada'),
  ('00000000-0000-0000-0000-000000000032', 'NH', 'New Hampshire'),
  ('00000000-0000-0000-0000-000000000033', 'NJ', 'New Jersey'),
  ('00000000-0000-0000-0000-000000000034', 'NM', 'New Mexico'),
  ('00000000-0000-0000-0000-000000000035', 'NC', 'North Carolina'),
  ('00000000-0000-0000-0000-000000000036', 'ND', 'North Dakota'),
  ('00000000-0000-0000-0000-000000000037', 'OH', 'Ohio'),
  ('00000000-0000-0000-0000-000000000038', 'OK', 'Oklahoma'),
  ('00000000-0000-0000-0000-000000000039', 'OR', 'Oregon'),
  ('00000000-0000-0000-0000-000000000040', 'PA', 'Pennsylvania'),
  ('00000000-0000-0000-0000-000000000041', 'RI', 'Rhode Island'),
  ('00000000-0000-0000-0000-000000000042', 'SC', 'South Carolina'),
  ('00000000-0000-0000-0000-000000000043', 'SD', 'South Dakota'),
  ('00000000-0000-0000-0000-000000000044', 'TN', 'Tennessee'),
  ('00000000-0000-0000-0000-000000000045', 'UT', 'Utah'),
  ('00000000-0000-0000-0000-000000000046', 'VT', 'Vermont'),
  ('00000000-0000-0000-0000-000000000047', 'VA', 'Virginia'),
  ('00000000-0000-0000-0000-000000000048', 'WV', 'West Virginia'),
  ('00000000-0000-0000-0000-000000000049', 'WI', 'Wisconsin'),
  ('00000000-0000-0000-0000-000000000050', 'WY', 'Wyoming')
on conflict (code) do update
  set name = excluded.name;
