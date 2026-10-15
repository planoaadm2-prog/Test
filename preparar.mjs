import fs from 'node:fs';
const body=fs.readFileSync(new URL('./painel-body.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('./painel-app.js',import.meta.url),'utf8');
fs.writeFileSync(new URL('./dashboard.js',import.meta.url),"import * as XLSX from 'xlsx';\nimport './painel.css';\nimport {clean,key,cents,iso,parseRows,excluded,summary,groups} from './financeiro.js';\nwindow.XLSX=XLSX;\n"+app);
const html='<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Faturamento de Convênios</title></head><body>'+body+'<script type="module" src="/dashboard.js"></script></body></html>';
fs.writeFileSync(new URL('./index.html',import.meta.url),html);
fs.writeFileSync(new URL('./dashboard.html',import.meta.url),html);
