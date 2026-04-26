create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'quest_rarity') then
    create type public.quest_rarity as enum ('common', 'rare', 'epic', 'legendary');
  end if;

  if not exists (select 1 from pg_type where typname = 'friendship_status') then
    create type public.friendship_status as enum ('pending', 'accepted', 'blocked');
  end if;

  if not exists (select 1 from pg_type where typname = 'reward_type') then
    create type public.reward_type as enum ('perk', 'discount', 'collectible', 'experience_boost');
  end if;

  if not exists (select 1 from pg_type where typname = 'redemption_status') then
    create type public.redemption_status as enum ('pending', 'approved', 'fulfilled', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'admin_role') then
    create type public.admin_role as enum ('editor', 'manager', 'owner');
  end if;
end
$$;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.states (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  constraint states_code_format check (char_length(code) = 2)
);

create table if not exists public.quest_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  color_token text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  home_state_id uuid references public.states (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  preferred_radius_miles numeric(5, 2) not null default 8,
  allow_location boolean not null default true,
  allow_camera boolean not null default true,
  notifications_enabled boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint radius_positive check (preferred_radius_miles > 0 and preferred_radius_miles <= 50)
);

create table if not exists public.sponsor_businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  website text,
  logo_url text,
  email text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category_id uuid not null references public.quest_categories (id) on delete restrict,
  rarity public.quest_rarity not null default 'common',
  state_id uuid not null references public.states (id) on delete restrict,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters integer not null default 100,
  xp_reward integer not null default 100,
  image_url text,
  is_active boolean not null default true,
  is_sponsored boolean not null default false,
  sponsor_business_id uuid references public.sponsor_businesses (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint quests_latitude_range check (latitude between -90 and 90),
  constraint quests_longitude_range check (longitude between -180 and 180),
  constraint quests_radius_positive check (radius_meters between 25 and 5000),
  constraint quests_xp_positive check (xp_reward between 25 and 5000),
  constraint quests_sponsor_consistency check (
    (is_sponsored = true and sponsor_business_id is not null)
    or (is_sponsored = false and sponsor_business_id is null)
  )
);

create table if not exists public.quest_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  quest_id uuid not null references public.quests (id) on delete cascade,
  accepted_at timestamptz not null default timezone('utc', now()),
  unique (user_id, quest_id)
);

create table if not exists public.quest_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  quest_id uuid not null references public.quests (id) on delete cascade,
  accepted_id uuid not null unique references public.quest_acceptances (id) on delete cascade,
  checked_in_at timestamptz not null default timezone('utc', now()),
  latitude double precision not null,
  longitude double precision not null,
  constraint checkins_latitude_range check (latitude between -90 and 90),
  constraint checkins_longitude_range check (longitude between -180 and 180)
);

create table if not exists public.quest_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  quest_id uuid not null references public.quests (id) on delete cascade,
  accepted_id uuid not null unique references public.quest_acceptances (id) on delete cascade,
  checkin_id uuid not null unique references public.quest_checkins (id) on delete cascade,
  completed_at timestamptz not null default timezone('utc', now()),
  xp_awarded integer not null default 0,
  constraint completions_xp_nonnegative check (xp_awarded >= 0)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  quest_id uuid not null references public.quests (id) on delete cascade,
  completion_id uuid not null unique references public.quest_completions (id) on delete cascade,
  rating integer not null,
  comment text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint reviews_rating_range check (rating between 1 and 5)
);

create table if not exists public.review_photos (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (review_id, storage_path)
);

create table if not exists public.titles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  unlock_key text,
  metadata jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_titles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title_id uuid not null references public.titles (id) on delete cascade,
  unlocked_at timestamptz not null default timezone('utc', now()),
  is_equipped boolean not null default false,
  unique (user_id, title_id)
);

create unique index if not exists user_titles_single_equipped_idx
  on public.user_titles (user_id)
  where is_equipped = true;

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  icon_key text not null,
  criteria_key text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  unlocked_at timestamptz not null default timezone('utc', now()),
  is_featured boolean not null default false,
  unique (user_id, badge_id)
);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  reward_type public.reward_type not null,
  rule_json jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reward_id uuid not null references public.rewards (id) on delete cascade,
  redeemed_at timestamptz not null default timezone('utc', now()),
  status public.redemption_status not null default 'pending'
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  constraint friendships_not_self check (requester_id <> addressee_id)
);

create unique index if not exists friendships_unique_pair_idx
  on public.friendships (
    least(requester_id::text, addressee_id::text),
    greatest(requester_id::text, addressee_id::text)
  );

create table if not exists public.user_state_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  state_id uuid not null references public.states (id) on delete cascade,
  xp_total integer not null default 0,
  quests_completed integer not null default 0,
  hidden_gems_completed integer not null default 0,
  reviews_count integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, state_id),
  constraint state_stats_nonnegative check (
    xp_total >= 0
    and quests_completed >= 0
    and hidden_gems_completed >= 0
    and reviews_count >= 0
  )
);

create table if not exists public.admin_users (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role public.admin_role not null default 'editor',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists quests_active_state_idx on public.quests (is_active, state_id);
create index if not exists quests_sponsor_idx on public.quests (is_sponsored, sponsor_business_id);
create index if not exists quest_acceptances_user_idx on public.quest_acceptances (user_id, accepted_at desc);
create index if not exists quest_checkins_user_idx on public.quest_checkins (user_id, checked_in_at desc);
create index if not exists quest_completions_user_idx on public.quest_completions (user_id, completed_at desc);
create index if not exists reviews_quest_idx on public.reviews (quest_id, created_at desc);
create index if not exists user_state_stats_rank_idx on public.user_state_stats (state_id, xp_total desc, quests_completed desc);

create or replace function public.is_admin(check_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = check_user
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
begin
  base_username := lower(
    regexp_replace(
      coalesce(split_part(new.email, '@', 1), 'explorer'),
      '[^a-z0-9_]+',
      '',
      'g'
    )
  );

  if base_username = '' then
    base_username := 'explorer';
  end if;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    left(base_username, 20) || '_' || substr(replace(new.id::text, '-', ''), 1, 6),
    coalesce(new.raw_user_meta_data ->> 'display_name', initcap(replace(base_username, '_', ' ')), 'Explorer')
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.validate_quest_checkin()
returns trigger
language plpgsql
as $$
declare
  acceptance_row public.quest_acceptances;
begin
  select *
  into acceptance_row
  from public.quest_acceptances
  where id = new.accepted_id;

  if acceptance_row is null then
    raise exception 'Quest must be accepted before check-in.';
  end if;

  if acceptance_row.user_id <> new.user_id or acceptance_row.quest_id <> new.quest_id then
    raise exception 'Check-in does not match acceptance context.';
  end if;

  return new;
end;
$$;

create or replace function public.validate_quest_completion()
returns trigger
language plpgsql
as $$
declare
  acceptance_row public.quest_acceptances;
  checkin_row public.quest_checkins;
  quest_row public.quests;
begin
  select * into acceptance_row from public.quest_acceptances where id = new.accepted_id;
  select * into checkin_row from public.quest_checkins where id = new.checkin_id;
  select * into quest_row from public.quests where id = new.quest_id;

  if acceptance_row is null then
    raise exception 'Quest must be accepted before completion.';
  end if;

  if checkin_row is null then
    raise exception 'Quest must be checked in before completion.';
  end if;

  if acceptance_row.user_id <> new.user_id or acceptance_row.quest_id <> new.quest_id then
    raise exception 'Completion does not match accepted quest.';
  end if;

  if checkin_row.user_id <> new.user_id or checkin_row.quest_id <> new.quest_id then
    raise exception 'Completion does not match checked-in quest.';
  end if;

  if checkin_row.accepted_id <> new.accepted_id then
    raise exception 'Completion must reference the matching accepted quest.';
  end if;

  new.xp_awarded := case
    when new.xp_awarded > 0 then new.xp_awarded
    else quest_row.xp_reward
  end;

  return new;
end;
$$;

create or replace function public.validate_review_completion()
returns trigger
language plpgsql
as $$
declare
  completion_row public.quest_completions;
begin
  select *
  into completion_row
  from public.quest_completions
  where id = new.completion_id;

  if completion_row is null then
    raise exception 'Quest must be completed before review.';
  end if;

  if completion_row.user_id <> new.user_id or completion_row.quest_id <> new.quest_id then
    raise exception 'Review does not match completion context.';
  end if;

  return new;
end;
$$;

create or replace function public.sync_state_stats_on_completion()
returns trigger
language plpgsql
as $$
declare
  quest_row public.quests;
  hidden_gem_increment integer;
begin
  select *
  into quest_row
  from public.quests
  where id = new.quest_id;

  hidden_gem_increment := case
    when quest_row.rarity in ('epic', 'legendary') then 1
    else 0
  end;

  insert into public.user_state_stats (
    user_id,
    state_id,
    xp_total,
    quests_completed,
    hidden_gems_completed,
    reviews_count,
    updated_at
  )
  values (
    new.user_id,
    quest_row.state_id,
    new.xp_awarded,
    1,
    hidden_gem_increment,
    0,
    timezone('utc', now())
  )
  on conflict (user_id, state_id) do update
    set xp_total = public.user_state_stats.xp_total + excluded.xp_total,
        quests_completed = public.user_state_stats.quests_completed + excluded.quests_completed,
        hidden_gems_completed = public.user_state_stats.hidden_gems_completed + excluded.hidden_gems_completed,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

create or replace function public.sync_state_stats_on_review()
returns trigger
language plpgsql
as $$
declare
  quest_state_id uuid;
begin
  select state_id
  into quest_state_id
  from public.quests
  where id = new.quest_id;

  insert into public.user_state_stats (
    user_id,
    state_id,
    xp_total,
    quests_completed,
    hidden_gems_completed,
    reviews_count,
    updated_at
  )
  values (
    new.user_id,
    quest_state_id,
    0,
    0,
    0,
    1,
    timezone('utc', now())
  )
  on conflict (user_id, state_id) do update
    set reviews_count = public.user_state_stats.reviews_count + 1,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at
before update on public.user_settings
for each row
execute function public.handle_updated_at();

drop trigger if exists set_sponsor_businesses_updated_at on public.sponsor_businesses;
create trigger set_sponsor_businesses_updated_at
before update on public.sponsor_businesses
for each row
execute function public.handle_updated_at();

drop trigger if exists set_quests_updated_at on public.quests;
create trigger set_quests_updated_at
before update on public.quests
for each row
execute function public.handle_updated_at();

drop trigger if exists set_reviews_updated_at on public.reviews;
create trigger set_reviews_updated_at
before update on public.reviews
for each row
execute function public.handle_updated_at();

drop trigger if exists set_titles_updated_at on public.titles;
create trigger set_titles_updated_at
before update on public.titles
for each row
execute function public.handle_updated_at();

drop trigger if exists set_badges_updated_at on public.badges;
create trigger set_badges_updated_at
before update on public.badges
for each row
execute function public.handle_updated_at();

drop trigger if exists set_rewards_updated_at on public.rewards;
create trigger set_rewards_updated_at
before update on public.rewards
for each row
execute function public.handle_updated_at();

drop trigger if exists validate_checkin_before_insert on public.quest_checkins;
create trigger validate_checkin_before_insert
before insert on public.quest_checkins
for each row
execute function public.validate_quest_checkin();

drop trigger if exists validate_completion_before_insert on public.quest_completions;
create trigger validate_completion_before_insert
before insert on public.quest_completions
for each row
execute function public.validate_quest_completion();

drop trigger if exists validate_review_before_insert on public.reviews;
create trigger validate_review_before_insert
before insert on public.reviews
for each row
execute function public.validate_review_completion();

drop trigger if exists sync_state_stats_completion_after_insert on public.quest_completions;
create trigger sync_state_stats_completion_after_insert
after insert on public.quest_completions
for each row
execute function public.sync_state_stats_on_completion();

drop trigger if exists sync_state_stats_review_after_insert on public.reviews;
create trigger sync_state_stats_review_after_insert
after insert on public.reviews
for each row
execute function public.sync_state_stats_on_review();

alter table public.states enable row level security;
alter table public.quest_categories enable row level security;
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.sponsor_businesses enable row level security;
alter table public.quests enable row level security;
alter table public.quest_acceptances enable row level security;
alter table public.quest_checkins enable row level security;
alter table public.quest_completions enable row level security;
alter table public.reviews enable row level security;
alter table public.review_photos enable row level security;
alter table public.titles enable row level security;
alter table public.user_titles enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.friendships enable row level security;
alter table public.user_state_stats enable row level security;
alter table public.admin_users enable row level security;

create policy "states are readable by everyone"
on public.states
for select
using (true);

create policy "quest categories are readable by everyone"
on public.quest_categories
for select
using (true);

create policy "admins manage quest categories"
on public.quest_categories
for all
using (public.is_admin())
with check (public.is_admin());

create policy "users read own profile"
on public.profiles
for select
using (auth.uid() = id or public.is_admin());

create policy "users update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "users read own settings"
on public.user_settings
for select
using (auth.uid() = user_id or public.is_admin());

create policy "users upsert own settings"
on public.user_settings
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "public reads active sponsors"
on public.sponsor_businesses
for select
using (is_active = true or public.is_admin());

create policy "admins insert sponsors"
on public.sponsor_businesses
for insert
with check (public.is_admin());

create policy "admins update sponsors"
on public.sponsor_businesses
for update
using (public.is_admin())
with check (public.is_admin());

create policy "admins delete sponsors"
on public.sponsor_businesses
for delete
using (public.is_admin());

create policy "public reads active quests"
on public.quests
for select
using (is_active = true or public.is_admin());

create policy "admins insert quests"
on public.quests
for insert
with check (public.is_admin());

create policy "admins update quests"
on public.quests
for update
using (public.is_admin())
with check (public.is_admin());

create policy "admins delete quests"
on public.quests
for delete
using (public.is_admin());

create policy "users read own acceptances"
on public.quest_acceptances
for select
using (auth.uid() = user_id or public.is_admin());

create policy "users accept own quests"
on public.quest_acceptances
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.quests
    where id = quest_id
      and is_active = true
  )
);

create policy "users read own checkins"
on public.quest_checkins
for select
using (auth.uid() = user_id or public.is_admin());

create policy "users create own checkins"
on public.quest_checkins
for insert
with check (auth.uid() = user_id);

create policy "users read own completions"
on public.quest_completions
for select
using (auth.uid() = user_id or public.is_admin());

create policy "users create own completions"
on public.quest_completions
for insert
with check (auth.uid() = user_id);

create policy "reviews readable by everyone"
on public.reviews
for select
using (true);

create policy "users insert own reviews"
on public.reviews
for insert
with check (auth.uid() = user_id);

create policy "users update own reviews"
on public.reviews
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users read their review photos"
on public.review_photos
for select
using (
  exists (
    select 1
    from public.reviews
    where reviews.id = review_id
      and (reviews.user_id = auth.uid() or public.is_admin())
  )
);

create policy "users create their review photos"
on public.review_photos
for insert
with check (
  exists (
    select 1
    from public.reviews
    where reviews.id = review_id
      and reviews.user_id = auth.uid()
  )
);

create policy "public reads active titles"
on public.titles
for select
using (is_active = true or public.is_admin());

create policy "admins manage titles"
on public.titles
for all
using (public.is_admin())
with check (public.is_admin());

create policy "users read own titles"
on public.user_titles
for select
using (auth.uid() = user_id or public.is_admin());

create policy "public reads active badges"
on public.badges
for select
using (is_active = true or public.is_admin());

create policy "admins manage badges"
on public.badges
for all
using (public.is_admin())
with check (public.is_admin());

create policy "users read own badges"
on public.user_badges
for select
using (auth.uid() = user_id or public.is_admin());

create policy "public reads active rewards"
on public.rewards
for select
using (is_active = true or public.is_admin());

create policy "admins manage rewards"
on public.rewards
for all
using (public.is_admin())
with check (public.is_admin());

create policy "users read own reward redemptions"
on public.reward_redemptions
for select
using (auth.uid() = user_id or public.is_admin());

create policy "users create own reward redemptions"
on public.reward_redemptions
for insert
with check (auth.uid() = user_id);

create policy "users read their friendships"
on public.friendships
for select
using (auth.uid() in (requester_id, addressee_id) or public.is_admin());

create policy "users create friendships as requester"
on public.friendships
for insert
with check (auth.uid() = requester_id);

create policy "participants update friendships"
on public.friendships
for update
using (auth.uid() in (requester_id, addressee_id))
with check (auth.uid() in (requester_id, addressee_id));

create policy "users read leaderboard rows"
on public.user_state_stats
for select
using (auth.uid() is not null or public.is_admin());

create policy "users read own admin membership"
on public.admin_users
for select
using (auth.uid() = user_id or public.is_admin());

insert into storage.buckets (id, name, public)
values
  ('quest-images', 'quest-images', true),
  ('sponsor-assets', 'sponsor-assets', true),
  ('review-photos', 'review-photos', false)
on conflict (id) do nothing;

create policy "quest images are publicly readable"
on storage.objects
for select
using (bucket_id = 'quest-images');

create policy "sponsor assets are publicly readable"
on storage.objects
for select
using (bucket_id = 'sponsor-assets');

create policy "admins manage quest image objects"
on storage.objects
for all
using (bucket_id in ('quest-images', 'sponsor-assets') and public.is_admin())
with check (bucket_id in ('quest-images', 'sponsor-assets') and public.is_admin());

create policy "users manage own review photo objects"
on storage.objects
for all
using (
  bucket_id = 'review-photos'
  and (
    public.is_admin()
    or auth.uid()::text = (storage.foldername(name))[1]
  )
)
with check (
  bucket_id = 'review-photos'
  and (
    public.is_admin()
    or auth.uid()::text = (storage.foldername(name))[1]
  )
);
