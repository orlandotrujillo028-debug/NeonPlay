import fs from 'node:fs/promises';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
dotenv.config({path:'server/.env',quiet:true});
const env=JSON.parse(await fs.readFile('quality/evidence/environment.json','utf8'));
if(env.baseUrl!=='http://127.0.0.1:4011'||!/^neonplay_quality_[a-f0-9]{12}$/.test(env.schema))throw new Error('Esquema de evaluación inválido.');
const db=new PrismaClient();
try {
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${env.schema}" CASCADE`);
  await fs.writeFile('quality/evidence/cleanup.json',JSON.stringify({date:new Date().toISOString(),schema:env.schema,removed:true,scope:'Solo esquema temporal validado de evaluación'},null,2));
  console.log('Esquema temporal retirado; evidencias conservadas.');
} finally {await db.$disconnect();}
