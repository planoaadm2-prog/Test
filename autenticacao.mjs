import {randomBytes,scrypt as scryptCallback,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {db} from './banco.mjs';
const scrypt=promisify(scryptCallback);
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const cleanUser=value=>String(value||'').trim().toLowerCase();
export async function createUser(username,displayName,password,role='operator'){
 username=cleanUser(username);if(!/^[a-z0-9._@-]{3,80}$/.test(username))throw Error('Usuário deve ter de 3 a 80 caracteres: letras, números, ponto, @, _ ou -');if(typeof password!=='string'||password.length<12||password.length>256)throw Error('A senha deve ter entre 12 e 256 caracteres');if(!['admin','operator'].includes(role))throw Error('Perfil inválido');const salt=randomBytes(16).toString('hex'),hash=Buffer.from(await scrypt(password,salt,64)).toString('hex'),id=crypto.randomUUID();db.prepare('INSERT INTO users(id,username,display_name,role,salt,password_hash,active,created_at) VALUES(?,?,?,?,?,?,1,?)').run(id,username,String(displayName||username).trim().slice(0,100),role,salt,hash,new Date().toISOString());return {id,username,displayName:String(displayName||username),role};
}
export async function verifyUser(username,password){if(typeof password!=='string'||password.length>256)return null;const row=db.prepare('SELECT * FROM users WHERE username=? AND active=1').get(cleanUser(username));const hash=Buffer.from(await scrypt(password,row?.salt||'ausente-computacao-padrao',64));if(!row||!timingSafeEqual(hash,Buffer.from(row.password_hash,'hex')))return null;return row;}
export function startSession(user){const token=randomBytes(32).toString('base64url'),csrf=randomBytes(32).toString('base64url');db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(digest(token),user.id,csrf,Date.now()+12*60*60*1000);return {token,csrf};}
export function getSession(req){const cookie=String(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('fatura_session='));if(!cookie)return null;const token=cookie.slice('fatura_session='.length);if(!/^[A-Za-z0-9_-]{40,60}$/.test(token))return null;return db.prepare('SELECT s.token_hash,s.csrf,s.expires_at,u.id,u.username,u.display_name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1').get(digest(token),Date.now())||null;}
export function publicUser(row){return {id:row.id,username:row.username,displayName:row.display_name||row.displayName,role:row.role};}
export function sessionCookie(token,maxAge=43200){return 'fatura_session='+token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age='+maxAge+(process.env.DASHBOARD_COOKIE_SECURE==='1'?'; Secure':'');}
export function csrfValid(session,value){if(typeof value!=='string')return false;const a=Buffer.from(session.csrf),b=Buffer.from(value);return a.length===b.length&&timingSafeEqual(a,b);}
