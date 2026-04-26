create or replace function public.request_friendship(target_user_id uuid)
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
  current_user_id uuid := auth.uid();
  existing_row public.friendships%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if target_user_id is null then
    raise exception 'A target user is required.';
  end if;

  if target_user_id = current_user_id then
    raise exception 'You cannot friend yourself.';
  end if;

  select *
  into existing_row
  from public.friendships friendship
  where least(friendship.requester_id::text, friendship.addressee_id::text) = least(current_user_id::text, target_user_id::text)
    and greatest(friendship.requester_id::text, friendship.addressee_id::text) = greatest(current_user_id::text, target_user_id::text)
  limit 1;

  if found then
    if existing_row.status = 'accepted' then
      return query
      select friendship.id, friendship.requester_id, friendship.addressee_id, friendship.status, friendship.created_at
      from public.friendships friendship
      where friendship.id = existing_row.id;
      return;
    end if;

    if existing_row.status = 'pending' then
      if existing_row.requester_id = current_user_id then
        return query
        select friendship.id, friendship.requester_id, friendship.addressee_id, friendship.status, friendship.created_at
        from public.friendships friendship
        where friendship.id = existing_row.id;
        return;
      end if;

      if existing_row.addressee_id = current_user_id then
        update public.friendships
        set status = 'accepted'
        where id = existing_row.id;

        return query
        select friendship.id, friendship.requester_id, friendship.addressee_id, friendship.status, friendship.created_at
        from public.friendships friendship
        where friendship.id = existing_row.id;
        return;
      end if;
    end if;

    raise exception 'This friendship is currently blocked.';
  end if;

  return query
  insert into public.friendships (requester_id, addressee_id, status)
  values (current_user_id, target_user_id, 'pending')
  returning id, requester_id, addressee_id, status, created_at;
end;
$$;

create or replace function public.accept_friendship(friendship_id uuid)
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
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  return query
  update public.friendships friendship
  set status = 'accepted'
  where friendship.id = friendship_id
    and friendship.addressee_id = current_user_id
    and friendship.status = 'pending'
  returning friendship.id, friendship.requester_id, friendship.addressee_id, friendship.status, friendship.created_at;
end;
$$;

create or replace function public.delete_friendship(friendship_id uuid)
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
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  return query
  delete from public.friendships friendship
  where friendship.id = friendship_id
    and current_user_id in (friendship.requester_id, friendship.addressee_id)
  returning friendship.id, friendship.requester_id, friendship.addressee_id, friendship.status, friendship.created_at;
end;
$$;

create or replace function public.get_friend_hub(limit_count integer default 50)
returns table (
  friendship_id uuid,
  requester_id uuid,
  addressee_id uuid,
  status public.friendship_status,
  created_at timestamptz,
  direction text,
  other_user_id uuid,
  other_username text,
  other_display_name text,
  other_avatar_url text,
  other_home_state_id uuid,
  other_home_state_code text,
  other_home_state_name text,
  other_xp_total integer,
  other_quests_completed integer,
  other_reviews_count integer,
  other_hidden_gems_completed integer,
  other_title_name text
)
language sql
security definer
stable
set search_path = public
as $$
  with friendship_rows as (
    select
      friendship.id as friendship_id,
      friendship.requester_id,
      friendship.addressee_id,
      friendship.status,
      friendship.created_at,
      case
        when friendship.status = 'accepted' then 'friend'
        when friendship.requester_id = auth.uid() then 'outgoing'
        else 'incoming'
      end as direction,
      case
        when friendship.requester_id = auth.uid() then friendship.addressee_id
        else friendship.requester_id
      end as other_user_id
    from public.friendships friendship
    where auth.uid() in (friendship.requester_id, friendship.addressee_id)
      and friendship.status <> 'blocked'
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
    row.friendship_id,
    row.requester_id,
    row.addressee_id,
    row.status,
    row.created_at,
    row.direction,
    row.other_user_id,
    profile.username as other_username,
    profile.display_name as other_display_name,
    profile.avatar_url as other_avatar_url,
    profile.home_state_id as other_home_state_id,
    state.code as other_home_state_code,
    state.name as other_home_state_name,
    coalesce(aggregates.xp_total, 0)::integer as other_xp_total,
    coalesce(aggregates.quests_completed, 0)::integer as other_quests_completed,
    coalesce(aggregates.reviews_count, 0)::integer as other_reviews_count,
    coalesce(aggregates.hidden_gems_completed, 0)::integer as other_hidden_gems_completed,
    title.name as other_title_name
  from friendship_rows row
  inner join public.profiles profile
    on profile.id = row.other_user_id
  left join public.states state
    on state.id = profile.home_state_id
  left join aggregates
    on aggregates.user_id = profile.id
  left join lateral (
    select equipped_title.name
    from public.user_titles user_title
    inner join public.titles equipped_title
      on equipped_title.id = user_title.title_id
    where user_title.user_id = profile.id
      and user_title.is_equipped = true
    order by user_title.unlocked_at desc
    limit 1
  ) title on true
  order by
    case row.direction
      when 'incoming' then 0
      when 'outgoing' then 1
      else 2
    end,
    row.created_at desc
  limit greatest(limit_count, 1);
$$;

create or replace function public.search_profiles(search_query text, limit_count integer default 12)
returns table (
  user_id uuid,
  username text,
  display_name text,
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
    select nullif(lower(trim(search_query)), '') as query
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
    profile.display_name,
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
      or profile.username ilike '%' || normalized_query.query || '%'
      or profile.display_name ilike '%' || normalized_query.query || '%'
    )
  order by
    case
      when profile.username ilike normalized_query.query || '%' then 0
      when profile.display_name ilike normalized_query.query || '%' then 1
      else 2
    end,
    profile.display_name
  limit greatest(limit_count, 1);
$$;

create or replace function public.get_friend_activity_feed(limit_count integer default 12)
returns table (
  activity_id uuid,
  activity_type text,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  quest_id uuid,
  quest_title text,
  state_code text,
  created_at timestamptz,
  xp_awarded integer,
  rating integer,
  comment text
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
  completion_events as (
    select
      completion.id as activity_id,
      'quest_completed'::text as activity_type,
      profile.id as user_id,
      profile.username,
      profile.display_name,
      profile.avatar_url,
      completion.quest_id,
      quest.title as quest_title,
      state.code as state_code,
      completion.completed_at as created_at,
      completion.xp_awarded,
      null::integer as rating,
      null::text as comment
    from public.quest_completions completion
    inner join friend_ids friend
      on friend.user_id = completion.user_id
    inner join public.profiles profile
      on profile.id = completion.user_id
    inner join public.quests quest
      on quest.id = completion.quest_id
    inner join public.states state
      on state.id = quest.state_id
  ),
  review_events as (
    select
      review.id as activity_id,
      'review_posted'::text as activity_type,
      profile.id as user_id,
      profile.username,
      profile.display_name,
      profile.avatar_url,
      review.quest_id,
      quest.title as quest_title,
      state.code as state_code,
      review.created_at as created_at,
      null::integer as xp_awarded,
      review.rating,
      review.comment
    from public.reviews review
    inner join friend_ids friend
      on friend.user_id = review.user_id
    inner join public.profiles profile
      on profile.id = review.user_id
    inner join public.quests quest
      on quest.id = review.quest_id
    inner join public.states state
      on state.id = quest.state_id
    where review.status = 'visible'
  )
  select *
  from (
    select * from completion_events
    union all
    select * from review_events
  ) activities
  order by activities.created_at desc
  limit greatest(limit_count, 1);
$$;
