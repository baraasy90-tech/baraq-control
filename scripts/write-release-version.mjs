import fs from 'node:fs';import {execFileSync} from 'node:child_process';
let commit=process.env.RELEASE_COMMIT??process.env.CF_PAGES_COMMIT_SHA??process.env.GITHUB_SHA??null;
if(!commit){try{commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{}}
if(commit&&!/^[0-9a-f]{40}$/i.test(commit))throw new Error('Release commit must be a complete Git SHA');
fs.writeFileSync('dist/version.json',JSON.stringify({commit,builtAt:new Date().toISOString(),source:commit?'git':'working-copy'},null,2)+'\n');
console.log('Release metadata written ('+(commit??'working copy; no release commit')+')');
