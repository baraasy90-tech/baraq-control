import {it,expect} from 'vitest';import {isDefinitiveDatabaseRejection} from './writeErrors';
it('does not delete uploads after ambiguous transport or response errors',()=>{for(const code of [undefined,'','PGRST116','PGRST000','500'])expect(isDefinitiveDatabaseRejection(code)).toBe(false);});
it('recognizes transaction rejections for constraints, invalid data and denied permissions',()=>{for(const code of ['23514','23503','22007','42501','40001'])expect(isDefinitiveDatabaseRejection(code)).toBe(true);});
