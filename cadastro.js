export function classifyRegistration(entity,document){
 const hasEntity=String(entity??'').trim()!=='';
 const digits=String(document??'').replace(/\D/g,'');
 const documentType=digits.length===14?'CNPJ':digits.length===11?'CPF':digits.length===0?'Não informado':'Não identificado';
 const masked=documentType==='CPF'?'***.***.***-'+digits.slice(-2):documentType==='CNPJ'?'**.***.***/****-'+digits.slice(-2):'Não disponível';
 if(hasEntity)return {registrationType:'Entidade cadastrada',entityOverride:'',pendingReason:'',documentType,documentMasked:masked};
 if(documentType==='CNPJ')return {registrationType:'Empresarial',entityOverride:'EMPRESARIAL',pendingReason:'',documentType,documentMasked:masked};
 if(documentType==='CPF')return {registrationType:'Adesão',entityOverride:'ADESÃO — ENTIDADE PENDENTE',pendingReason:'Verificar com o cadastro o motivo da ausência da entidade e identificar ALASE, ALAAPL, ALAASP ou ALASC.',documentType,documentMasked:masked};
 return {registrationType:'Cadastro a verificar',entityOverride:'CADASTRO A VERIFICAR',pendingReason:'Entidade ausente e documento insuficiente para classificar. Verificar com o cadastro.',documentType,documentMasked:masked};
}
