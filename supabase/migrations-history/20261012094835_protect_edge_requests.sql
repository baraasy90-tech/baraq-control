-- Internal counters are not exposed through the Data API. Only verified Edge code can consume quotas.
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to service_role;
create table app_private.edge_request_limits (
  actor_id uuid not null references auth.users(id) on delete cascade,
  operation text not null check(operation in ('send-invite-email','support-chat')),
  window_start timestamptz not null,
  requests integer not null check(requests>=0),
  last_request_at timestamptz not null,
  primary key(actor_id,operation)
);
alter table app_private.edge_request_limits enable row level security;
revoke all on app_private.edge_request_limits from public,anon,authenticated;
grant select,insert,update on app_private.edge_request_limits to service_role;

create or replace function public.consume_edge_request(p_actor_id uuid,p_operation text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare
  v_limit integer;
  v_now timestamptz:=clock_timestamp();
  v_counter app_private.edge_request_limits;
begin
  if p_actor_id is null then return false; end if;
  v_limit:=case p_operation when 'send-invite-email' then 5 when 'support-chat' then 20 else null end;
  if v_limit is null then raise exception 'Unsupported request operation'; end if;
  insert into app_private.edge_request_limits values(p_actor_id,p_operation,v_now,0,v_now-interval '1 day')
  on conflict(actor_id,operation) do nothing;
  select * into v_counter from app_private.edge_request_limits where actor_id=p_actor_id and operation=p_operation for update;
  if v_counter.window_start<=v_now-interval '1 hour' then
    v_counter.requests:=0;v_counter.window_start:=v_now;
  end if;
  if v_counter.requests>=v_limit or (p_operation='send-invite-email' and v_counter.last_request_at>v_now-interval '1 minute') then return false; end if;
  update app_private.edge_request_limits set window_start=v_counter.window_start,requests=v_counter.requests+1,last_request_at=v_now where actor_id=p_actor_id and operation=p_operation;
  return true;
end;
$$;
revoke all on function public.consume_edge_request(uuid,text) from public,anon,authenticated;
grant execute on function public.consume_edge_request(uuid,text) to service_role;
