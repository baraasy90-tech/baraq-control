BEGIN;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.consume_edge_request('10000000-0000-0000-0000-000000000002','support-chat'); RAISE EXCEPTION 'Authenticated role may consume internal quota'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM app_private.edge_request_limits; RAISE EXCEPTION 'Authenticated role may read counters'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ DECLARE i integer; BEGIN
 FOR i IN 1..20 LOOP IF NOT public.consume_edge_request('10000000-0000-0000-0000-000000000002','support-chat') THEN RAISE EXCEPTION 'Quota denied too early'; END IF; END LOOP;
 IF public.consume_edge_request('10000000-0000-0000-0000-000000000002','support-chat') THEN RAISE EXCEPTION 'Quota overflow accepted'; END IF;
 IF NOT public.consume_edge_request('10000000-0000-0000-0000-000000000003','support-chat') THEN RAISE EXCEPTION 'Other user affected by quota'; END IF;
 IF NOT public.consume_edge_request('10000000-0000-0000-0000-000000000002','send-invite-email') THEN RAISE EXCEPTION 'First email denied'; END IF;
 IF public.consume_edge_request('10000000-0000-0000-0000-000000000002','send-invite-email') THEN RAISE EXCEPTION 'Email cooldown bypassed'; END IF;
 UPDATE app_private.edge_request_limits SET window_start=now()-interval '2 hours',last_request_at=now()-interval '2 hours' WHERE actor_id='10000000-0000-0000-0000-000000000002';
 IF NOT public.consume_edge_request('10000000-0000-0000-0000-000000000002','support-chat') THEN RAISE EXCEPTION 'Expired quota did not reset'; END IF;
 RAISE NOTICE 'PASS quotas, cooldown, hourly reset, user isolation and private permissions';
END $$;
ROLLBACK;
