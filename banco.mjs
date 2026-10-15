import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {emptyState,validateState} from './historico.js';
const root=path.dirname(fileURLToPath(import.meta.url));
export const dataDir=path.resolve(process.env.DASHBOARD_DATA_DIR||path.join(root,'.data'));
fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
export const db=new DatabaseSync(path.join(dataDir,'financeiro.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT NOT NULL UNIQUE,display_name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('admin','operator')),salt TEXT NOT NULL,password_hash TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),csrf TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS app_state(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY,sha256 TEXT NOT NULL UNIQUE,filename TEXT NOT NULL,bytes BLOB NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,at TEXT NOT NULL,user_id TEXT NOT NULL,username TEXT NOT NULL,action TEXT NOT NULL,details TEXT NOT NULL);`);
if(!db.prepare('SELECT id FROM app_state WHERE id=1').get())db.prepare('INSERT INTO app_state(id,revision,payload) VALUES(1,0,?)').run(JSON.stringify(emptyState()));
export function readState(){const r=db.prepare('SELECT revision,payload FROM app_state WHERE id=1').get();const s=JSON.parse(r.payload);s.revision=r.revision;return s;}
export function atomic(action){db.exec('BEGIN IMMEDIATE');try{const result=action();db.exec('COMMIT');return result;}catch(e){try{db.exec('ROLLBACK');}catch{}throw e;}}
export function saveState(next,expected,actor,action,details={},file=null,extraFiles=[]){validateState(next);return atomic(()=>{const current=readState();if(current.revision!==expected){const e=Error('Os dados foram atualizados por outro usuário. Gere uma nova conferência antes de confirmar.');e.status=409;throw e;}for(const f of [file,...extraFiles].filter(Boolean)){const byId=db.prepare('SELECT sha256 FROM files WHERE id=?').get(f.id);if(byId&&byId.sha256!==f.sha256)throw Error('Arquivo conflitante no backup');if(!byId){const byHash=db.prepare('SELECT id FROM files WHERE sha256=?').get(f.sha256);if(byHash&&byHash.id!==f.id)throw Error('Identificador de arquivo conflitante no backup');db.prepare('INSERT INTO files VALUES(?,?,?,?,?)').run(f.id,f.sha256,f.filename,f.bytes,f.createdAt||new Date().toISOString());}}
 const saved={...next,revision:current.revision+1};db.prepare('UPDATE app_state SET revision=?,payload=? WHERE id=1').run(saved.revision,JSON.stringify(saved));db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?)').run(crypto.randomUUID(),new Date().toISOString(),actor.id,actor.username,action,JSON.stringify(details));return saved;});}
