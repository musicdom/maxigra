(()=>{'use strict';
const q=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let accounts=[],boards={},selectedId='',detail=null,search='',view='list';
function init(){q('admin-back')?.addEventListener('click',()=>showMenu());q('admin-refresh')?.addEventListener('click',load);q('admin-content')&&load();}
function showMenu(){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));q('menu-screen')?.classList.add('active');}
function showAdmin(){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));q('admin-screen')?.classList.add('active');load();}
function notice(t){const e=q('admin-notice');if(e){e.textContent=t;e.classList.add('is-visible');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('is-visible'),3000)}}
async function api(body=null,query=''){
 const init=await window.CheckersShop?.getInitData?.();if(!init)throw Error('MAX_INIT_DATA_REQUIRED');
 const opts=body?{method:'POST',headers:{'content-type':'text/plain;charset=UTF-8'},body:JSON.stringify({...body,initData:init}),cache:'no-store'}:{headers:{'x-max-init-data':init},cache:'no-store'};
 const url='/api/admin'+query;
 const r=window.maxigraFetch?await window.maxigraFetch(url,opts):await fetch(window.maxigraApiUrl(url),opts),d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'ADMIN_ERROR');return d;
}
function boardButtons(u){
 const owned=u.shop?.owned||[];
 return Object.entries(boards).map(([id,x])=>`<button class="admin-board ${owned.includes(id)?'is-owned':''}" data-board="${esc(id)}" data-user="${esc(u.id)}"><span>${esc(x.title)}</span><small>${owned.includes(id)?'✓ доступна':'Выдать доску'}</small></button>`).join('');
}
function render(){
 const box=q('admin-content');if(!box)return;
 if(view==='profile'&&selectedId){box.innerHTML='<section id="admin-player-detail" class="admin-player-detail admin-player-detail-screen"><div class="admin-loading">Загружаем профиль игрока…</div></section>';if(detail&&String(detail.user?.id)===selectedId)renderDetail();return;}
 const filtered=accounts.filter(u=>[u.name,u.username,u.id].some(v=>String(v||'').toLowerCase().includes(search.toLowerCase())));
 box.innerHTML=`<div class="admin-summary"><div><b>${accounts.length}</b><span>Аккаунтов</span></div><div><b>${accounts.filter(u=>Date.now()-Number(u.lastSeenAt||0)<86400000).length}</b><span>Заходили за 24 ч.</span></div><div><b>${accounts.filter(u=>Number(u.openCount||0)>0).reduce((n,u)=>n+Number(u.openCount||0),0)}</b><span>Всего открытий</span></div></div>
 <label class="admin-search"><span>⌕</span><input id="admin-search-input" type="search" placeholder="Поиск по имени, ID или username" value="${esc(search)}"></label>
 <div class="admin-account-list">${filtered.length?filtered.map(u=>`<button type="button" class="admin-account admin-account-open ${String(selectedId)===String(u.id)?'is-selected':''}" data-profile="${esc(u.id)}">
 <span class="admin-avatar">${u.photo?'<img src="'+esc(u.photo)+'" alt="">':'♟️'}</span><span class="admin-user-main"><b>${esc(u.name||'Игрок')}</b><span>ID: ${esc(u.id)}</span><span>${u.username?'@'+esc(u.username):'Username не указан'}</span></span><span class="admin-account-meta"><b>${Number(u.openCount||0)} открытий</b><small>${u.lastSeenAt?'Последний вход: '+new Date(Number(u.lastSeenAt)).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'Нет даты входа'}</small><span>Посмотреть профиль →</span></span>
 </button>`).join(''):'<div class="admin-empty">Ничего не найдено.</div>'}</div>`;
 q('admin-search-input')?.addEventListener('input',e=>{search=e.target.value;const pos=e.target.selectionStart;render();const el=q('admin-search-input');el?.focus();el?.setSelectionRange(pos,pos)});
 box.querySelectorAll('[data-profile]').forEach(b=>b.addEventListener('click',()=>{selectedId=String(b.dataset.profile);detail=null;view='profile';render();loadDetail(selectedId)}));
}
function renderDetail(){
 const box=q('admin-player-detail');if(!box||!detail)return;
 const u=detail.user||{},s=detail.stats||{},shop=detail.shop||{},owned=shop.owned||[],total=Number(s.offline?.games||0)+Number(s.online?.games||0),wins=Number(s.offline?.wins||0)+Number(s.online?.wins||0),losses=Number(s.offline?.losses||0)+Number(s.online?.losses||0),draws=Number(s.offline?.draws||0)+Number(s.online?.draws||0);
 box.innerHTML=`<button type="button" class="btn btn--secondary admin-profile-back" id="admin-profile-back">← Назад к аккаунтам</button><div class="admin-detail-head"><div><small>ПРОФИЛЬ ИГРОКА</small><h3>${esc(u.name||'Игрок')}</h3><span>ID MAX: ${esc(u.id)}</span></div><button type="button" class="admin-detail-close" id="admin-detail-close" aria-label="Закрыть профиль">×</button></div>
 <div class="admin-max-data"><div><span>Username</span><b>${u.username?'@'+esc(u.username):'Не указан в MAX'}</b></div><div><span>Дата первого входа</span><b>${u.createdAt?new Date(Number(u.createdAt)).toLocaleString('ru-RU'):'Нет данных'}</b></div><div><span>Последний вход</span><b>${u.lastSeenAt?new Date(Number(u.lastSeenAt)).toLocaleString('ru-RU'):'Нет данных'}</b></div><div><span>Открытий приложения</span><b>${Number(u.openCount||0)}</b></div></div>
 <div class="admin-detail-stats"><div><b>${total}</b><span>Сыграно партий</span></div><div><b>${wins}</b><span>Побед</span></div><div><b>${losses}</b><span>Поражений</span></div><div><b>${draws}</b><span>Ничьих</span></div></div>
 <div class="admin-detail-subtitle">Статистика по режимам</div><div class="admin-mode-stats"><div><b>🎮 Офлайн</b><span>${Number(s.offline?.games||0)} игр · ${Number(s.offline?.wins||0)} побед</span></div><div><b>🌐 Онлайн</b><span>${Number(s.online?.games||0)} игр · ${Number(s.online?.wins||0)} побед</span></div></div>
 <div class="admin-detail-subtitle">Игровые доски</div><p class="admin-detail-hint">Нажми на доску, чтобы выдать её или снять доступ. «Оригинал» остаётся бесплатной.</p><div class="admin-boards">${boardButtons({...u,shop})}</div>
 <button type="button" class="btn btn--secondary admin-reset" data-reset="${esc(u.id)}">Очистить покупки и оставить «Оригинал»</button>
 <div class="admin-detail-subtitle">История покупок и оплат <span class="admin-order-count">${(detail.orders||[]).length}</span></div>
 <p class="admin-detail-hint">Успешные оплаты подтверждены YooMoney. «Не оплачено» означает, что подтверждение оплаты не поступило до окончания срока заказа; это не обязательно означает отказ банка.</p>
 <div class="admin-order-list">${(detail.orders||[]).length?(detail.orders||[]).map(o=>{const titles={board_90s:'Доска «СВО»',board_svo:'Доска «90-е»',board_max:'Доска «MAX»',board_orbita:'Доска «ОРБИТА»',board_original:'Доска «Оригинал»',master:'Гроссмейстер',hints:'50 подсказок',starter_pack:'Набор новичка'};const status=o.status==='paid'?['Оплачено','paid']:o.status==='expired'?['Не оплачено · срок истёк','expired']:o.status==='failed'?['Ошибка оплаты','failed']:['Ожидает оплаты','pending'];return `<article class="admin-order-row"><div class="admin-order-main"><b>${esc(titles[o.itemId]||o.itemId)}</b><span>${o.createdAt?new Date(o.createdAt).toLocaleString('ru-RU'):'Дата неизвестна'}</span><small>Заказ: ${esc(o.id)}</small>${o.operationId?'<small>Платёж: '+esc(o.operationId)+'</small>':''}</div><div class="admin-order-side"><b>${Number(o.price).toLocaleString('ru-RU')} ₽</b><span class="admin-order-status is-${status[1]}">${status[0]}</span>${o.paidAt?'<small>Оплачен: '+new Date(o.paidAt).toLocaleString('ru-RU')+'</small>':''}</div></article>`}).join(''):'<div class="admin-empty admin-order-empty">История покупок пока пуста.</div>'}</div>
 <button type="button" class="btn btn--secondary admin-contact" id="admin-contact-user">Открыть контакт игрока в MAX ↗</button>`;
 q('admin-profile-back')?.addEventListener('click',()=>{view='list';selectedId='';detail=null;render()});
 q('admin-detail-close')?.addEventListener('click',()=>{view='list';selectedId='';detail=null;render()});
 box.querySelectorAll('[data-board]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const own=(detail.shop?.owned||[]).includes(b.dataset.board);await api({action:own?'revoke':'grant',userId:selectedId,boardId:b.dataset.board});await loadDetail(selectedId);await load();notice(own?'Доступ к доске снят':'Доска выдана игроку')}catch(e){notice(e.message)}finally{b.disabled=false}});
 box.querySelector('[data-reset]')?.addEventListener('click',async b=>{if(!confirm('Убрать все дополнительные доски у игрока? «Оригинал» останется бесплатно.'))return;b.currentTarget.disabled=true;try{await api({action:'reset',userId:selectedId});await loadDetail(selectedId);await load();notice('Покупки очищены')}catch(e){notice(e.message)}finally{b.currentTarget.disabled=false}});
 q('admin-contact-user')?.addEventListener('click',async b=>{b.currentTarget.disabled=true;try{await api({action:'contact',userId:selectedId});notice('Контакт игрока отправлен в MAX')}catch(e){notice(e.message)}finally{b.currentTarget.disabled=false}});
}
async function loadDetail(id){try{detail=await api(null,'?userId='+encodeURIComponent(id));if(view==='profile'&&String(selectedId)===String(id)){render();renderDetail()}}catch(e){const box=q('admin-player-detail');if(box)box.innerHTML='<div class="admin-empty">'+esc(e.message)+'</div>'}}
async function load(){try{q('admin-content').innerHTML='<div class="admin-loading">Загружаем аккаунты…</div>';const d=await api();accounts=d.accounts||[];boards=d.boards||{};render();if(selectedId)await loadDetail(selectedId)}catch(e){q('admin-content').innerHTML='<div class="admin-empty">'+esc(e.message==='FORBIDDEN'?'Нет доступа к админ-панели.':e.message)+'</div>'}}
window.CheckersAdmin={show:showAdmin,init};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();