import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
const env = JSON.parse(await fs.readFile('quality/evidence/environment.json','utf8'));
if(env.baseUrl!=='http://127.0.0.1:4011')throw new Error('Solo se permite la instancia local de evaluación.');
const samples=[];
async function sample(i) {
  const start=performance.now();
  try {
    const response=await fetch(env.baseUrl+'/api/games?limit=12&sort=price-asc');
    const body=await response.json();
    const correct=response.status===200&&body.total===8&&body.games.length===8&&body.games.every((g,j)=>!j||Number(g.price)>=Number(body.games[j-1].price));
    return {sample:i,ms:Number((performance.now()-start).toFixed(3)),status:response.status,correct};
  } catch(e) {return {sample:i,ms:Number((performance.now()-start).toFixed(3)),status:0,correct:false,error:e.message};}
}
for(let i=0;i<5;i++)await sample(0);
for(let i=1;i<=30;i++){ samples.push(await sample(i)); await new Promise(r=>setTimeout(r,250)); }
const sorted=samples.map(s=>s.ms).sort((a,b)=>a-b);
const result={date:new Date().toISOString(),endpoint:'/api/games?limit=12&sort=price-asc',method:'HTTP secuencial, incluye lectura y validación JSON',warmup:5,intervalMs:250,sampleCount:30,meanMs:samples.reduce((a,s)=>a+s.ms,0)/30,medianMs:(sorted[14]+sorted[15])/2,p95Ms:sorted[Math.ceil(.95*30)-1],minMs:sorted[0],maxMs:sorted[29],correct:samples.filter(s=>s.correct).length,criterion:{medianMaxMs:300,p95MaxMs:500,correctRequired:30},samples};
await fs.writeFile('quality/evidence/performance.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,samples:undefined},null,2));
