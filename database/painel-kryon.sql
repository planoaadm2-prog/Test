-- Painel independente da Kryon. Execute este arquivo inteiro no SQL Editor do Supabase.
begin;

create table if not exists public.kryon_admins(
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default clock_timestamp()
);
alter table public.kryon_admins enable row level security;
revoke all on public.kryon_admins from public,anon,authenticated;

insert into public.kryon_admins(user_id)
select id from auth.users where lower(email)=lower('guilhermesena7@outlook.com.br')
on conflict(user_id) do nothing;

create or replace function public.is_kryon_admin()
returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.kryon_admins where user_id=auth.uid());
$$;
revoke all on function public.is_kryon_admin() from public,anon;
grant execute on function public.is_kryon_admin() to authenticated;

create table if not exists public.kryon_usage_events(
 id bigint generated always as identity primary key,
 event_type text not null check(event_type in ('client_login','staff_login')),
 user_id uuid not null references auth.users(id) on delete cascade,
 happened_at timestamptz not null default clock_timestamp()
);
create index if not exists kryon_usage_events_time_idx on public.kryon_usage_events(happened_at desc);
alter table public.kryon_usage_events enable row level security;
revoke all on public.kryon_usage_events from public,anon,authenticated;

create or replace function public.track_kryon_usage(p_event text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or p_event not in ('client_login','staff_login') then return;end if;
 if not exists(select 1 from public.kryon_usage_events where user_id=auth.uid() and event_type=p_event and happened_at>clock_timestamp()-interval '10 minutes') then
  insert into public.kryon_usage_events(event_type,user_id) values(p_event,auth.uid());
 end if;
end;$$;
revoke all on function public.track_kryon_usage(text) from public,anon;
grant execute on function public.track_kryon_usage(text) to authenticated;

create or replace function public.kryon_dashboard(p_start date,p_end date)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_kryon_admin() then raise exception 'Acesso permitido somente à Kryon.';end if;
 if p_start is null or p_end is null or p_start>p_end or p_end-p_start>366 then raise exception 'Período inválido.';end if;
 select jsonb_build_object(
  'generated_at',clock_timestamp(),
  'totals',jsonb_build_object(
   'bookings',(select count(*) from public.bookings b where (b.created_at at time zone 'America/Manaus')::date between p_start and p_end),
   'confirmed',(select count(*) from public.bookings b where b.starts_at::date between p_start and p_end and b.status='confirmed'),
   'cancelled',(select count(*) from public.bookings b where b.starts_at::date between p_start and p_end and b.status='cancelled'),
   'completed',(select count(*) from public.bookings b where b.starts_at::date between p_start and p_end and b.attendance_state='completed'),
   'no_show',(select count(*) from public.bookings b where b.starts_at::date between p_start and p_end and b.no_show),
   'no_preference',(select count(*) from public.bookings b where b.starts_at::date between p_start and p_end and b.no_preference),
   'customers',(select count(distinct regexp_replace(b.phone,'[^0-9]','','g')) from public.bookings b where b.starts_at::date between p_start and p_end),
   'scheduled_value',(select coalesce(sum(b.price),0) from public.bookings b where b.starts_at::date between p_start and p_end and b.status='confirmed'),
   'active_days',(select count(distinct (b.created_at at time zone 'America/Manaus')::date) from public.bookings b where (b.created_at at time zone 'America/Manaus')::date between p_start and p_end),
   'logins',(select count(*) from public.kryon_usage_events e where (e.happened_at at time zone 'America/Manaus')::date between p_start and p_end),
   'last_booking_at',(select max(b.created_at) from public.bookings b)
  ),
  'daily',coalesce((select jsonb_agg(jsonb_build_object('day',d.day::date,'bookings',coalesce(x.bookings,0),'cancelled',coalesce(x.cancelled,0)) order by d.day) from generate_series(p_start,p_end,interval '1 day') d(day) left join lateral (select count(*) filter(where b.status='confirmed') bookings,count(*) filter(where b.status='cancelled') cancelled from public.bookings b where b.starts_at::date=d.day::date) x on true),'[]'::jsonb),
  'services',coalesce((select jsonb_agg(to_jsonb(x) order by x.total desc,x.name) from (select b.service_name name,count(*) total from public.bookings b where b.starts_at::date between p_start and p_end and b.status='confirmed' group by b.service_name limit 10) x),'[]'::jsonb),
  'barbers',coalesce((select jsonb_agg(to_jsonb(x) order by x.total desc,x.name) from (select b.barber_name name,count(*) total from public.bookings b where b.starts_at::date between p_start and p_end and b.status='confirmed' group by b.barber_name limit 20) x),'[]'::jsonb),
  'hours',coalesce((select jsonb_agg(to_jsonb(x) order by x.total desc,x.name) from (select to_char(b.starts_at,'HH24:00') name,count(*) total from public.bookings b where b.starts_at::date between p_start and p_end and b.status='confirmed' group by 1 limit 12) x),'[]'::jsonb),
  'recent',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select b.id,b.customer,b.phone,b.service_name,b.barber_name,b.starts_at,b.status,b.attendance_state,b.no_preference,b.created_at from public.bookings b order by b.created_at desc limit 40) x),'[]'::jsonb)
 ) into result;
 return result;
end;$$;
revoke all on function public.kryon_dashboard(date,date) from public,anon;
grant execute on function public.kryon_dashboard(date,date) to authenticated;

commit;
notify pgrst,'reload schema';
