(()=>{
'use strict';
const q=id=>document.getElementById(id);
const show=id=>document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));
const ACCOUNT_KEY='russian-checkers-account-v2';

function gameBack(){
  if(window.CheckersOnline?.active){ window.CheckersOnline.cancel(); return; }
  show('menu-screen');
}

function syncProfile(){
  const user=window.CheckersAuth?.user;
  if(!user)return;
  const avatar=q('max-profile-avatar'),fallback=q('max-profile-avatar-fallback');
  const name=q('max-profile-name'),username=q('max-profile-username'),status=q('max-profile-status');
  if(name)name.textContent=user.name||user.username||'Игрок';
  if(username)username.textContent=user.username?('@'+user.username):'Профиль MAX';
  if(status){
    status.textContent=window.CheckersAuth?.registered?'✓ Профиль MAX подтверждён':'Гостевой профиль';
    status.classList.toggle('is-guest',!window.CheckersAuth?.registered);
  }
  if(avatar&&user.photo){
    avatar.src=user.photo;avatar.style.display='block';
    if(fallback)fallback.style.display='none';
  }else if(avatar){
    avatar.removeAttribute('src');avatar.style.display='none';
    if(fallback)fallback.style.display='grid';
  }

  let stats={};
  try{stats=JSON.parse(localStorage.getItem(ACCOUNT_KEY)||'null')||{}}catch(e){}
  const games=Math.max(0,Number(stats.games)||0);
  const wins=Math.max(0,Number(stats.wins)||0);
  const losses=Math.max(0,Number(stats.losses)||0);
  const draws=Math.max(0,Number(stats.draws)||0);
  const winRate=games?Math.round((wins/games)*100):0;
  const box=q('profile-stats');
  if(box)box.innerHTML=`
    <div class="profile-stat profile-stat--games"><span class="profile-stat-icon">🎮</span><b>${games}</b><span>Игр</span></div>
    <div class="profile-stat profile-stat--wins"><span class="profile-stat-icon">🏆</span><b>${wins}</b><span>Побед</span></div>
    <div class="profile-stat profile-stat--losses"><span class="profile-stat-icon">⚔️</span><b>${losses}</b><span>Поражений</span></div>
    <div class="profile-stat profile-stat--draws"><span class="profile-stat-icon">🤝</span><b>${draws}</b><span>Ничьих</span></div>`;

  const extra=q('profile-extra');
  if(extra)extra.innerHTML=`
    <div class="profile-extra-row"><span>Процент побед</span><strong>${winRate}%</strong></div>
    <div class="profile-progress"><span style="width:${Math.min(100,winRate)}%"></span></div>
    <div class="profile-extra-row"><span>Статус</span><strong>${window.CheckersAuth?.registered?'Игрок MAX':'Гость'}</strong></div>`;
}

function startOnlineFromButton(){
  const openRooms=()=>window.CheckersRooms?.open?.();
  if(window.CheckersRooms?.open){openRooms();return;}
  show('online-search-screen');
  const el=q('online-search-text');
  if(el)el.textContent='Загрузка комнат…';
  const handler=()=>{window.removeEventListener('checkers-online-ready',handler);openRooms()};
  window.addEventListener('checkers-online-ready',handler,{once:true});
}

function bindNavigation(){
  q('shop-btn')?.addEventListener('click',()=>show('shop-screen'));
  q('profile-btn')?.addEventListener('click',()=>{syncProfile();show('profile-screen')});
  q('rules-btn')?.addEventListener('click',()=>show('rules-screen'));
  q('shop-back')?.addEventListener('click',()=>show('menu-screen'));
  q('profile-back')?.addEventListener('click',()=>show('menu-screen'));
  q('rules-back')?.addEventListener('click',()=>show('menu-screen'));
  const onlineBtn=q('online-play-btn');
  if(onlineBtn){
    onlineBtn.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      startOnlineFromButton();
    };
  }
  const cancel=q('online-cancel-btn');
  if(cancel){
    cancel.onclick=e=>{e.preventDefault();e.stopPropagation();show('menu-screen')};
  }
}

function boot(){
  bindNavigation();
  q('game-back')?.addEventListener('click',gameBack);
  window.addEventListener('max-profile-ready',syncProfile);
  window.addEventListener('online-game-started',()=>show('game-screen'));
  syncProfile();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
