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
 const games=Math.max(0,Number(stats.games)||0),wins=Math.max(0,Number(stats.wins)||0),losses=Math.max(0,Number(stats.losses)||0),draws=Math.max(0,Number(stats.draws)||0),winRate=games?Math.round((wins/games)*100):0;
 const box=q('profile-stats');if(box)box.innerHTML=`<div class="profile-stat profile-stat--games"><span class="profile-stat-icon">🎮</span><b>${games}</b><span>Игр</span></div><div class="profile-stat profile-stat--wins"><span class="profile-stat-icon">🏆</span><b>${wins}</b><span>Побед</span></div><div class="profile-stat profile-stat--losses"><span class="profile-stat-icon">⚔️</span><b>${losses}</b><span>Поражений</span></div><div class="profile-stat profile-stat--draws"><span class="profile-stat-icon">🤝</span><b>${draws}</b><span>Ничьих</span></div>`;
 const extra=q('profile-extra');if(extra)extra.innerHTML=`<div class="profile-extra-row"><span>Процент побед</span><strong>${winRate}%</strong></div><div class="profile-progress"><span style="width:${Math.min(100,winRate)}%"></span></div><div class="profile-extra-row"><span>Статус</span><strong>${window.CheckersAuth?.registered?'Игрок MAX':'Гость'}</strong></div>`;
 renderOwnedBoards();
 try{window.CheckersShop?.sync?.().then(renderOwnedBoards).catch(()=>{})}catch{}
}
function startOnlineFromButton(){const openRooms=()=>window.CheckersRooms?.open?.();if(window.CheckersRooms?.open){openRooms();return}show('online-search-screen');const el=q('online-search-text');if(el)el.textContent='Загрузка комнат…';const handler=()=>{window.removeEventListener('checkers-online-ready',handler);openRooms()};window.addEventListener('checkers-online-ready',handler,{once:true})}
function bindNavigation(){const profileAdmin=()=>{if(String(window.CheckersAuth?.user?.id)!=='163701646')return false;window.CheckersAdmin?.show?.();return true};q('shop-btn')?.addEventListener('click',()=>show('shop-screen'));q('profile-btn')?.addEventListener('click',()=>{syncProfile();show('profile-screen')});q('rules-btn')?.addEventListener('click',()=>show('rules-screen'));q('shop-back')?.addEventListener('click',()=>show('menu-screen'));q('profile-back')?.addEventListener('click',()=>show('menu-screen'));q('rules-back')?.addEventListener('click',()=>show('menu-screen'));const profileBox=q('profile-screen');if(profileBox&&String(window.CheckersAuth?.user?.id)==='163701646'&&!q('profile-admin-btn')){const b=document.createElement('button');b.id='profile-admin-btn';b.className='btn btn--primary';b.textContent='⚙️ Админ-панель';b.addEventListener('click',profileAdmin);profileBox.querySelector('.profile-panel')?.appendChild(b);}const onlineBtn=q('online-play-btn');if(onlineBtn)onlineBtn.onclick=e=>{e.preventDefault();e.stopPropagation();startOnlineFromButton()};const cancel=q('online-cancel-btn');if(cancel)cancel.onclick=e=>{e.preventDefault();e.stopPropagation();show('menu-screen')}}
function boot(){bindNavigation();q('game-back')?.addEventListener('click',gameBack);window.addEventListener('max-profile-ready',syncProfile);window.addEventListener('shop-state-ready',()=>{renderOwnedBoards();syncProfile()});window.addEventListener('online-game-started',()=>show('game-screen'));syncProfile()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
