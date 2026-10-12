-- Synthetic data only. Target: isolated local Supabase, after both phase1 upgrades.
BEGIN;
SET search_path=public,extensions;
SET LOCAL session_replication_role=replica;
INSERT INTO auth.users(id,email,raw_user_meta_data) SELECT ('10000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'test'||n||'@example.invalid','{}'::jsonb FROM generate_series(1,5)n;
INSERT INTO profiles(id,full_name) SELECT ('10000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'Synthetic role '||n FROM generate_series(1,5)n;
INSERT INTO companies(id,name,created_by,is_individual) VALUES ('10000000-0000-0000-0000-000000000101','Synthetic corporate','10000000-0000-0000-0000-000000000001',false),('10000000-0000-0000-0000-000000000102','Synthetic individual','10000000-0000-0000-0000-000000000005',true);
UPDATE profiles SET company_id='10000000-0000-0000-0000-000000000101' WHERE id<>'10000000-0000-0000-0000-000000000005';
UPDATE profiles SET company_id='10000000-0000-0000-0000-000000000102' WHERE id='10000000-0000-0000-0000-000000000005';
INSERT INTO departments(id,company_id,name,type) VALUES ('10000000-0000-0000-0000-000000000111','10000000-0000-0000-0000-000000000101','PM','project_management'),('10000000-0000-0000-0000-000000000112','10000000-0000-0000-0000-000000000101','Finance','finance');
INSERT INTO department_members(department_id,user_id,role) VALUES ('10000000-0000-0000-0000-000000000111','10000000-0000-0000-0000-000000000003','head'),('10000000-0000-0000-0000-000000000112','10000000-0000-0000-0000-000000000004','head');
INSERT INTO projects(id,company_id,name,department_id) VALUES ('10000000-0000-0000-0000-000000000201','10000000-0000-0000-0000-000000000101','Synthetic corporate project','10000000-0000-0000-0000-000000000111'),('10000000-0000-0000-0000-000000000202','10000000-0000-0000-0000-000000000102','Synthetic private project',null);
INSERT INTO project_members(project_id,user_id) VALUES ('10000000-0000-0000-0000-000000000201','10000000-0000-0000-0000-000000000002');
INSERT INTO activities(id,project_id,name) VALUES ('10000000-0000-0000-0000-000000000301','10000000-0000-0000-0000-000000000201','Synthetic activity'),('10000000-0000-0000-0000-000000000302','10000000-0000-0000-0000-000000000202','Private activity');
SET LOCAL session_replication_role=origin;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM projects)<>1 THEN RAISE EXCEPTION 'Company isolation failed'; END IF;
 BEGIN
  INSERT INTO budget_actual_entries(activity_id,date,amount,status) VALUES ('10000000-0000-0000-0000-000000000301',current_date,100,'approved');
  RAISE EXCEPTION 'Forged approval was accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO budget_actual_entries(activity_id,date,amount) VALUES ('10000000-0000-0000-0000-000000000302',current_date,100);
  RAISE EXCEPTION 'Cross-company insert was accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 RAISE NOTICE 'PASS real-schema RLS and forged approval rejection';
END $$;
INSERT INTO budget_actual_entries(id,activity_id,date,amount) VALUES ('10000000-0000-0000-0000-000000000601','10000000-0000-0000-0000-000000000301',current_date,100),('10000000-0000-0000-0000-000000000602','10000000-0000-0000-0000-000000000301',current_date,200);
SELECT submit_budget_entry('10000000-0000-0000-0000-000000000601');
SELECT submit_budget_entry('10000000-0000-0000-0000-000000000602');
DO $$ BEGIN
 BEGIN PERFORM review_budget_entry('10000000-0000-0000-0000-000000000601',true,null); RAISE EXCEPTION 'Member review accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Member review accepted' THEN RAISE; END IF; END;
 RAISE NOTICE 'PASS member cannot review';
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
SELECT review_budget_entry('10000000-0000-0000-0000-000000000601',true,null);
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000004',true);
SELECT review_budget_entry('10000000-0000-0000-0000-000000000601',true,null);
RESET ROLE;
DO $$ BEGIN IF (SELECT status FROM budget_actual_entries WHERE id='10000000-0000-0000-0000-000000000601')<>'approved' THEN RAISE EXCEPTION 'Approval stages failed'; END IF; RAISE NOTICE 'PASS actual-schema PM then finance approval'; END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
INSERT INTO budget_actual_entries(activity_id,date,amount,status) VALUES ('10000000-0000-0000-0000-000000000302',current_date,100,'approved');
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
SELECT save_receiving_submission('10000000-0000-0000-0000-000000000701','10000000-0000-0000-0000-000000000301',true,'Synthetic manager','synthetic-signature','approved',null,'[]'::jsonb,'{}'::text[]);
SELECT save_receiving_submission('10000000-0000-0000-0000-000000000701','10000000-0000-0000-0000-000000000301',true,'Synthetic manager','synthetic-signature','approved',null,'[]'::jsonb,'{}'::text[]);
RESET ROLE;
DO $$ BEGIN IF (SELECT count(*) FROM submissions WHERE id='10000000-0000-0000-0000-000000000701')<>1 THEN RAISE EXCEPTION 'Duplicate receiving'; END IF; IF (SELECT actual_end_date FROM activities WHERE id='10000000-0000-0000-0000-000000000301') IS NULL THEN RAISE EXCEPTION 'Completion date missing'; END IF; RAISE NOTICE 'PASS individual self-approval and receiving retry'; END $$;
COMMIT;
