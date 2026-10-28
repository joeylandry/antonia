-- Self sign-up: the new trainer's profile also takes the time zone the sign-up
-- form sends (the browser's own zone), when it is a zone Postgres recognises.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  tz text := new.raw_user_meta_data ->> 'timezone';
begin
  insert into public.trainers (id, display_name, timezone)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80),
    case
      when tz is not null and char_length(tz) <= 64
        and exists (select 1 from pg_catalog.pg_timezone_names where name = tz) then tz
      else 'America/New_York'
    end
  );
  return new;
end $$;
