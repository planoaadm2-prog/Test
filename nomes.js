export const normalizedName=value=>String(value??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[‐‑‒–—]/g,'-').replace(/\s+/g,' ').toUpperCase();
const entities=new Map([
 ['CLUBE AMIGOS - PLANO DE CONTINUIDADE','CLUBE AMIGOS'],
 ['ALAAPL - ASSOCIACAO LATINO AMERICANA DE APOIO AOS PROFISSIONAIS LIBERAIS','ALAAPL'],
 ['ALAASP - ASSOCIACAO LATINO AMERICANA DE APOIO AOS SERVIDORES PUBLICOS','ALAASP'],
 ['ALASC - ASSOCIACAO LATINO AMERICANA DE SUPORTE AOS COMERCIARIOS','ALASC'],
 ['ALASE - ASSOCIACAO LATINO AMERICANA DE SUPORTE AOS ESTUDANTES','ALASE']
]);
const operators=new Map([
 ['SALV SAUDE','SALV SAÚDE'],
 ['SELECT','SALV SAÚDE'],
 ['SELECT 1 VIDA - RONDONIA','SALV SAÚDE'],
 ['SELECT 2 VIDAS - RONDONIA','SALV SAÚDE'],
 ['ODONTOGROUP, SALV SAUDE','ODONTOGROUP + SALV SAÚDE']
]);
export function entityName(value){const n=normalizedName(value);return entities.get(n)||n||'Entidade não informada';}
export function operatorName(value){const n=normalizedName(value);return operators.get(n)||n||'Operadora não informada';}
