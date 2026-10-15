import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {once} from 'node:events';

test('mobile privado: configuração única, autenticação e dados sem histórico/documentos',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'mobile-private-'));
 process.env.DASHBOARD_DATA_DIR=directory;process.env.DASHBOARD_PORT='0';
 process.env.DASHBOARD_SETUP_TOKEN=randomBytes(32).toString('base64url');
 const {server}=await import('../servidor.mjs');const {db,readState,saveState}=await import('../banco.mjs');
 if(!server.listening)await once(server,'listening');
 const origin='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{await new Promise(r=>server.close(r));db.close();fs.rmSync(directory,{recursive:true,force:true});});
 async function call(url,data,cookie){return fetch(origin+url,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json','Origin':origin}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});}
 let response=await call('/api/mobile-state');assert.equal(response.status,401);assert.equal(response.headers.get('cache-control'),'no-store');
 response=await call('/mobile/');assert.equal(response.status,200);assert.match(await response.text(),/id="privateApp" hidden/);
 assert.equal((await call('/mobile/..%2F.data/financeiro.sqlite')).status,404);
 const credentials={username:'mobileadmin',password:randomBytes(20).toString('base64url')};
 assert.equal((await call('/api/setup',{...credentials,token:'errada'})).status,403);
 assert.equal((await call('/api/setup',{...credentials,token:process.env.DASHBOARD_SETUP_TOKEN})).status,201);
 assert.equal((await call('/api/setup',{...credentials,username:'segundoadmin',token:process.env.DASHBOARD_SETUP_TOKEN})).status,404);
 response=await call('/api/login',credentials);assert.equal(response.status,200);
 const cookie=response.headers.get('set-cookie').split(';')[0];const session=await response.json();
 const {parseRows}=await import('../financeiro.js');const {planImport,bucketKey}=await import('../historico.js');
 const current=readState();current.buckets[bucketKey('2026-10','Base principal')]={month:'2026-10',source:'Base principal',rows:planImport([],parseRows([{Contrato:'C1',Contratante:'Teste privado','Beneficiário titular':'Teste privado','CNPJ/CPF do contratante':'12345678901',Referência:'10/2026','Nosso número':'123',Entidade:'ALASE',Operadora:'SALV SAÚDE',Valor:100,Recebido:40}],'Base principal'),'add').rows,files:[],updatedAt:new Date().toISOString()};
 saveState(current,0,session.user,'test');
 response=await call('/api/mobile-state',undefined,cookie);assert.equal(response.status,200);const payload=await response.json();
 const row=Object.values(payload.state.buckets)[0].rows[0];assert.equal(row.billed,10000);assert.equal(row.beneficiaryName,'Teste privado');assert.equal(row.documentMasked,undefined);assert.equal(payload.state.history,undefined);
 response=await fetch(origin+'/api/logout',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':session.csrf,Origin:origin},body:'{}'});assert.equal(response.status,200);
 assert.equal((await call('/api/mobile-state',undefined,cookie)).status,401);
});
