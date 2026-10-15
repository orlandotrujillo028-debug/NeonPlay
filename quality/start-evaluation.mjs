import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
dotenv.config({path:'server/.env',quiet:true});
const originalUrl = process.env.DATABASE_URL;
const schema = 'neonplay_quality_' + randomBytes(6).toString('hex');
const runUrl = new URL(originalUrl);
runUrl.searchParams.set('schema',schema);
process.env.DATABASE_URL = runUrl.toString();
process.env.PORT = '4011';
process.env.CLIENT_URL = 'http://127.0.0.1:4011';
process.env.NODE_ENV = 'test';
process.env.SEED_ADMIN_EMAIL = 'admin@quality.test';
process.env.SEED_CUSTOMER_EMAIL = 'player@quality.test';
process.env.SEED_ADMIN_PASSWORD = 'QualityTest!2026';
process.env.SEED_CUSTOMER_PASSWORD = 'QualityTest!2026';
const evidenceDir = path.resolve('quality/evidence');
mkdirSync(evidenceDir,{recursive:true});
for(const args of [
  ['node_modules/prisma/build/index.js','migrate','deploy','--schema','server/prisma/schema.prisma'],
  ['node_modules/tsx/dist/cli.mjs','server/prisma/seed.ts'],
]) {
  const result = spawnSync(process.execPath,args,{env:process.env,encoding:'utf8',windowsHide:true});
  if(result.status !== 0) { console.error('No se pudo preparar el entorno aislado de evaluación.'); process.exit(1); }
}
const db = new PrismaClient();
await db.game.updateMany({where:{slug:'nexus-beyond-the-void'},data:{stock:2}});
const games = await db.game.findMany({include:{platforms:{include:{platform:true}},category:true}});
const primary = games.find(g=>g.name.startsWith('Nexus'));
await db.game.update({where:{id:primary.id},data:{stock:2}});
const empty = games.find(g=>g.name.startsWith('Void'));
await db.game.update({where:{id:empty.id},data:{stock:0}});
writeFileSync(path.join(evidenceDir,'environment.json'),JSON.stringify({
  date:new Date().toISOString(),baseline:spawnSync('git',['rev-parse','baseline-calidad-v1^{}'],{encoding:'utf8'}).stdout.trim(),
  sourceCommit:spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),
  schema,baseUrl:process.env.CLIENT_URL,node:process.version,
  operatingSystem:process.platform,adminEmail:process.env.SEED_ADMIN_EMAIL,
  customerEmail:process.env.SEED_CUSTOMER_EMAIL,
  games:games.map(g=>({id:g.id,name:g.name,slug:g.slug,price:String(g.price),stock:g.id===primary.id?2:g.id===empty.id?0:g.stock,categoryId:g.categoryId,platforms:g.platforms.map(p=>({id:p.platform.id,name:p.platform.name}))})),
},null,2));
await db.$disconnect();
const {app} = await import('../server/dist/src/app.js');
const {db:appDb} = await import('../server/dist/src/db.js');
await appDb.$connect();
const server = app.listen(4011,'127.0.0.1',()=>console.log('Evaluación aislada disponible en http://127.0.0.1:4011. Consulta environment.json para identificar la versión.'));
let stopping = false;
async function stop() {
  if(stopping)return;
  stopping=true;
  server.close(async()=>{
    await appDb.$disconnect();
    const cleanup = new PrismaClient({datasources:{db:{url:originalUrl}}});
    if(!/^neonplay_quality_[a-f0-9]{12}$/.test(schema))throw new Error('Esquema temporal inválido.');
    await cleanup.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await cleanup.$disconnect();
    console.log('Esquema de evaluación retirado; evidencias conservadas.');
    process.exit(0);
  });
}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
