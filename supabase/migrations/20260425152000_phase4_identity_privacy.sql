create or replace function public.generate_friend_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := 'RV-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8));

    exit when not exists (
      select 1
      from public.profiles
      where friend_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

alter table public.profiles
  add column if not exists friend_code text;

update public.profiles
set friend_code = coalesce(friend_code, public.generate_friend_code())
where friend_code is null;

alter table public.profiles
  alter column friend_code set not null;

create unique index if not exists profiles_friend_code_idx
  on public.profiles (friend_code);

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

  insert into public.profiles (id, username, display_name, friend_code)
  values (
    new.id,
    left(base_username, 20) || '_' || substr(replace(new.id::text, '-', ''), 1, 6),
    coalesce(new.raw_user_meta_data ->> 'display_name', initcap(replace(base_username, '_', ' ')), 'Explorer'),
    public.generate_friend_code()
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop table if exists public.user_hidden_sponsored_quests cascade;

create table if not exists public.user_hidden_sponsored_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  quest_id uuid not null references public.quests (id) on delete cascade,
  hidden_at timestamptz not null default timezone('utc', now()),
  unique (user_id, quest_id)
);

create index if not exists user_hidden_sponsored_quests_user_idx
  on public.user_hidden_sponsored_quests (user_id, hidden_at desc);

alter table public.user_hidden_sponsored_quests enable row level security;

create policy "users read own hidden sponsored quests"
on public.user_hidden_sponsored_quests
for select
using (auth.uid() = user_id or public.is_admin());

create policy "users create own hidden sponsored quests"
on public.user_hidden_sponsored_quests
for insert
with check (auth.uid() = user_id or public.is_admin());

create policy "users delete own hidden sponsored quests"
on public.user_hidden_sponsored_quests
for delete
using (auth.uid() = user_id or public.is_admin());

create or replace function public.hide_sponsored_quest(target_quest_id uuid)
returns table (
  quest_id uuid,
  hidden_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  quest_row public.quests;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select *
  into quest_row
  from public.quests
  where id = target_quest_id;

  if quest_row is null or quest_row.is_sponsored = false then
    raise exception 'Only sponsored quests can be hidden.';
  end if;

  return query
  insert into public.user_hidden_sponsored_quests (user_id, quest_id)
  values (current_user_id, target_quest_id)
  on conflict (user_id, quest_id) do update
    set hidden_at = timezone('utc', now())
  returning public.user_hidden_sponsored_quests.quest_id, public.user_hidden_sponsored_quests.hidden_at;
end;
$$;

create or replace function public.reset_hidden_sponsored_quests()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  deleted_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  delete from public.user_hidden_sponsored_quests
  where user_id = current_user_id;

  get diagnostics deleted_count = row_count;

  return deleted_count;
end;
$$;

create or replace function public.request_friendship_by_code(friend_code text)
returns table (
  id uuid,
  requester_id uuid,
  addressee_id uuid,
  status public.friendship_status,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile public.profiles;
begin
  select *
  into target_profile
  from public.profiles
  where friend_code = upper(trim(friend_code));

  if target_profile is null then
    raise exception 'Friend code not found.';
  end if;

  return query
  select *
  from public.request_friendship(target_profile.id);
end;
$$;

drop function if exists public.search_profiles(text, integer);
create or replace function public.search_profiles(search_query text, limit_count integer default 12)
returns table (
  user_id uuid,
  username text,
  friend_code text,
  avatar_url text,
  home_state_id uuid,
  home_state_code text,
  home_state_name text,
  xp_total integer,
  quests_completed integer,
  reviews_count integer,
  hidden_gems_completed integer,
  relationship_status text
)
language sql
security definer
stable
set search_path = public
as $$
  with normalized_query as (
    select nullif(upper(trim(search_query)), '') as query
  ),
  aggregates as (
    select
      stats.user_id,
      coalesce(sum(stats.xp_total), 0)::integer as xp_total,
      coalesce(sum(stats.quests_completed), 0)::integer as quests_completed,
      coalesce(sum(stats.reviews_count), 0)::integer as reviews_count,
      coalesce(sum(stats.hidden_gems_completed), 0)::integer as hidden_gems_completed
    from public.user_state_stats stats
    group by stats.user_id
  )
  select
    profile.id as user_id,
    profile.username,
    profile.friend_code,
    profile.avatar_url,
    profile.home_state_id,
    state.code as home_state_code,
    state.name as home_state_name,
    coalesce(aggregates.xp_total, 0)::integer as xp_total,
    coalesce(aggregates.quests_completed, 0)::integer as quests_completed,
    coalesce(aggregates.reviews_count, 0)::integer as reviews_count,
    coalesce(aggregates.hidden_gems_completed, 0)::integer as hidden_gems_completed,
    case
      when friendship.status = 'accepted' then 'friend'
      when friendship.status = 'pending' and friendship.requester_id = auth.uid() then 'outgoing'
      when friendship.status = 'pending' and friendship.addressee_id = auth.uid() then 'incoming'
      when friendship.status = 'blocked' then 'blocked'
      else 'none'
    end as relationship_status
  from public.profiles profile
  cross join normalized_query
  left join public.states state
    on state.id = profile.home_state_id
  left join aggregates
    on aggregates.user_id = profile.id
  left join public.friendships friendship
    on least(friendship.requester_id::text, friendship.addressee_id::text) = least(profile.id::text, auth.uid()::text)
   and greatest(friendship.requester_id::text, friendship.addressee_id::text) = greatest(profile.id::text, auth.uid()::text)
  where profile.id <> auth.uid()
    and (
      normalized_query.query is null
      or upper(profile.username) ilike '%' || normalized_query.query || '%'
      or upper(profile.friend_code) ilike '%' || normalized_query.query || '%'
    )
  order by
    case
      when upper(profile.friend_code) = normalized_query.query then 0
      when upper(profile.username) = normalized_query.query then 1
      when upper(profile.username) ilike normalized_query.query || '%' then 2
      else 3
    end,
    profile.username
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
          profile.username asc
      ) as rank,
      stats.user_id,
      profile.username,
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
          aggregated.username asc
      ) as rank,
      aggregated.*
    from aggregated
  )
  select
    ranked.rank,
    ranked.user_id,
    ranked.username,
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
          aggregated.username asc
      ) as rank,
      aggregated.*
    from aggregated
  )
  select
    ranked.rank,
    ranked.user_id,
    ranked.username,
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
    profile.avatar_url,
    review.rating,
    review.comment,
    review.created_at,
    review.status
  order by review.created_at desc
  limit greatest(limit_count, 1);
$$;

