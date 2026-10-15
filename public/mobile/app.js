const $ = id => document.getElementById(id);
const money = value => (value / 100).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
const compact = value => (value / 100).toLocaleString('pt-BR', {notation:'compact', style:'currency', currency:'BRL', maximumFractionDigits:1});
let months = [], data = [], category = '', page = 'resumo', session = null, setupRequired = false, generation = 0;
function el(tag, text, cls) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; }
function scope(month = $('month').value) { return data.filter(r => r.month === month && (!category || r.category === category)); }
function totals(rows) { return rows.filter(r => !r.cancelled).reduce((t,r) => ({billed:t.billed+r.billed,received:t.received+r.received,pending:t.pending+Math.max(0,r.billed-r.received),count:t.count+1}), {billed:0,received:0,pending:0,count:0}); }
function status(row) { return row.cancelled ? 'Cancelada' : row.received >= row.billed ? 'Quitada' : row.received ? 'Parcial' : 'Em aberto'; }
function groups(field) { const values = [...new Set(scope().map(r => r[field]))]; return values.map(name => ({name, ...totals(scope().filter(r => r[field] === name))})).sort((a,b) => b.billed-a.billed); }
function selectPage(id, focus = false) { page = id; for (const button of document.querySelectorAll('[data-page]')) { const active = button.dataset.page === id; button.setAttribute('aria-selected',String(active)); button.tabIndex = active ? 0 : -1; $(button.dataset.page).hidden = !active; if (active && focus) button.focus({preventScroll:true}); } $('pageTitle').textContent = {resumo:'Seu resumo',entidades:'Por entidade',operadoras:'Por operadora',cobrancas:'Cobranças'}[id]; window.scrollTo({top:0,behavior:'instant'}); }
function changeMonth(month) { $('month').value = month; render(); }
function metric(title, value, caption, cls = '') { const box = el('div',undefined,'metric '+cls); box.append(el('span',title),el('strong',value),el('small',caption)); return box; }
function render() {
  const rows = scope(), total = totals(rows), ratio = total.billed ? total.received / total.billed * 100 : 0;
  $('billed').textContent = money(total.billed); $('activeCount').textContent = total.count + ' cobranças ativas · ' + rows.filter(r => r.cancelled).length + ' canceladas excluídas';
  $('ratio').textContent = Math.round(ratio) + '%'; $('ring').style.background = 'conic-gradient(#a6e3bd ' + Math.min(100,ratio) + '%, #ffffff20 0)';
  const overdue = rows.filter(r => !r.cancelled && r.due && r.due < new Date().toLocaleDateString('en-CA')).reduce((s,r) => s + Math.max(0,r.billed-r.received),0);
  $('kpis').replaceChildren(metric('Recebido',money(total.received),'Recebimentos informados','received'),metric('A receber',money(total.pending),'Saldo das cobranças ativas'),metric('Saldo vencido',money(overdue),'Vencimento anterior a hoje'),metric('Cobranças ativas',String(total.count),'Canceladas fora dos totais'));
  const trend = months.map(month => ({month,...totals(scope(month))})), max = Math.max(1,...trend.map(r => r.billed)); $('trend').replaceChildren();
  for (const row of trend) { const button = el('button'); button.type = 'button'; button.setAttribute('aria-pressed',String(row.month === $('month').value)); button.setAttribute('aria-label',row.month+': faturado '+money(row.billed)+', recebido '+money(row.received)); const columns = el('div',undefined,'columns'); for (const value of [row.billed,row.received]) { const bar = el('i'); bar.style.height = value/max*100+'%'; columns.append(bar); } button.append(el('strong',compact(row.billed)),columns,el('span',monthLabel(row.month))); button.onclick = () => changeMonth(row.month); $('trend').append(button); }
  for (const [field,target] of [['entity','entityList'],['operator','operatorList']]) { $(target).replaceChildren(...groups(field).map(group => groupCard(group,field))); }
  $('topEntities').replaceChildren(...groups('entity').slice(0,3).map(group => { const button = el('button',undefined,'top-row'); button.append(el('span',group.name+' ↗'),el('strong',money(group.billed))); button.onclick = () => openGroup('entity',group.name); return button; }));
  renderInvoices();
}
function groupCard(group, field) { const button = el('button',undefined,'group'); const head = el('div',undefined,'group-head'); head.append(el('strong',group.name),el('span',field === 'operator' ? 'OPERADORA' : scope().filter(r => r.entity === group.name).every(r => r.category === 'Empresarial') ? 'EMPRESARIAL' : scope().filter(r => r.entity === group.name).every(r => r.category === 'Adesão') ? 'ADESÃO' : 'VERIFICAR','tag')); const values = el('div',undefined,'group-values'); for (const [label,value] of [['Faturado',group.billed],['Recebido',group.received]]) { const box = el('div'); box.append(el('span',label),el('strong',money(value))); values.append(box); } const track = el('div',undefined,'track'), fill = el('i'); const ratio = group.billed ? group.received/group.billed*100 : 0; fill.style.width = Math.min(100,ratio)+'%'; track.append(fill); const footer = el('div',undefined,'group-footer'); footer.append(el('span',group.count+' cobranças'),el('span',ratio.toFixed(1).replace('.',',')+'% recebido · Ver detalhes ↗')); button.append(head,values,track,footer); button.onclick = () => openGroup(field,group.name); return button; }
function invoiceCard(row, clickable = true) { const card = el(clickable ? 'button' : 'article',undefined,'invoice'); const head = el('div',undefined,'invoice-top'), state = status(row); head.append(el('strong',row.name),el('span',state,'status'+(row.cancelled?' cancelled':state==='Quitada'?'':' pending'))); const footer = el('div',undefined,'invoice-footer'); for (const [label,value] of [['Faturado',row.billed],['Recebido',row.received]]) { const box = el('div',label); box.append(el('strong',money(value))); footer.append(box); } card.append(head,el('p',row.id+' · '+row.entity),footer); if (clickable) card.onclick = () => openInvoice(row); return card; }
function renderInvoices() { const q = $('search').value.trim().toLocaleLowerCase('pt-BR'), state = $('status').value; const rows = scope().filter(r => (!q || (r.name+' '+r.id).toLocaleLowerCase('pt-BR').includes(q)) && (!state || status(r) === state)); $('invoiceCount').textContent = rows.length+' cobranças no filtro. Canceladas são informativas e ficam fora dos totais.'; $('invoiceList').replaceChildren(...rows.map(r => invoiceCard(r))); if (!rows.length) $('invoiceList').append(el('p','Nenhuma cobrança neste filtro.','empty')); }
function showSheet(title) { $('sheetTitle').textContent = title; $('sheetContent').replaceChildren(); if (!$('sheet').open) $('sheet').showModal(); }
function openGroup(field,name) { const rows = scope().filter(r => r[field] === name), total = totals(rows); showSheet(name); $('sheetContent').append(el('p','Cobranças da competência · '+$('month').selectedOptions[0].textContent,'description')); const metrics = el('div',undefined,'sheet-summary'); for (const [label,value] of [['Faturado',total.billed],['Recebido',total.received],['A receber',total.pending]]) { const box = el('div'); box.append(el('span',label),el('strong',money(value))); metrics.append(box); } const list = el('div',undefined,'sheet-list'); list.append(...rows.filter(r => !r.cancelled).map(r => invoiceCard(r,false))); $('sheetContent').append(metrics,el('p',total.count+' cobranças ativas. Canceladas excluídas desta lista.','description'),list); }
function openInvoice(row) { showSheet(row.name); for (const [label,value] of [['Cobrança',row.id],['Entidade',row.entity],['Operadora',row.operator],['Categoria',row.category],['Vencimento',row.due.split('-').reverse().join('/')],['Situação',status(row)],['Faturado',money(row.billed)],['Recebido',money(row.received)],['Saldo',row.cancelled?'Excluído dos totais':money(row.billed-row.received)]]) { const line = el('div',undefined,'data-row'); line.append(el('span',label),el('span',value)); $('sheetContent').append(line); } }
$('about').onclick = () => { showSheet('Seu faturamento no celular'); $('sheetContent').append(el('p','Os valores são consultados no servidor após o login. Importe novos relatórios no painel principal e toque em Atualizar para consultar a situação salva. Cancelamentos ficam fora dos totais.','description')); };
$('closeSheet').onclick = () => $('sheet').close(); $('sheet').onclick = event => { if (event.target !== $('sheet')) return; const r = $('sheet').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) $('sheet').close(); };
$('month').onchange = () => render(); $('search').oninput = renderInvoices; $('status').onchange = renderInvoices; $('seeEntities').onclick = () => selectPage('entidades');
for (const button of document.querySelectorAll('[data-category]')) button.onclick = () => { category = button.dataset.category; document.querySelectorAll('[data-category]').forEach(b => b.setAttribute('aria-pressed',String(b === button))); render(); };
const tabs = [...document.querySelectorAll('[data-page]')]; tabs.forEach((button,index) => { button.onclick = () => selectPage(button.dataset.page); button.onkeydown = event => { if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length-1 : (index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length; selectPage(tabs[next].dataset.page,true); }; });
function monthLabel(month) { return new Date(month+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'short',year:'numeric'}); }
function clearPrivate() {
  generation++; data = []; months = []; session = null; category = '';
  if ($('sheet').open) $('sheet').close();
  for (const id of ['sheetContent','entityList','operatorList','invoiceList','topEntities','kpis','trend','month']) $(id).replaceChildren();
  for (const id of ['billed','activeCount','ratio','invoiceCount','updatedAt','accountName']) $(id).textContent = '';
  $('search').value = ''; $('status').value = '';
  document.querySelectorAll('[data-category]').forEach(b => b.setAttribute('aria-pressed',String(!b.dataset.category)));
  $('privateApp').hidden = true; $('loginScreen').hidden = false;
}
async function api(url, value) {
  const response = await fetch(url,{method:value===undefined?'GET':'POST',cache:'no-store',credentials:'same-origin',headers:value===undefined?{}:{'Content-Type':'application/json',...(session?{'X-CSRF-Token':session.csrf}:{})},body:value===undefined?undefined:JSON.stringify(value)});
  const result = await response.json();
  if (!response.ok) { if (response.status===401) { clearPrivate(); setupRequired = !!result.setupRequired; configureLogin(); } throw new Error(result.error || 'Não foi possível carregar os dados.'); }
  return result;
}
function configureLogin() {
  $('setupTokenLabel').hidden = !setupRequired;
  $('setupToken').required = setupRequired;
  $('loginTitle').textContent = setupRequired ? 'Criar administrador' : 'Entre na sua conta';
  $('loginHint').textContent = setupRequired ? 'Primeiro acesso: copie a chave DASHBOARD_SETUP_TOKEN nas configurações privadas da hospedagem e escolha seu usuário e uma senha de pelo menos 12 caracteres.' : 'Use o mesmo usuário e senha do dashboard.';
  $('loginSubmit').textContent = setupRequired ? 'Criar minha conta' : 'Entrar';
  $('password').minLength = setupRequired ? 12 : 1;
  $('password').autocomplete = setupRequired ? 'new-password' : 'current-password';
}
async function loadState() {
  const ticket = ++generation;
  try {
    $('syncMessage').textContent = 'Consultando dados salvos…';
    const {state} = await api('/api/mobile-state');
    if (ticket !== generation || !session) return;
    const previous = $('month').value;
    data = Object.values(state.buckets).flatMap(bucket => bucket.rows.map(row => ({id:row.title || row.billingIdentifier || row.contract,month:bucket.month,entity:row.entity,operator:row.operator,category:row.contractCategory,name:row.beneficiaryName,billed:row.billed,received:row.received,due:row.due,cancelled:row.cancelled || !!row.cancelDate})));
    months = [...new Set(Object.values(state.buckets).map(bucket=>bucket.month))].sort();
    $('month').replaceChildren(...months.map(month=>{const option=el('option',monthLabel(month));option.value=month;return option;}));
    $('month').value = months.includes(previous) ? previous : months.includes('2026-10') ? '2026-10' : months.at(-1) || '';
    $('accountName').textContent = session.user.displayName;
    $('updatedAt').textContent = 'Consultado em '+new Date().toLocaleString('pt-BR');
    $('syncMessage').textContent = months.length ? '' : 'Nenhum arquivo importado. Abra “Importar arquivos e administrar” para começar.';
    $('loginScreen').hidden = true; $('privateApp').hidden = false;
    render();
  } catch(error) { if (session) { clearPrivate(); $('loginError').textContent = 'Não foi possível atualizar. Entre novamente quando a conexão voltar.'; } else $('loginError').textContent = error.message; }
}
$('loginForm').onsubmit = async event => {
  event.preventDefault(); $('loginSubmit').disabled = true; $('loginError').textContent = '';
  try {
    const credentials = {username:$('username').value,password:$('password').value};
    if (setupRequired) { await api('/api/setup',{...credentials,token:$('setupToken').value}); setupRequired=false; configureLogin(); }
    session=await api('/api/login',credentials);
    $('password').value=''; $('setupToken').value=''; await loadState();
  } catch(error) { $('loginError').textContent=error.message; }
  finally { $('loginSubmit').disabled=false; }
};
$('refresh').onclick = () => loadState();
$('logout').onclick = async () => {
  try { await api('/api/logout',{}); clearPrivate(); $('loginError').textContent=''; }
  catch { clearPrivate(); $('loginError').textContent='Conexão indisponível. Os dados foram ocultados; reconecte para encerrar a sessão no servidor.'; }
};
// Dados ficam somente em memória; toda volta ao aplicativo exige nova consulta.
window.addEventListener('pagehide',()=>clearPrivate());
async function resume() {
  clearPrivate();
  try { session=await api('/api/session'); setupRequired=false; configureLogin(); await loadState(); }
  catch { configureLogin(); }
}
window.addEventListener('pageshow', event => { if(event.persisted) resume(); });
document.addEventListener('visibilitychange',()=>{if(document.hidden) clearPrivate(); else resume();});
resume();
