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
  quest_row public.quests;
  acceptance_row public.quest_acceptances;
  existing_checkin public.quest_checkins;
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
  where public.quest_checkins.accepted_id = acceptance_row.id;

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
  where public.quest_checkins.accepted_id = acceptance_row.id;

  if checkin_row is null then
    raise exception 'Check in on-site before completing the quest.';
  end if;

  select *
  into existing_completion
  from public.quest_completions
  where public.quest_completions.accepted_id = acceptance_row.id;

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
