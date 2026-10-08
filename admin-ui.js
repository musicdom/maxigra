(()=>{'use strict';
const q=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\"':'&quot;',"'":'&#39;'}[m]));
let accounts=[],boards={};
function init(){q('admin-back')?.addEventListener('click',()=>showMenu());q('admin-refresh')?.addEventListener('click',load);q('admin-reset-leaderboard')?.addEventListener('click',resetLeaderboard);q('admin-content')&&load();}
function showMenu(){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));q('menu-screen')?.classList.add('active');}
function showAdmin(){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));q('admin-screen')?.classList.add('active');load();}
function notice(t){const e=q('admin-notice');if(e){e.textContent=t;e.classList.add('is-visible');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('is-visible'),2500)}}
async function api(body=null){
 const init=String(await window.CheckersShop?.getInitData?.()||'').trim();if(!init)throw Error('MAX_INIT_DATA_REQUIRED');
 const url=window.maxigraApiUrl('/api/admin');
 const opts={method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body||{action:'list'}),cache:'no-store'};
 try{opts.headers['x-max-init-data']=init;const r=await fetch(url,opts);const d=await r.json().catch(()=>({ok:false,error:'BAD_RESPONSE'}));if(!r.ok||!d.ok)throw Error(d.error||'ADMIN_ERROR');return d}
 catch(e){
   if(e?.name==='TypeError'&&/pattern|header|invalid/i.test(String(e.message||''))){
     const safeInit=init.replace(/[\\r\\n]/g,'');
     const retry={...opts,headers:{'content-type':'application/json','x-max-init-data':safeInit}};
     const r=await fetch(url,retry);const d=await r.json().catch(()=>({ok:false,error:'BAD_RESPONSE'}));if(!r.ok||!d.ok)throw Error(d.error||'ADMIN_ERROR');return d;
   }
   throw e;
 }
}
async function resetLeaderboard(){
 if(!confirm('Сбросить рейтинг? Текущий месячный лидерборд будет закрыт, а новый начнётся с нуля. Статистика профилей не удаляется.'))return;
 const b=q('admin-reset-leaderboard');if(b)b.disabled=true;
 try{const d=await api({action:'reset_leaderboard'});notice('Лидерборд сброшен. Начат новый месяц.');if(d?.resetAt)sessionStorage.setItem('maxigra-leaderboard-reset-at',String(d.resetAt));window.CheckersLeaderboard?.load?.();}
 catch(e){notice(e.message||'Не удалось сбросить лидерборд')}finally{if(b)b.disabled=false}
}
function render(){
 const box=q('admin-content');if(!box)return;
 if(!accounts.length){box.innerHTML='<div class="admin-empty">Пока нет зарегистрированных аккаунтов.</div>';return}
 box.innerHTML=accounts.map(u=>{const owned=u.shop?.owned||[];return `<article class="admin-account">
  <div class="admin-user"><div class="admin-avatar">${u.photo?'<img src="'+esc(u.photo)+'" alt="">':'♟️'}<button type="button" class="admin-open-max" data-max-user="${esc(u.id)}" data-max-username="${esc(u.username||'')}" aria-label="Открыть аккаунт в MAX">MAX ↗</button></div><button type="button" class="admin-open-max" data-max-user="${esc(u.id)}" data-max-username="${esc(u.username||'')}" aria-label="Открыть аккаунт в MAX">MAX ↗</button><div class="admin-user-main"><b>${esc(u.name||'Игрок')}</b><span>ID: ${esc(u.id)}</span>${u.username?'<span>@'+esc(u.username)+'</span>':''}</div>${String(u.id)==='163701646'?'<em>АДМИН</em>':''}</div>
  <div class="admin-boards">${Object.entries(boards).map(([id,x])=>`<button class="admin-board ${owned.includes(id)?'is-owned':''}" data-user="${esc(u.id)}" data-board="${id}"><span>${esc(x.title)}</span><small>${owned.includes(id)?'✓ доступна':'299 ₽'}</small></button>`).join('')}</div>
  <button class="btn btn--secondary admin-reset" data-reset="${esc(u.id)}">🧹 Очистить покупки</button>
 </article>`}).join('');
  box.querySelectorAll('[data-max-user]').forEach(b=>b.addEventListener('click',async()=>{
    const id=String(b.dataset.maxUser||'').trim();
    if(!id)return;
    b.disabled=true;
    try{await api({action:'contact',userId:id});notice('Сообщение с переходом на аккаунт отправлено в MAX.')}catch(err){notice(err.message)}finally{b.disabled=false}
  }));
 box.querySelectorAll('[data-board]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const own=b.classList.contains('is-owned');await api({action:own?'revoke':'grant',userId:b.dataset.user,boardId:b.dataset.board});await load();notice(own?'Доступ к доске снят':'Доска выдана аккаунту')}catch(e){notice(e.message)}finally{b.disabled=false}});
 box.querySelectorAll('[data-reset]').forEach(b=>b.onclick=async()=>{if(!confirm('Очистить купленные доски у этого аккаунта? Оригинал останется бесплатно.'))return;b.disabled=true;try{await api({action:'reset',userId:b.dataset.reset});await load();notice('Покупки очищены. Осталась «Оригинал».')}catch(e){notice(e.message)}finally{b.disabled=false}});
}
async function load(){try{q('admin-content').innerHTML='<div class="admin-loading">Загружаем аккаунты…</div>';const d=await api();accounts=d.accounts||[];boards=d.boards||{};render()}catch(e){q('admin-content').innerHTML='<div class="admin-empty">'+esc(e.message==='FORBIDDEN'?'Нет доступа к админ-панели.':e.message==='MAX_INIT_DATA_REQUIRED'?'MAX ещё не передал данные авторизации. Откройте профиль и попробуйте снова.':e.message)+'</div>'}}
window.CheckersAdmin={show:showAdmin,init};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();