BEGIN;
SET search_path=public,extensions;
ALTER TABLE contracts ADD CONSTRAINT synthetic_contract_failure CHECK(contract_name<>'FAIL');
ALTER TABLE checklist_items ADD CONSTRAINT synthetic_checklist_failure CHECK(text<>'FAIL');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
SELECT save_contract_atomic('10000000-0000-0000-0000-000000000801',true,false,'{"project_id":"10000000-0000-0000-0000-000000000201","contract_name":"Atomic contract","total_value":100}'::jsonb);
SELECT save_contract_atomic('10000000-0000-0000-0000-000000000801',true,false,'{"project_id":"10000000-0000-0000-0000-000000000201","contract_name":"Atomic contract","total_value":100}'::jsonb);
DO $$ BEGIN
 IF (SELECT count(*) FROM contracts WHERE id='10000000-0000-0000-0000-000000000801')<>1 THEN RAISE EXCEPTION 'Duplicate contract retry'; END IF;
 BEGIN PERFORM save_contract_atomic('10000000-0000-0000-0000-000000000802',true,false,'{"project_id":"10000000-0000-0000-0000-000000000202","contract_name":"Other company"}'); RAISE EXCEPTION 'Cross-company save accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('app.bypass_workflow_guard','on',true);
UPDATE contracts SET status='approved' WHERE id='10000000-0000-0000-0000-000000000801';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
DO $$ BEGIN
 BEGIN PERFORM save_contract_atomic('10000000-0000-0000-0000-000000000801',false,true,'{"project_id":"10000000-0000-0000-0000-000000000201","contract_name":"FAIL"}'); RAISE EXCEPTION 'Forced update failure did not happen'; EXCEPTION WHEN check_violation THEN NULL; END;
 IF (SELECT status FROM contracts WHERE id='10000000-0000-0000-0000-000000000801')<>'approved' THEN RAISE EXCEPTION 'Reset leaked outside transaction'; END IF;
 IF (SELECT contract_name FROM contracts WHERE id='10000000-0000-0000-0000-000000000801')<>'Atomic contract' THEN RAISE EXCEPTION 'Contract partially updated'; END IF;
 RAISE NOTICE 'PASS contract retry, isolation and rollback of reset plus update';
END $$;
SELECT save_checklist_atomic('10000000-0000-0000-0000-000000000301','[{"id":"10000000-0000-0000-0000-000000000901","text":"Keep","photo_required":false,"order":1},{"id":"10000000-0000-0000-0000-000000000902","text":"Retain on failure","photo_required":false,"order":2}]');
DO $$ BEGIN
 BEGIN PERFORM save_checklist_atomic('10000000-0000-0000-0000-000000000301','[{"id":"10000000-0000-0000-0000-000000000901","text":"FAIL","photo_required":false,"order":1}]'); RAISE EXCEPTION 'Forced checklist failure did not happen'; EXCEPTION WHEN check_violation THEN NULL; END;
 IF (SELECT count(*) FROM checklist_items WHERE activity_id='10000000-0000-0000-0000-000000000301')<>2 THEN RAISE EXCEPTION 'Checklist deletion leaked from failed transaction'; END IF;
 IF (SELECT text FROM checklist_items WHERE id='10000000-0000-0000-0000-000000000901')<>'Keep' THEN RAISE EXCEPTION 'Checklist partially updated'; END IF;
END $$;
INSERT INTO checklist_results(submission_id,checklist_item_id,checked) VALUES ('10000000-0000-0000-0000-000000000701','10000000-0000-0000-0000-000000000901',true);
DO $$ BEGIN
 BEGIN PERFORM save_checklist_atomic('10000000-0000-0000-0000-000000000301','[]'); RAISE EXCEPTION 'Historical checklist item deleted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%تقديم استلام سابق%' THEN RAISE; END IF; END;
 RAISE NOTICE 'PASS checklist rollback and preservation of historical receiving results';
END $$;
ROLLBACK;

