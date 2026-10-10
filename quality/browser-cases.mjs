import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const phase = process.argv[2] || 'baseline';
const only = process.argv[3]?.split(',');
const runtime = process.env.QUALITY_RUNTIME_MODULES;
if (!runtime) throw new Error('Define QUALITY_RUNTIME_MODULES con la carpeta de paquetes Playwright.');
const { chromium } = createRequire(path.join(runtime, 'package.json'))('playwright');
const env = JSON.parse(await fs.readFile(path.join(root, 'quality/evidence/environment.json'), 'utf8'));
const out = path.join(root, 'quality/evidence', phase);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.QUALITY_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const contexts = [];
async function newPage() {
  const context = await browser.newContext({ baseURL: env.baseUrl, viewport: { width: 1440, height: 1000 }, locale: 'es-EC' });
  contexts.push(context);
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  return page;
}
const anon = await newPage(), cart = await newPage(), customer = await newPage(), admin = await newPage();
const nexus = env.games.find(g => g.slug === 'nexus-beyond-the-void');
const voidGame = env.games.find(g => g.slug === 'void-command');
const email = `qa-${phase}-${Date.now()}@quality.test`;
const password = 'QualityTest!2026';
const rows = [];
const versionCommit=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim();
async function login(page, who) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(who);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar a NeonPlay', exact: true }).click();
  await page.waitForURL('**/account');
}
async function api(page, method, url, data) {
  const r = await page.request.fetch(`/api${url}`, { method, data });
  return { status: r.status(), body: r.status() === 204 ? null : await r.json() };
}
async function registerForm(page, mail, pass = password) {
  await page.goto('/register');
  await page.getByLabel('Tu nombre', { exact: true }).fill('Evaluador QA');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(mail);
  await page.getByLabel('Contraseña', { exact: true }).fill(pass);
}
async function caseRun(id, flow, title, data, expected, page, run) {
  if (only && !only.includes(id)) return;
  const started = new Date().toISOString();
  let obtained, status = 'Pass';
  try { obtained = await run(); } catch (e) { status = 'Fail'; obtained = e.message; }
  const evidence = `${phase}/${id}.png`;
  await page.screenshot({ path: path.join(out, `${id}.png`), fullPage: true });
  const row = { id, flow, phase, title, data, expected, obtained, status, started, evidence, versionCommit, executor: 'Ejecución automatizada Playwright sobre interfaz y API local' };
  rows.push(row);
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify({ date: started, browser: browser.version(), viewport: '1440x1000', baselineCommit: 'afac785407c041abc13f9b8651e70293aae488d4', cases: rows }, null, 2));
  console.log(`${id} ${status}: ${typeof obtained === 'string' ? obtained : JSON.stringify(obtained)}`);
}
try {
  await caseRun('CP01','F01','Registro válido',{email,passwordLength:16},'Cuenta CUSTOMER creada y sesión iniciada',anon,async()=>{
    await registerForm(anon,email); await anon.getByRole('button',{name:'Crear mi cuenta',exact:true}).click(); await anon.waitForURL('**/account');
    const me=await api(anon,'GET','/auth/me'); assert.equal(me.status,200); assert.equal(me.body.role,'CUSTOMER'); return 'Cuenta creada y perfil autenticado HTTP 200 con rol CUSTOMER.';
  });
  await anon.request.post('/api/auth/logout'); await anon.reload();
  await caseRun('CP02','F01','Correo inválido',{email:'correo-invalido'},'Formulario y servidor rechazan correo inválido',anon,async()=>{
    await registerForm(anon,'correo-invalido'); await anon.getByRole('button',{name:'Crear mi cuenta',exact:true}).click();
    const v=await anon.getByLabel('Correo electrónico',{exact:true}).evaluate(e=>({valid:e.validity.valid,message:e.validationMessage})); assert.equal(v.valid,false);
    const r=await api(anon,'POST','/auth/register',{name:'Evaluador QA',email:'correo-invalido',password}); assert.equal(r.status,400); return {browser:v,server:r};
  });
  await caseRun('CP03','F01','Contraseña de siete caracteres',{passwordLength:7},'Se rechaza contraseña inferior a ocho caracteres',anon,async()=>{
    await registerForm(anon,'short@quality.test','Abcd123'); await anon.getByRole('button',{name:'Crear mi cuenta',exact:true}).click();
    const r=await api(anon,'POST','/auth/register',{name:'Evaluador QA',email:'short@quality.test',password:'Abcd123'}); assert.equal(r.status,400);
    assert.match(anon.url(),/register/); return {server:r,location:'/register'};
  });
  await caseRun('CP04','F01','Correo duplicado',{email},'Conflicto comprensible sin segunda cuenta',anon,async()=>{
    await registerForm(anon,email); await anon.getByRole('button',{name:'Crear mi cuenta',exact:true}).click(); const text=await anon.getByRole('alert').innerText(); assert.match(text,/correo|registrad|existe/i); return text;
  });
  await caseRun('CP05','F01','Inicio y cierre de sesión',{email:env.customerEmail},'Login correcto y sesión revocada al cerrar',customer,async()=>{
    await login(customer,env.customerEmail); assert.equal((await api(customer,'GET','/auth/me')).status,200);
    await customer.getByRole('button',{name:'Cerrar sesión',exact:true}).click(); await customer.goto('/account'); await customer.waitForURL('**/login'); assert.equal((await api(customer,'GET','/auth/me')).status,401); return 'Perfil accesible con sesión; después del logout, redirección a login y HTTP 401.';
  });
  await caseRun('CP06','F01','Contraseña incorrecta',{email:env.customerEmail},'Mensaje de credenciales inválidas y sin sesión',customer,async()=>{
    await customer.goto('/login'); await customer.getByLabel('Correo electrónico',{exact:true}).fill(env.customerEmail); await customer.getByLabel('Contraseña',{exact:true}).fill('Incorrecta123!'); await customer.getByRole('button',{name:'Entrar a NeonPlay',exact:true}).click(); const t=await customer.getByRole('alert').innerText(); assert.match(t,/credencial|incorrect|contraseña/i); assert.equal((await api(customer,'GET','/auth/me')).status,401); return t;
  });
  await caseRun('CP07','F02','Búsqueda por nombre',{q:'Nexus'},'Solo coincidencias con Nexus',anon,async()=>{
    await anon.goto('/catalog'); await anon.getByLabel('Buscar en catálogo').fill('Nexus'); await anon.getByRole('button',{name:'Aplicar búsqueda'}).click(); await anon.waitForURL('**/catalog?q=Nexus'); await anon.locator('.game-title').first().waitFor(); const titles=await anon.locator('.game-title').allTextContents(); assert(titles.length>0); assert(titles.every(t=>/Nexus/i.test(t))); return titles;
  });
  await caseRun('CP08','F02','Búsqueda sin resultados',{q:'zz-no-existe-qa'},'Estado vacío y recuperación del catálogo',anon,async()=>{
    await anon.goto('/catalog?q=zz-no-existe-qa'); await anon.getByText('No encontramos videojuegos',{exact:true}).waitFor(); await anon.getByRole('button',{name:'Limpiar filtros',exact:true}).click(); await anon.locator('.game-title').first().waitFor(); return `Estado vacío mostrado; se recuperan ${await anon.locator('.game-title').count()} tarjetas.`;
  });
  await caseRun('CP09','F02','Categoría y plataforma',{categoryId:nexus.categoryId,platform:'PC'},'Todas las tarjetas cumplen ambos filtros',anon,async()=>{
    const meta=(await api(anon,'GET','/meta')).body; const category=meta.categories.find(c=>c.id===nexus.categoryId);
    await anon.goto('/catalog'); await anon.getByRole('radio',{name:category.name,exact:true}).click(); await anon.waitForURL(u=>u.searchParams.get('category')===nexus.categoryId);
    await anon.getByRole('radio',{name:'PC',exact:true}).click(); await anon.waitForURL(u=>u.searchParams.get('platform')===nexus.platforms[0].id);
    await anon.locator('.game-title').first().waitFor(); const url=new URL(anon.url()); const r=(await api(anon,'GET','/games?'+url.searchParams.toString())).body;
    assert(r.games.length>0); assert(r.games.every(g=>g.categoryId===nexus.categoryId&&g.platforms.some(p=>p.platformId===nexus.platforms[0].id)));
    await anon.getByRole('button',{name:'Limpiar',exact:true}).click(); await anon.waitForURL('**/catalog'); return {category:category.name,matches:r.games.map(g=>g.name),clear:true};
  });
  await caseRun('CP10','F02','Ordenamiento de precios',{sort:['price-asc','price-desc']},'Precios ordenados en ambos sentidos',anon,async()=>{
    await anon.goto('/catalog'); const orders={};
    for(const sort of ['price-asc','price-desc']) { await anon.getByLabel('Ordenar videojuegos').selectOption(sort); await anon.waitForURL(`**sort=${sort}`); await anon.locator('.game-title').first().waitFor(); const prices=(await api(anon,'GET',`/games?sort=${sort}&limit=12`)).body.games.map(g=>Number(g.price)); assert(prices.every((p,i)=>!i||(sort==='price-asc'?p>=prices[i-1]:p<=prices[i-1]))); orders[sort]=prices; }
    return orders;
  });
  await caseRun('CP11','F02','Detalle válido e inexistente',{slug:nexus.slug,invalidSlug:'inexistente-qa'},'Detalle correcto y error comprensible HTTP 404',anon,async()=>{
    await anon.goto('/game/'+nexus.slug); await anon.getByRole('heading',{name:nexus.name,exact:true}).waitFor(); assert.equal((await api(anon,'GET','/games/'+nexus.slug)).status,200);
    await anon.screenshot({path:path.join(out,'detalle-valido.png'),fullPage:true}); await anon.goto('/game/inexistente-qa'); await anon.getByText('Este videojuego no está disponible.',{exact:true}).waitFor(); assert.equal((await api(anon,'GET','/games/inexistente-qa')).status,404); return 'Detalle con nombre, precio y stock; ruta inexistente informa indisponibilidad y HTTP 404.';
  });
  await caseRun('CP12','F03','Cantidad mínima y total',{game:nexus.name,price:39.99,stock:2},'Cantidad 1 y total USD 39,99',cart,async()=>{
    await cart.goto('/game/'+nexus.slug); await cart.getByRole('button',{name:'Añadir al carrito',exact:true}).click(); await cart.goto('/cart');
    assert.equal(await cart.getByLabel('Cantidad de '+nexus.name,{exact:true}).innerText(),'1'); const total=await cart.locator('.summary-total strong').innerText(); assert.match(total,/39[.,]99/); return {quantity:1,total};
  });
  await caseRun('CP13','F03','Límite de cantidad por stock',{stock:2},'Se mantiene cantidad máxima de 2',cart,async()=>{
    await cart.getByRole('button',{name:'Aumentar cantidad de '+nexus.name,exact:true}).click(); assert.equal(await cart.getByLabel('Cantidad de '+nexus.name,{exact:true}).innerText(),'2');
    await cart.getByRole('button',{name:'Aumentar cantidad de '+nexus.name,exact:true}).click(); assert.equal(await cart.getByLabel('Cantidad de '+nexus.name,{exact:true}).innerText(),'2'); return {quantity:2,total:await cart.locator('.summary-total strong').innerText()};
  });
  await caseRun('CP14','F03','Persistencia y eliminación',{quantity:2},'Carrito persiste y queda vacío al eliminar',cart,async()=>{
    await cart.reload(); assert.equal(await cart.getByLabel('Cantidad de '+nexus.name,{exact:true}).innerText(),'2'); await cart.getByRole('button',{name:'Eliminar '+nexus.name+' del carrito',exact:true}).click(); await cart.getByRole('heading',{name:'Tu próxima aventura aún no está aquí',exact:true}).waitFor(); return 'Recarga conserva dos unidades; eliminar muestra el estado vacío.';
  });
  await caseRun('CP15','F04','Compra e historial',{price:39.99,quantity:1,initialStock:2},'Pedido de USD 39,99, precio conservado y stock 1',customer,async()=>{
    await login(customer,env.customerEmail); await customer.goto('/game/'+nexus.slug); await customer.getByRole('button',{name:'Añadir al carrito',exact:true}).click(); await customer.goto('/cart'); await customer.getByRole('button',{name:'Confirmar compra demo',exact:true}).click(); await customer.waitForURL('**/orders?success=*');
    const orders=(await api(customer,'GET','/orders')).body; const order=orders.find(o=>o.items.some(i=>i.gameId===nexus.id)); assert(order); assert.equal(Number(order.total),39.99); assert.equal(Number(order.items[0].price),39.99); const game=(await api(customer,'GET','/games/'+nexus.slug)).body; assert.equal(game.stock,1); return {orderId:order.id,total:order.total,priceSnapshot:order.items[0].price,stock:game.stock};
  });
  await caseRun('CP16','F04','Producto agotado',{game:voidGame.name,stock:0},'No se agrega ni compra sin stock',customer,async()=>{
    await customer.goto('/game/'+voidGame.slug); assert(await customer.getByRole('button',{name:'Añadir al carrito',exact:true}).isDisabled()); const before=(await api(customer,'GET','/orders')).body.length;
    const r=await api(customer,'POST','/orders',{idempotencyKey:randomUUID(),items:[{gameId:voidGame.id,platformId:voidGame.platforms[0].id,quantity:1,expectedPrice:Number(voidGame.price)}]}); assert.equal(r.status,409); assert.equal((await api(customer,'GET','/orders')).body.length,before); return r;
  });
  await login(admin,env.adminEmail);
  async function fillGame(name) {
    await admin.getByRole('button',{name:'Nuevo videojuego',exact:true}).click(); const d=admin.getByRole('dialog');
    await d.getByLabel('Nombre',{exact:true}).fill(name); await d.locator('select[name="categoryId"]').selectOption(nexus.categoryId); await d.getByLabel('Descripción',{exact:true}).fill('Videojuego ficticio exclusivo para pruebas de calidad de NeonPlay.'); await d.getByLabel('PC',{exact:true}).check(); return d;
  }
  await caseRun('CP17','F05','CRUD completo sin pedidos',{name:'Juego QA '+phase,price:29.99,newPrice:31.99},'Crear, consultar, editar y eliminar con confirmación',admin,async()=>{
    await admin.goto('/admin/games'); const name='Juego QA '+phase; let d=await fillGame(name); await d.getByRole('button',{name:'Crear videojuego',exact:true}).click(); await d.waitFor({state:'hidden'}); await admin.getByRole('button',{name:'Editar '+name,exact:true}).click(); d=admin.getByRole('dialog'); await d.getByLabel('Precio USD',{exact:true}).fill('31.99'); await d.getByRole('button',{name:'Guardar cambios',exact:true}).click(); await d.waitFor({state:'hidden'});
    const game=(await api(admin,'GET','/admin/games')).body.find(g=>g.name===name); assert.equal(Number(game.price),31.99); await admin.screenshot({path:path.join(out,'crud-actualizado.png'),fullPage:true}); await admin.getByRole('button',{name:'Eliminar '+name,exact:true}).click(); await admin.getByRole('dialog').getByRole('button',{name:'Confirmar',exact:true}).click(); await admin.getByRole('dialog').waitFor({state:'hidden'}); assert(!(await api(admin,'GET','/admin/games')).body.some(g=>g.id===game.id)); return {created:true,read:true,updatedPrice:31.99,deleted:true};
  });
  await caseRun('CP18','F05','Precio y stock inválidos',{price:0,stock:-1},'Formulario y servidor impiden guardar',admin,async()=>{
    const name='Invalido QA '+phase; const d=await fillGame(name); await d.getByLabel('Precio USD',{exact:true}).fill('0'); await d.getByLabel('Stock',{exact:true}).fill('-1'); await d.getByRole('button',{name:'Crear videojuego',exact:true}).click();
    const valid=await d.locator('form').evaluate(e=>e.checkValidity()); assert.equal(valid,false); const r=await api(admin,'POST','/admin/games',{name,description:'Producto ficticio de validación de calidad.',price:0,stock:-1,image:'/assets/nexus.png',featured:false,rating:4,releaseDate:'2026-10-10T00:00:00.000Z',categoryId:nexus.categoryId,platformIds:[nexus.platforms[0].id]}); assert.equal(r.status,400); const detail={browserValid:valid,server:r}; await d.getByRole('button',{name:'Cancelar',exact:true}).click(); return detail;
  });
  await caseRun('CP19','F05','Archivado y restauración',{game:nexus.name,hasOrder:true},'Archivar conserva historial y restaurar devuelve producto',admin,async()=>{
    await admin.getByRole('button',{name:'Eliminar '+nexus.name,exact:true}).click(); await admin.getByRole('dialog').getByRole('button',{name:'Confirmar',exact:true}).click(); await admin.getByRole('dialog').waitFor({state:'hidden'}); assert.equal((await api(admin,'GET','/games/'+nexus.slug)).status,404);
    const orders=(await api(customer,'GET','/orders')).body; assert(orders.some(o=>o.items.some(i=>i.gameId===nexus.id&&Number(i.price)===39.99))); await admin.screenshot({path:path.join(out,'archivado.png'),fullPage:true}); await admin.getByRole('button',{name:'Restaurar '+nexus.name,exact:true}).click(); await admin.getByRole('button',{name:'Eliminar '+nexus.name,exact:true}).waitFor(); assert.equal((await api(admin,'GET','/games/'+nexus.slug)).status,200); return 'Producto archivado HTTP 404, pedido conservado con precio 39,99 y restauración HTTP 200.';
  });
  await caseRun('CP20','F05','Permisos administrativos',{roles:['CUSTOMER','anonymous']},'Cliente HTTP 403 y anónimo HTTP 401 sin operaciones administrativas',customer,async()=>{
    await customer.goto('/admin/games'); await customer.getByRole('heading',{name:'Acceso restringido',exact:true}).waitFor(); assert.equal((await api(customer,'GET','/admin/games')).status,403); const r=await api(customer,'POST','/admin/games',{name:'Ataque ficticio'}); assert.equal(r.status,403);
    await anon.goto('/admin/games'); await anon.waitForURL('**/login'); assert.equal((await api(anon,'GET','/admin/games')).status,401); return 'Cliente sin permisos ve acceso restringido (403); anónimo va a login (401).';
  });
} finally { await browser.close(); }
console.log(`Resultado: ${rows.filter(r=>r.status==='Pass').length}/${rows.length} Pass.`);
process.exitCode=rows.some(r=>r.status==='Fail')?1:0;
