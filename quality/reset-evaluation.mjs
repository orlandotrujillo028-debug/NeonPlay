import fs from 'node:fs/promises';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
dotenv.config({path:'server/.env',quiet:true});
const env=JSON.parse(await fs.readFile('quality/evidence/environment.json','utf8'));
if(env.baseUrl!=='http://127.0.0.1:4011'||!/^neonplay_quality_[a-f0-9]{12}$/.test(env.schema))throw new Error('El entorno no es una evaluación aislada.');
const url=new URL(process.env.DATABASE_URL); url.searchParams.set('schema',env.schema);
const db=new PrismaClient({datasources:{db:{url:url.toString()}}});
try {
  await db.$transaction(async tx=>{
    await tx.orderItem.deleteMany(); await tx.order.deleteMany();
    await tx.game.deleteMany({where:{name:{startsWith:'Juego QA '}}});
    await tx.game.updateMany({where:{slug:'nexus-beyond-the-void'},data:{stock:2,archived:false}});
    await tx.game.updateMany({where:{slug:'void-command'},data:{stock:0,archived:false}});
  });
  console.log('Datos ficticios de evaluación restablecidos.');
} finally {await db.$disconnect();}
