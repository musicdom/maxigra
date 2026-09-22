(()=>{
'use strict';
const q=id=>document.getElementById(id);
const show=id=>document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));
const ACCOUNT_KEY='russian-checkers-account-v2';
function esc(v){return String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}
function gameBack(){if(window.CheckersOnline?.active){window.CheckersOnline.cancel();return}show('menu-screen')}
function renderOwnedBoards(){
 const box=q('profile-boards'),shop=window.CheckersShop;if(!box||!shop)return;
 const state=shop.state||{},catalog=shop.catalog||{};
 const ids=(shop.boardIds||[]).filter(id=>shop.owned(id)&&catalog[id]);
 if(!ids.length){box.innerHTML='<div class="profile-empty">Покупок пока нет</div>';return}
 box.innerHTML=`<div class="profile-section-title">Мои доски</div><div class="owned-boards">${ids.map(id=>{const x=catalog[id],selected=state.selectedBoard===id;return `<button type="button" class="owned-board ${selected?'is-selected':''}" data-board-id="${esc(id)}"><img src="${esc(x.image)}" alt=""><span>${esc(x.title)}</span><small>${selected?'Выбрана':'Выбрать'}</small></button>`}).join('')}</div>`;
 box.querySelectorAll('[data-board-id]').forEach(btn=>btn.addEventListener('click',async()=>{const id=btn.dataset.boardId;try{await shop.selectBoard(id);renderOwnedBoards();window.dispatchEvent(new CustomEvent('shop-state-ready',{detail:shop.state}))}catch{}}));
}
function syncProfile(){
 const user=window.CheckersAuth?.user;if(!user)return;
 const avatar=q('max-profile-avatar'),fallback=q('max-profile-avatar-fallback'),name=q('max-profile-name'),username=q('max-profile-username'),status=q('max-profile-status');
 if(name)name.textContent=user.name||user.username||'Игрок';if(username)username.textContent=user.username?('@'+user.username):'Профиль MAX';
 if(status){status.textContent=window.CheckersAuth?.registered?'✓ Профиль MAX подтверждён':'Гостевой профиль';status.classList.toggle('is-guest',!window.CheckersAuth?.registered)}
 if(avatar&&user.photo){avatar.src=user.photo;avatar.style.display='block';if(fallback)fallback.style.display='none'}else if(avatar){avatar.removeAttribute('src');avatar.style.display='none';if(fallback)fallback.style.display='grid'}
 let stats={};try{stats=JSON.parse(localStorage.getItem(ACCOUNT_KEY)||'null')||{}}catch(e){}
 const renderStats=s=>{const games=Math.max(0,Number(s.games)||0),wins=Math.max(0,Number(s.wins)||0),losses=Math.max(0,Number(s.losses)||0),draws=Math.max(0,Number(s.draws)||0),winRate=games?Math.round((wins/games)*100):0;
 const box=q('profile-stats');if(box)box.innerHTML=`<div class="profile-stat profile-stat--games"><span class="profile-stat-icon">🎮</span><b>${games}</b><span>Игр</span></div><div class="profile-stat profile-stat--wins"><span class="profile-stat-icon">🏆</span><b>${wins}</b><span>Побед</span></div><div class="profile-stat profile-stat--losses"><span class="profile-stat-icon">⚔️</span><b>${losses}</b><span>Поражений</span></div><div class="profile-stat profile-stat--draws"><span class="profile-stat-icon">🤝</span><b>${draws}</b><span>Ничьих</span></div>`;
 const extra=q('profile-extra');if(extra)extra.innerHTML=`<div class="profile-extra-row"><span>Процент побед</span><strong>${winRate}%</strong></div><div class="profile-progress"><span style="width:${Math.min(100,winRate)}%"></span></div><div class="profile-extra-row"><span>Статус</span><strong>${window.CheckersAuth?.registered?'Игрок MAX':'Гость'}</strong></div>`;};
 renderStats(stats);
 try{const init=window.WebApp?.initData||'';if(init)fetch(window.maxigraApiUrl('/api/profile'),{headers:{'x-max-init-data':init,'cache-control':'no-cache'}}).then(r=>r.json()).then(d=>{if(d?.ok&&d.stats){renderStats(d.stats);try{localStorage.setItem(ACCOUNT_KEY,JSON.stringify(d.stats))}catch{}}}).catch(()=>{})}catch{}
 renderOwnedBoards();
 try{window.CheckersShop?.sync?.().then(renderOwnedBoards).catch(()=>{})}catch{}
}

function starterOfferPurchased(){
 const s=window.CheckersShop?.state||{};
 return Array.isArray(s.owned)&&s.owned.includes('starter_pack');
}
function initStarterOffer(){
 const offer=q('starter-offer');if(!offer)return;
 const firstKey='maxigra-starter-offer-first-open-v1',sessionKey='maxigra-starter-offer-session-v1';
 const now=Date.now();
 let first=0;try{first=Number(localStorage.getItem(firstKey)||0)}catch{}
 if(!first){first=now;try{localStorage.setItem(firstKey,String(first))}catch{}}
 if(now-first>=24*60*60*1000||starterOfferPurchased())return;
 let shownThisSession=false;try{shownThisSession=sessionStorage.getItem(sessionKey)==='1'}catch{}
 if(shownThisSession)return;
 let closed=false;
 const close=()=>{if(closed)return;closed=true;offer.classList.remove('is-visible');offer.classList.add('is-closing');offer.setAttribute('aria-hidden','true');setTimeout(()=>offer.classList.remove('is-closing'),360)};
 const showOffer=()=>{if(closed||starterOfferPurchased())return;if(document.getElementById('startup-screen')){setTimeout(showOffer,120);return}try{sessionStorage.setItem(sessionKey,'1')}catch{};offer.classList.add('is-visible');offer.setAttribute('aria-hidden','false')};
 q('starter-offer-close')?.addEventListener('click',close);offer.querySelector('[data-starter-close]')?.addEventListener('click',close);
 q('starter-offer-buy')?.addEventListener('click',async()=>{const b=q('starter-offer-buy');if(!b)return;b.disabled=true;b.textContent='Подготавливаем оплату…';try{const order=await window.CheckersShop?.buy?.('starter_pack');const url=order?.paymentUrl||order?.paymentOptions?.wallet;if(url){try{window.WebApp?.openLink?.(url)}catch{} if(!window.WebApp?.openLink)window.location.href=url;close()}else{b.disabled=false;b.textContent='Купить набор · 599 ₽'}}catch{b.disabled=false;b.textContent='Купить набор · 599 ₽'}});
 showOffer();
}
function startOnlineFromButton(){const openRooms=()=>window.CheckersRooms?.open?.();if(window.CheckersRooms?.open){openRooms();return}show('online-search-screen');const el=q('online-search-text');if(el)el.textContent='Загрузка комнат…';const handler=()=>{window.removeEventListener('checkers-online-ready',handler);openRooms()};window.addEventListener('checkers-online-ready',handler,{once:true})}
function ensureAdminButton(){const panel=q('profile-screen')?.querySelector('.profile-panel');if(!panel)return;let b=q('profile-admin-btn');const isAdmin=String(window.CheckersAuth?.user?.id)==='163701646';if(!isAdmin){b?.remove();return}if(!b){b=document.createElement('button');b.id='profile-admin-btn';b.className='btn btn--primary';b.textContent='⚙️ Админ-панель';b.addEventListener('click',()=>window.CheckersAdmin?.show?.());panel.appendChild(b)}}
function bindNavigation(){q('shop-btn')?.addEventListener('click',()=>show('shop-screen'));q('profile-btn')?.addEventListener('click',()=>{syncProfile();show('profile-screen')});q('rules-btn')?.addEventListener('click',()=>show('rules-screen'));q('shop-back')?.addEventListener('click',()=>show('menu-screen'));q('profile-back')?.addEventListener('click',()=>show('menu-screen'));q('rules-back')?.addEventListener('click',()=>show('menu-screen'));ensureAdminButton();const onlineBtn=q('online-play-btn');if(onlineBtn)onlineBtn.onclick=e=>{e.preventDefault();e.stopPropagation();startOnlineFromButton()};const cancel=q('online-cancel-btn');if(cancel)cancel.onclick=e=>{e.preventDefault();e.stopPropagation();show('menu-screen')}}
function boot(){bindNavigation();setTimeout(initStarterOffer,900);q('game-back')?.addEventListener('click',gameBack);window.addEventListener('max-profile-ready',()=>{syncProfile();ensureAdminButton();setTimeout(initStarterOffer,180)});window.addEventListener('shop-state-ready',()=>{renderOwnedBoards();syncProfile()});window.addEventListener('online-game-started',()=>show('game-screen'));syncProfile()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
