import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const manifest=JSON.parse(readFileSync('dist/.vite/manifest.json','utf8'));
const entry=Object.entries(manifest).find(([,v])=>v.isEntry)?.[0];
if(!entry) throw Error('No entry in Vite manifest');
const initial=new Set();
function visit(key) { if(initial.has(key))return; initial.add(key); for(const child of manifest[key]?.imports??[])visit(child); }
visit(entry);
// First usable default route includes its lazy mode and all its static imports.
const simple=Object.keys(manifest).find(k=>k.endsWith('/SimpleMode.tsx'));
if(!simple) throw Error('No SimpleMode in manifest'); visit(simple);
const chunks=[...initial].map(key=>({key,file:manifest[key].file,gzip:gzipSync(readFileSync('dist/'+manifest[key].file),{level:9}).length}));
const total=chunks.reduce((sum,c)=>sum+c.gzip,0), limit=200000;
const deferred=['ExpressionEditor.tsx','MathDisplay.tsx','GraphMode.tsx'];
const eager=chunks.filter(c=>deferred.some(x=>c.key.endsWith(x)));
const result={total,limit,chunks,eager};mkdirSync('test-results/qa',{recursive:true});writeFileSync('test-results/qa/bundle.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
if((total>=limit || eager.length) && !process.env.QA_BASELINE) process.exitCode=1;
