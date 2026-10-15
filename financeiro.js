import {classifyRegistration} from './cadastro.js';
import {entityName,operatorName} from './nomes.js';
export const clean=v=>String(v??'').trim();
export const key=v=>clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
export function cents(v){
 if(v==null||clean(v)==='')return 0;
 let s=typeof v==='number'?v:clean(v).replace(/R\$|\s/g,'');
 if(typeof s==='string'&&s.includes(','))s=s.replace(/\./g,'').replace(',','.');
 const n=Number(s);if(!Number.isFinite(n)||n<0)throw Error('Valor financeiro inválido');const amount=Math.round(n*100);if(!Number.isSafeInteger(amount))throw Error('Valor acima do limite permitido');return amount;
}
export function iso(v,required=false){
 if(!clean(v)){if(required)throw Error('Competência ausente');return '';}
 let s=Object.prototype.toString.call(v)==='[object Date]'?v.toISOString().slice(0,10):clean(v);
 if(/^\d{4}-\d{2}-\d{2}T/.test(s))s=s.slice(0,10);
 if(/^\d{2}\/\d{2}\/\d{4}$/.test(s))s=s.split('/').reverse().join('-');
 if(/^\d{2}\/\d{4}$/.test(s))s=s.slice(3)+'-'+s.slice(0,2)+'-01';
 const d=new Date(s+'T12:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||isNaN(d)||d.toISOString().slice(0,10)!==s)throw Error('Data inválida');return s;
}
export function parseRows(data,source){
 if(!data.length)throw Error('A primeira aba está vazia');
 const h=source==='Hermanos';
 const fields=h?['contrato','empresa','mes/ano','valor da fatura','valor pago']:['contrato','contratante','referencia','valor','recebido'];
 return data.map((raw,i)=>{try{
 const x=Object.fromEntries(Object.entries(raw).map(([k,v])=>[key(k),v]));
 for(const f of fields)if(!(f in x))throw Error('Coluna ausente: '+f);
 if(!clean(x.contrato))throw Error('Contrato ausente');
 const originalStatus=clean(x[h?'situacao':'status']);
 const registration=classifyRegistration(x[h?'empresa':'entidade'],x[h?'cpf':'cnpj/cpf do contratante']);
 return {source,billingIdentifier:clean(x[h?'n° cobranca/documento':'nosso numero']),nature:clean(x[h?'ciclo':'natureza']),originalDue:iso(x['vencimento original']),entity:registration.entityOverride||entityName(x[h?'empresa':'entidade']),operator:operatorName(x.operadora),entityOriginal:clean(x[h?'empresa':'entidade']),operatorOriginal:clean(x.operadora),contract:clean(x.contrato),title:clean(x['nosso numero']||x['n° cobranca/documento']||''),reference:iso(x[h?'mes/ano':'referencia'],true),due:iso(x[h?'vencimento atual':'vencimento atualizado']||(h?x.vencimento:'')||x['vencimento original']),billed:cents(x[h?'valor da fatura':'valor']),received:cents(x[h?'valor pago':'recebido']),cost:h||!clean(x.custo)?null:cents(x.custo),discount:h?cents(x.desconto):0,interest:h?cents(x['juros/multa']):0,cancelled:key(originalStatus)==='cancelado'||key(originalStatus)==='cancelada',cancelDate:h?iso(x.cancelamento):'',originalStatus,deletedFlag:h&&key(x['deletado a parcela'])==='sim',...registration,sourceLine:i+2,beneficiaryName:clean(x[h?'cliente':registration.documentType==='CNPJ'?'contratante':'beneficiario titular'])||'Não informado',nameField:h?'Cliente':registration.documentType==='CNPJ'?'Contratante':'Beneficiário titular',contractCategory:registration.documentType==='CNPJ'?'Empresarial':registration.documentType==='CPF'?'Adesão':'Não classificado'};
 }catch(e){throw Error('Linha '+(i+2)+': '+e.message);}});
}
export const excluded=(r,policy)=>r.cancelled||(policy==='exclude'&&!!r.cancelDate);
export function summary(rows,policy){const a=rows.filter(r=>!excluded(r,policy));return a.reduce((t,r)=>{t.count++;t.billed+=r.billed;t.received+=r.received;t.pending+=Math.max(0,r.billed-r.received);t.credits+=Math.max(0,r.received-r.billed);t.cost+=r.cost??0;if(r.cost===null)t.missingCost++;return t;},{count:0,billed:0,received:0,pending:0,credits:0,cost:0,missingCost:0});}
export function groups(rows,field,policy){const m=new Map();for(const r of rows.filter(r=>!excluded(r,policy))){if(!m.has(r[field]))m.set(r[field],[]);m.get(r[field]).push(r);}return [...m].map(([name,a])=>({name,...summary(a,policy)})).sort((a,b)=>b.billed-a.billed);}
