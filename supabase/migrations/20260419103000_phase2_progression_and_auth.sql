do $$
begin
  if not exists (select 1 from pg_type where typname = 'quest_discovery_type') then
    create type public.quest_discovery_type as enum ('popular', 'hidden_gem', 'featured_route');
  end if;

  if not exists (select 1 from pg_type where typname = 'review_status') then
    create type public.review_status as enum ('visible', 'hidden', 'flagged');
  end if;
end
$$;

alter table public.user_settings
  add column if not exists category_preferences text[] not null default '{}',
  add column if not exists rarity_preferences public.quest_rarity[] not null default '{}',
  add column if not exists sponsor_filter text not null default 'all',
  add column if not exists discovery_preferences public.quest_discovery_type[] not null default '{}';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_settings_sponsor_filter_check'
  ) then
    alter table public.user_settings
      add constraint user_settings_sponsor_filter_check
      check (sponsor_filter in ('all', 'sponsored', 'regular'));
  end if;
end
$$;

alter table public.quests
  add column if not exists discovery_type public.quest_discovery_type not null default 'popular',
  add column if not exists is_featured boolean not null default false;

alter table public.reviews
  add column if not exists status public.review_status not null default 'visible',
  add column if not exists moderation_reason text,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references public.profiles (id) on delete set null;

create index if not exists quests_active_discovery_idx
  on public.quests (is_active, discovery_type, is_featured);

create index if not exists reviews_status_idx
  on public.reviews (status, created_at desc);

create index if not exists friendships_status_idx
  on public.friendships (status, requester_id, addressee_id);

create or replace function public.distance_meters(
  from_lat double precision,
  from_lng double precision,
  to_lat double precision,
  to_lng double precision
)
returns double precision
language sql
immutable
strict
as $$
  select 2 * 6371000 * asin(
    sqrt(
      power(sin(radians((to_lat - from_lat) / 2)), 2)
      + cos(radians(from_lat))
      * cos(radians(to_lat))
      * power(sin(radians((to_lng - from_lng) / 2)), 2)
    )
  );
$$;

create or replace function public.validate_quest_checkin()
returns trigger
language plpgsql
as $$
declare
  acceptance_row public.quest_acceptances;
  quest_row public.quests;
  computed_distance integer;
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

  select *
  into quest_row
  from public.quests
  where id = new.quest_id;

  if quest_row is null or quest_row.is_active = false then
    raise exception 'Quest is no longer active for check-in.';
  end if;

  computed_distance := round(
    public.distance_meters(
      new.latitude,
      new.longitude,
      quest_row.latitude,
      quest_row.longitude
    )
  );

  if computed_distance > quest_row.radius_meters then
    raise exception using
      message = 'You are outside the quest check-in radius.',
      detail = format(
        'distance_meters=%s radius_meters=%s',
        computed_distance,
        quest_row.radius_meters
      );
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

  if quest_row is null then
    raise exception 'Quest context could not be found.';
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

  new.xp_awarded := quest_row.xp_reward;

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
    when quest_row.discovery_type = 'hidden_gem' then 1
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

create or replace function public.check_in_to_quest(
  target_quest_id uuid,
  submitted_latitude double precision,
  submitted_longitude double precision
)
returns table (
  checkin_id uuid,
  accepted_id uuid,
  checked_in_at timestamptz,
  distance_meters integer,
  radius_meters integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  acceptance_row public.quest_acceptances;
  existing_checkin public.quest_checkins;
  quest_row public.quests;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication is required for quest check-in.';
  end if;

  select *
  into quest_row
  from public.quests
  where id = target_quest_id;

  if quest_row is null or quest_row.is_active = false then
    raise exception 'Quest is not active.';
  end if;

  select *
  into acceptance_row
  from public.quest_acceptances
  where user_id = current_user_id
    and quest_id = target_quest_id;

  if acceptance_row is null then
    raise exception 'Accept the quest before checking in.';
  end if;

  select *
  into existing_checkin
  from public.quest_checkins
  where accepted_id = acceptance_row.id;

  if existing_checkin is not null then
    return query
    select
      existing_checkin.id,
      existing_checkin.accepted_id,
      existing_checkin.checked_in_at,
      round(
        public.distance_meters(
          submitted_latitude,
          submitted_longitude,
          quest_row.latitude,
          quest_row.longitude
        )
      )::integer,
      quest_row.radius_meters;
    return;
  end if;

  insert into public.quest_checkins (
    user_id,
    quest_id,
    accepted_id,
    latitude,
    longitude
  )
  values (
    current_user_id,
    target_quest_id,
    acceptance_row.id,
    submitted_latitude,
    submitted_longitude
  )
  returning
    public.quest_checkins.id,
    public.quest_checkins.accepted_id,
    public.quest_checkins.checked_in_at,
    round(
      public.distance_meters(
        submitted_latitude,
        submitted_longitude,
        quest_row.latitude,
        quest_row.longitude
      )
    )::integer,
    quest_row.radius_meters
  into checkin_id, accepted_id, checked_in_at, distance_meters, radius_meters;

  return next;
end;
$$;

create or replace function public.complete_quest_session(target_quest_id uuid)
returns table (
  completion_id uuid,
  accepted_id uuid,
  checkin_id uuid,
  completed_at timestamptz,
  xp_awarded integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  acceptance_row public.quest_acceptances;
  checkin_row public.quest_checkins;
  existing_completion public.quest_completions;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication is required to complete a quest.';
  end if;

  select *
  into acceptance_row
  from public.quest_acceptances
  where user_id = current_user_id
    and quest_id = target_quest_id;

  if acceptance_row is null then
    raise exception 'Accept the quest before completing it.';
  end if;

  select *
  into checkin_row
  from public.quest_checkins
  where accepted_id = acceptance_row.id;

  if checkin_row is null then
    raise exception 'Check in on-site before completing the quest.';
  end if;

  select *
  into existing_completion
  from public.quest_completions
  where accepted_id = acceptance_row.id;

  if existing_completion is not null then
    return query
    select
      existing_completion.id,
      existing_completion.accepted_id,
      existing_completion.checkin_id,
      existing_completion.completed_at,
      existing_completion.xp_awarded;
    return;
  end if;

  insert into public.quest_completions (
    user_id,
    quest_id,
    accepted_id,
    checkin_id
  )
  values (
    current_user_id,
    target_quest_id,
    acceptance_row.id,
    checkin_row.id
  )
  returning
    public.quest_completions.id,
    public.quest_completions.accepted_id,
    public.quest_completions.checkin_id,
    public.quest_completions.completed_at,
    public.quest_completions.xp_awarded
  into completion_id, accepted_id, checkin_id, completed_at, xp_awarded;

  return next;
end;
$$;

create or replace function public.get_my_quest_progress()
returns table (
  quest_id uuid,
  status text,
  accepted_id uuid,
  accepted_at timestamptz,
  checkin_id uuid,
  checked_in_at timestamptz,
  completion_id uuid,
  completed_at timestamptz,
  review_id uuid
)
language sql
security definer
stable
set search_path = public
as $$
  select
    acceptance.quest_id,
    case
      when review.id is not null then 'reviewed'
      when completion.id is not null then 'completed'
      when checkin.id is not null then 'checked_in'
      else 'accepted'
    end as status,
    acceptance.id as accepted_id,
    acceptance.accepted_at,
    checkin.id as checkin_id,
    checkin.checked_in_at,
    completion.id as completion_id,
    completion.completed_at,
    review.id as review_id
  from public.quest_acceptances acceptance
  left join public.quest_checkins checkin
    on checkin.accepted_id = acceptance.id
  left join public.quest_completions completion
    on completion.accepted_id = acceptance.id
  left join public.reviews review
    on review.completion_id = completion.id
  where acceptance.user_id = auth.uid();
$$;

create or replace function public.get_nearby_quests(
  user_latitude double precision,
  user_longitude double precision,
  target_state_code text default null,
  category_slugs text[] default null,
  rarity_filter public.quest_rarity[] default null,
  sponsor_mode text default 'all',
  discovery_filter public.quest_discovery_type[] default null,
  limit_count integer default 40
)
returns table (
  id uuid,
  title text,
  description text,
  category_id uuid,
  category_slug text,
  category_name text,
  category_color_token text,
  rarity public.quest_rarity,
  state_id uuid,
  state_code text,
  state_name text,
  latitude double precision,
  longitude double precision,
  radius_meters integer,
  xp_reward integer,
  image_url text,
  is_active boolean,
  is_sponsored boolean,
  sponsor_business_id uuid,
  sponsor_name text,
  sponsor_logo_url text,
  sponsor_description text,
  sponsor_website text,
  discovery_type public.quest_discovery_type,
  is_featured boolean,
  distance_meters double precision
)
language sql
security definer
stable
set search_path = public
as $$
  select
    quest.id,
    quest.title,
    quest.description,
    category.id as category_id,
    category.slug as category_slug,
    category.name as category_name,
    category.color_token as category_color_token,
    quest.rarity,
    state.id as state_id,
    state.code as state_code,
    state.name as state_name,
    quest.latitude,
    quest.longitude,
    quest.radius_meters,
    quest.xp_reward,
    quest.image_url,
    quest.is_active,
    quest.is_sponsored,
    sponsor.id as sponsor_business_id,
    sponsor.name as sponsor_name,
    sponsor.logo_url as sponsor_logo_url,
    sponsor.description as sponsor_description,
    sponsor.website as sponsor_website,
    quest.discovery_type,
    quest.is_featured,
    public.distance_meters(
      user_latitude,
      user_longitude,
      quest.latitude,
      quest.longitude
    ) as distance_meters
  from public.quests quest
  inner join public.quest_categories category
    on category.id = quest.category_id
  inner join public.states state
    on state.id = quest.state_id
  left join public.sponsor_businesses sponsor
    on sponsor.id = quest.sponsor_business_id
  where quest.is_active = true
    and (
      target_state_code is null
      or state.code = upper(target_state_code)
    )
    and (
      category_slugs is null
      or cardinality(category_slugs) = 0
      or category.slug = any(category_slugs)
    )
    and (
      rarity_filter is null
      or cardinality(rarity_filter) = 0
      or quest.rarity = any(rarity_filter)
    )
    and (
      discovery_filter is null
      or cardinality(discovery_filter) = 0
      or quest.discovery_type = any(discovery_filter)
    )
    and (
      sponsor_mode = 'all'
      or (sponsor_mode = 'sponsored' and quest.is_sponsored = true)
      or (sponsor_mode = 'regular' and quest.is_sponsored = false)
    )
  order by
    public.distance_meters(
      user_latitude,
      user_longitude,
      quest.latitude,
      quest.longitude
    ) asc,
    quest.is_featured desc,
    quest.updated_at desc
  limit greatest(limit_count, 1);
$$;

create or replace function public.get_state_leaderboard(
  selected_state_id uuid default null,
  limit_count integer default 25
)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  title_name text,
  state_id uuid,
  state_code text,
  state_name text,
  xp_total integer,
  quests_completed integer,
  reviews_count integer,
  hidden_gems_completed integer,
  is_self boolean
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  resolved_state_id uuid;
begin
  resolved_state_id := coalesce(
    selected_state_id,
    (
      select home_state_id
      from public.profiles
      where id = auth.uid()
    )
  );

  if resolved_state_id is null then
    return;
  end if;

  return query
  with ranked_rows as (
    select
      row_number() over (
        order by
          stats.xp_total desc,
          stats.quests_completed desc,
          stats.reviews_count desc,
          profile.display_name asc
      ) as rank,
      stats.user_id,
      profile.username,
      profile.display_name,
      profile.avatar_url,
      title.name as title_name,
      stats.state_id,
      state.code as state_code,
      state.name as state_name,
      stats.xp_total,
      stats.quests_completed,
      stats.reviews_count,
      stats.hidden_gems_completed,
      stats.user_id = auth.uid() as is_self
    from public.user_state_stats stats
    inner join public.profiles profile
      on profile.id = stats.user_id
    inner join public.states state
      on state.id = stats.state_id
    left join public.user_titles user_title
      on user_title.user_id = stats.user_id
      and user_title.is_equipped = true
    left join public.titles title
      on title.id = user_title.title_id
    where stats.state_id = resolved_state_id
  )
  select *
  from ranked_rows
  order by rank
  limit greatest(limit_count, 1);
end;
$$;

create or replace function public.get_friends_leaderboard(limit_count integer default 25)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  title_name text,
  xp_total integer,
  quests_completed integer,
  reviews_count integer,
  hidden_gems_completed integer,
  is_self boolean
)
language sql
security definer
stable
set search_path = public
as $$
  with friend_ids as (
    select auth.uid() as user_id
    union
    select
      case
        when friendship.requester_id = auth.uid() then friendship.addressee_id
        else friendship.requester_id
      end as user_id
    from public.friendships friendship
    where friendship.status = 'accepted'
      and auth.uid() in (friendship.requester_id, friendship.addressee_id)
  ),
  aggregated as (
    select
      profile.id as user_id,
      profile.username,
      profile.display_name,
      profile.avatar_url,
      coalesce(sum(stats.xp_total), 0)::integer as xp_total,
      coalesce(sum(stats.quests_completed), 0)::integer as quests_completed,
      coalesce(sum(stats.reviews_count), 0)::integer as reviews_count,
      coalesce(sum(stats.hidden_gems_completed), 0)::integer as hidden_gems_completed,
      title.name as title_name,
      profile.id = auth.uid() as is_self
    from friend_ids friend
    inner join public.profiles profile
      on profile.id = friend.user_id
    left join public.user_state_stats stats
      on stats.user_id = profile.id
    left join public.user_titles user_title
      on user_title.user_id = profile.id
      and user_title.is_equipped = true
    left join public.titles title
      on title.id = user_title.title_id
    group by
      profile.id,
      profile.username,
      profile.display_name,
      profile.avatar_url,
      title.name
  ),
  ranked as (
    select
      row_number() over (
        order by
          aggregated.xp_total desc,
          aggregated.quests_completed desc,
          aggregated.reviews_count desc,
          aggregated.display_name asc
      ) as rank,
      aggregated.*
    from aggregated
  )
  select
    ranked.rank,
    ranked.user_id,
    ranked.username,
    ranked.display_name,
    ranked.avatar_url,
    ranked.title_name,
    ranked.xp_total,
    ranked.quests_completed,
    ranked.reviews_count,
    ranked.hidden_gems_completed,
    ranked.is_self
  from ranked
  order by ranked.rank
  limit greatest(limit_count, 1);
$$;

create or replace function public.get_weekly_leaderboard(
  selected_state_id uuid default null,
  limit_count integer default 25
)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  title_name text,
  xp_total integer,
  quests_completed integer,
  reviews_count integer,
  hidden_gems_completed integer,
  is_self boolean
)
language sql
security definer
stable
set search_path = public
as $$
  with weekly_completions as (
    select
      completion.user_id,
      coalesce(sum(completion.xp_awarded), 0)::integer as xp_total,
      count(*)::integer as quests_completed,
      sum(
        case
          when quest.discovery_type = 'hidden_gem' then 1
          else 0
        end
      )::integer as hidden_gems_completed
    from public.quest_completions completion
    inner join public.quests quest
      on quest.id = completion.quest_id
    where completion.completed_at >= timezone('utc', now()) - interval '7 days'
      and (
        selected_state_id is null
        or quest.state_id = selected_state_id
      )
    group by completion.user_id
  ),
  weekly_reviews as (
    select
      review.user_id,
      count(*)::integer as reviews_count
    from public.reviews review
    inner join public.quests quest
      on quest.id = review.quest_id
    where review.created_at >= timezone('utc', now()) - interval '7 days'
      and review.status = 'visible'
      and (
        selected_state_id is null
        or quest.state_id = selected_state_id
      )
    group by review.user_id
  ),
  aggregated as (
    select
      profile.id as user_id,
      profile.username,
      profile.display_name,
      profile.avatar_url,
      coalesce(completions.xp_total, 0)::integer as xp_total,
      coalesce(completions.quests_completed, 0)::integer as quests_completed,
      coalesce(reviews.reviews_count, 0)::integer as reviews_count,
      coalesce(completions.hidden_gems_completed, 0)::integer as hidden_gems_completed,
      title.name as title_name,
      profile.id = auth.uid() as is_self
    from public.profiles profile
    left join weekly_completions completions
      on completions.user_id = profile.id
    left join weekly_reviews reviews
      on reviews.user_id = profile.id
    left join public.user_titles user_title
      on user_title.user_id = profile.id
      and user_title.is_equipped = true
    left join public.titles title
      on title.id = user_title.title_id
    where coalesce(completions.xp_total, 0) > 0
       or coalesce(completions.quests_completed, 0) > 0
       or coalesce(reviews.reviews_count, 0) > 0
  ),
  ranked as (
    select
      row_number() over (
        order by
          aggregated.xp_total desc,
          aggregated.quests_completed desc,
          aggregated.reviews_count desc,
          aggregated.display_name asc
      ) as rank,
      aggregated.*
    from aggregated
  )
  select
    ranked.rank,
    ranked.user_id,
    ranked.username,
    ranked.display_name,
    ranked.avatar_url,
    ranked.title_name,
    ranked.xp_total,
    ranked.quests_completed,
    ranked.reviews_count,
    ranked.hidden_gems_completed,
    ranked.is_self
  from ranked
  order by ranked.rank
  limit greatest(limit_count, 1);
$$;

create or replace function public.get_quest_reviews(
  target_quest_id uuid,
  limit_count integer default 6
)
returns table (
  review_id uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  rating integer,
  comment text,
  created_at timestamptz,
  status public.review_status,
  photo_paths text[]
)
language sql
security definer
stable
set search_path = public
as $$
  select
    review.id as review_id,
    review.user_id,
    profile.username,
    profile.display_name,
    profile.avatar_url,
    review.rating,
    review.comment,
    review.created_at,
    review.status,
    array_remove(array_agg(distinct photo.storage_path), null) as photo_paths
  from public.reviews review
  inner join public.profiles profile
    on profile.id = review.user_id
  left join public.review_photos photo
    on photo.review_id = review.id
  where review.quest_id = target_quest_id
    and (
      review.status = 'visible'
      or review.user_id = auth.uid()
      or public.is_admin()
    )
  group by
    review.id,
    review.user_id,
    profile.username,
    profile.display_name,
    profile.avatar_url,
    review.rating,
    review.comment,
    review.created_at,
    review.status
  order by review.created_at desc
  limit greatest(limit_count, 1);
$$;

drop policy if exists "reviews readable by everyone" on public.reviews;
create policy "visible reviews are readable"
on public.reviews
for select
using (
  status = 'visible'
  or auth.uid() = user_id
  or public.is_admin()
);

create policy "admins moderate reviews"
on public.reviews
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "users read their review photos" on public.review_photos;
create policy "visible review photos are readable"
on public.review_photos
for select
using (
  exists (
    select 1
    from public.reviews
    where reviews.id = review_id
      and (
        reviews.status = 'visible'
        or reviews.user_id = auth.uid()
        or public.is_admin()
      )
  )
);

drop policy if exists "users manage own review photo objects" on storage.objects;

create policy "visible review photo objects are readable"
on storage.objects
for select
using (
  bucket_id = 'review-photos'
  and (
    public.is_admin()
    or auth.uid()::text = (storage.foldername(name))[1]
    or exists (
      select 1
      from public.review_photos photo
      inner join public.reviews review
        on review.id = photo.review_id
      where photo.storage_path = name
        and (
          review.status = 'visible'
          or review.user_id = auth.uid()
          or public.is_admin()
        )
    )
  )
);

create policy "users upload own review photo objects"
on storage.objects
for insert
with check (
  bucket_id = 'review-photos'
  and (
    public.is_admin()
    or auth.uid()::text = (storage.foldername(name))[1]
  )
);

create policy "users update own review photo objects"
on storage.objects
for update
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

create policy "users delete own review photo objects"
on storage.objects
for delete
using (
  bucket_id = 'review-photos'
  and (
    public.is_admin()
    or auth.uid()::text = (storage.foldername(name))[1]
  )
);
