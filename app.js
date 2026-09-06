(()=>{
'use strict';
const q=id=>document.getElementById(id);
const show=id=>document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));

function gameBack(){
  if(window.CheckersOnline?.active){
    window.CheckersOnline.cancel();
    return;
  }
  show('menu-screen');
}

function renderProfile(){
  const u=window.CheckersAuth?.user;
  if(!u)return;
  const name=q('max-profile-name');
  const un=q('max-profile-username');
  const img=q('max-profile-avatar');
  const fallback=q('max-profile-avatar-fallback');
  if(name)name.textContent=u.name||'Игрок';
  if(un)un.textContent=u.username?'@'+u.username:'Профиль MAX';
  if(img&&u.photo){
    img.src=u.photo;
    img.style.display='block';
    if(fallback)fallback.style.display='none';
  }else if(img){
    img.style.display='none';
    if(fallback)fallback.style.display='grid';
  }
  const s=JSON.parse(localStorage.getItem('russian-checkers-stats-v1')||'null')||{};
  const stats=[['games','Игр'],['wins','Побед'],['losses','Поражений'],['draws','Ничьих'],['rating','Рейтинг']];
  const box=q('profile-stats');
  if(box)box.innerHTML=stats.map(([k,l])=>`<div class="profile-stat"><b>${Number(s[k]||0)}</b><span>${l}</span></div>`).join('');
}

function boot(){
  q('game-back')?.addEventListener('click',gameBack);
  window.addEventListener('max-profile-ready',renderProfile);
  window.addEventListener('online-game-started',()=>show('game-screen'));
  renderProfile();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
