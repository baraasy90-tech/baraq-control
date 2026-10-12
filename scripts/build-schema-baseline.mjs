import fs from 'node:fs';
import path from 'node:path';
const source = JSON.parse(fs.readFileSync('verification-results/schema-snapshot-20261012.json', 'utf8')).schema;
const extra = JSON.parse(fs.readFileSync('verification-results/schema-extra-20261012.json', 'utf8'));
const output = process.argv[2] ?? '.verification/local-stack/baseline.sql';
const q = value => '"' + value.replaceAll('"', '""') + '"';
const literal = value => "'" + value.replaceAll("'", "''") + "'";
if (extra.sequences?.length || extra.views?.length || source.enums?.length) throw new Error('Additional object types need explicit reconstruction');
const sql = ['-- Reconstructed application schema, captured 2026-10-12. NOT a data backup.', '-- Apply only to a fresh isolated Supabase database; never to existing production.', 'BEGIN;', "SET search_path = public, extensions;", 'SET check_function_bodies = false;'];
for (const table of source.tables) {
  const columns = extra.columns.filter(c => c.table === table.name).map(c => {
    if (c.identity || c.generated) throw new Error('Identity/generated columns need explicit reconstruction');
    return `  ${q(c.name)} ${c.type}${c.not_null ? ' NOT NULL' : ''}`;
  });
  sql.push(`CREATE TABLE public.${q(table.name)} (\n${columns.join(',\n')}\n);`);
}
for (const f of source.functions) sql.push(f.definition.trim().replace(/;?$/, ';'));
for (const c of extra.columns) if (c.default !== null) sql.push(`ALTER TABLE public.${q(c.table)} ALTER COLUMN ${q(c.name)} SET DEFAULT ${c.default};`);
// Unique/primary constraints precede foreign keys across all tables.
const constraints = [...source.constraints].sort((a,b) => Number(a.definition.startsWith('FOREIGN KEY')) - Number(b.definition.startsWith('FOREIGN KEY')));
for (const c of constraints) sql.push(`ALTER TABLE public.${q(c.table)} ADD CONSTRAINT ${q(c.name)} ${c.definition};`);
const constraintNames = new Set(source.constraints.map(c => c.name));
for (const i of source.indexes) if (!constraintNames.has(i.indexname)) sql.push(i.indexdef + ';');
for (const table of source.tables) {
  sql.push(`ALTER TABLE public.${q(table.name)} ${table.rls ? 'ENABLE' : 'DISABLE'} ROW LEVEL SECURITY;`);
  sql.push(`ALTER TABLE public.${q(table.name)} ${table.force_rls ? 'FORCE' : 'NO FORCE'} ROW LEVEL SECURITY;`);
  sql.push(`REVOKE ALL ON TABLE public.${q(table.name)} FROM PUBLIC, anon, authenticated, service_role;`);
}
for (const g of source.grants) {
  if (!['anon', 'authenticated', 'service_role'].includes(g.grantee)) continue;
  sql.push(`GRANT ${g.privilege_type} ON TABLE public.${q(g.table_name)} TO ${q(g.grantee)}${g.is_grantable === 'YES' ? ' WITH GRANT OPTION' : ''};`);
}
// Restore exact per-function EXECUTE grants using PostgreSQL's resolved signature.
for (const f of source.functions) {
  if (!f.acl) continue;
  const grants = f.acl.map(entry => {
    const match = entry.match(/^(.*?)=([^/]+)\//);
    if (!match) throw new Error('Unexpected function ACL');
    const role = match[1] || 'PUBLIC';
    if (role === 'postgres') return '';
    if (!['PUBLIC','anon','authenticated','service_role'].includes(role)) throw new Error('Unexpected custom role');
    if (!match[2].includes('X')) return '';
    return `EXECUTE 'GRANT EXECUTE ON FUNCTION ' || signature || ' TO ${role === 'PUBLIC' ? role : q(role)}${match[2].includes('X*') ? ' WITH GRANT OPTION' : ''}';`;
  }).filter(Boolean);
  sql.push(`DO $acl$ DECLARE signature text; BEGIN\nSELECT p.oid::regprocedure::text INTO STRICT signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND CASE WHEN p.prokind='f' THEN pg_get_functiondef(p.oid) END=${literal(f.definition)};\nEXECUTE 'REVOKE ALL ON FUNCTION ' || signature || ' FROM PUBLIC, anon, authenticated, service_role';\n${grants.join('\n')}\nEND $acl$;`);
}
for (const p of source.policies) sql.push(`CREATE POLICY ${q(p.policyname)} ON ${q(p.schemaname)}.${q(p.tablename)} AS ${p.permissive} FOR ${p.cmd} TO ${p.roles.map(r => r === 'public' ? 'PUBLIC' : q(r)).join(', ')}${p.qual ? ' USING (' + p.qual + ')' : ''}${p.with_check ? ' WITH CHECK (' + p.with_check + ')' : ''};`);
for (const t of source.triggers) sql.push(t + ';');
sql.push('COMMIT;');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, sql.join('\n\n') + '\n', 'utf8');
console.log(JSON.stringify({ output, tables:source.tables.length, columns:extra.columns.length, functions:source.functions.length, policies:source.policies.length }));

