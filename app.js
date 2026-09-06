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
  if(status)status.textContent=window.CheckersAuth?.registered?'✓ Профиль MAX подтверждён':'Профиль MAX';
  if(avatar&&user.photo){
    avatar.src=user.photo;avatar.style.display='block';
    if(fallback)fallback.style.display='none';
  }else if(avatar){
    avatar.removeAttribute('src');avatar.style.display='none';
    if(fallback)fallback.style.display='grid';
  }
  let stats={};
  try{stats=JSON.parse(localStorage.getItem(ACCOUNT_KEY)||'null')||{}}catch(e){}
  const items=[['games','Игр'],['wins','Побед'],['losses','Поражений'],['draws','Ничьих']];
  const box=q('profile-stats');
  if(box)box.innerHTML=items.map(([key,label])=>`<div class="profile-stat"><b>${Number(stats[key]||0)}</b><span>${label}</span></div>`).join('');
}

function bindNavigation(){
  q('shop-btn')?.addEventListener('click',()=>show('shop-screen'));
  q('profile-btn')?.addEventListener('click',()=>{syncProfile();show('profile-screen')});
  q('rules-btn')?.addEventListener('click',()=>show('rules-screen'));
  q('shop-back')?.addEventListener('click',()=>show('menu-screen'));
  q('profile-back')?.addEventListener('click',()=>show('menu-screen'));
  q('rules-back')?.addEventListener('click',()=>show('menu-screen'));
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
