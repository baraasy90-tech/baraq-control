import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const root=process.cwd(),out=path.join(root,'public','ocr-assets','tesseract-7.0.0-data-1.0.0');
const versions={'tesseract.js':'7.0.0','tesseract.js-core':'7.0.0','@tesseract.js-data/ara':'1.0.0','@tesseract.js-data/eng':'1.0.0'};
for(const [name,version] of Object.entries(versions))if(JSON.parse(fs.readFileSync(path.join(root,'node_modules',name,'package.json'),'utf8')).version!==version)throw new Error('Unexpected OCR dependency version: '+name);
fs.mkdirSync(out,{recursive:true});const assets=[];
function copy(from,to){const source=path.join(root,'node_modules',from),target=path.join(out,to);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);const bytes=fs.readFileSync(source);assets.push({path:to,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
copy('tesseract.js/dist/worker.min.js','worker.min.js');copy('tesseract.js/LICENSE.md','licenses/tesseract-js.txt');copy('tesseract.js-core/LICENSE','licenses/tesseract-core.txt');
for(const name of fs.readdirSync(path.join(root,'node_modules','tesseract.js-core')))if(/^tesseract-core(?:-(?:simd|relaxedsimd))?(?:-lstm)?\.wasm(?:\.js)?$/.test(name))copy('tesseract.js-core/'+name,'core/'+name);
for(const language of ['ara','eng']){copy('@tesseract.js-data/'+language+'/4.0.0_best_int/'+language+'.traineddata.gz','languages/'+language+'.traineddata.gz');copy('@tesseract.js-data/'+language+'/package.json','licenses/'+language+'-package.json');copy('@tesseract.js-data/'+language+'/README.md','licenses/'+language+'-readme.md');}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({versions,assets},null,2));console.log('Prepared '+assets.length+' pinned OCR assets ('+Math.round(assets.reduce((n,a)=>n+a.bytes,0)/1024/1024)+' MiB); loaded only on OCR request.');
