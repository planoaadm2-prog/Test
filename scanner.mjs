import XLSX from 'xlsx';
import {parseRows,summary} from './financeiro.js';
import {monthValid,planImport,copy} from './historico.js';
export function scanWorkbook(bytes,source,month,mode,existing=[]){
 if(!monthValid(month))throw Error('Selecione mês e ano da competência antes de importar');
 const workbook=XLSX.read(bytes,{type:'buffer',cellDates:true});
 if(!workbook.SheetNames.length)throw Error('Arquivo sem abas');
 const data=XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]],{defval:''});
 if(!data.length)throw Error('A primeira aba está vazia');
 const parsed=[],invalid=[];
 data.forEach((raw,i)=>{try{const row=parseRows([raw],source)[0];row.sourceLine=i+2;parsed.push(row);}catch(e){invalid.push({line:i+2,message:e.message.replace(/^Linha 2: /,'')});}});
 const months=new Map();for(const r of parsed){const m=r.reference.slice(0,7);months.set(m,(months.get(m)||0)+1);}
 const selected=parsed.filter(r=>r.reference.slice(0,7)===month),outside=parsed.filter(r=>r.reference.slice(0,7)!==month);
 const plan=planImport(existing,selected,mode);const errors=[...invalid.map(e=>'Linha '+e.line+': '+e.message),...plan.errors];
 if(!selected.length)errors.push('Nenhum registro pertence à competência selecionada. Escolha a competência correta ou outro arquivo.');
 return {sheet:workbook.SheetNames[0],scannedCount:data.length,validCount:parsed.length,selectedCount:selected.length,outsideCount:outside.length,months:[...months].map(([month,count])=>({month,count})),invalid,rows:selected,outsideRows:outside,pending:selected.filter(r=>r.pendingReason),plan:{...plan,errors},before:summary(existing,'exclude'),incoming:summary(selected,'exclude'),after:summary(plan.rows,'exclude')};
}
export function importResult(state,stage,actor,fileId){const next=copy(state),key=stage.bucketKey,at=new Date().toISOString();const before=copy(next.buckets[key]||null);const files=[...new Set([...(before?.files||[]),stage.filename])];const after={month:stage.month,source:stage.source,rows:copy(stage.scan.plan.rows),files,updatedAt:at};next.buckets[key]=after;next.history.push({id:crypto.randomUUID(),at,label:'Importar arquivo',scope:'bucket',month:stage.month,source:stage.source,actor,filename:stage.filename,mode:stage.mode,fileId,stats:stage.scan.plan.stats,before,after:copy(after),incomingRows:copy(stage.scan.rows),outsideCount:stage.scan.outsideCount,scannedCount:stage.scan.scannedCount});return next;}
