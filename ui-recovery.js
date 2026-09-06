(()=>{
'use strict';
function boot(){
  const $=id=>document.getElementById(id);
  const show=id=>{document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$(id)?.classList.add('active')};
  // ВАЖНО: не скрываем MAX-регистрацию. Если игра открыта вне MAX,
  // экран регистрации должен оставаться поверх интерфейса.
  const syncProfile=()=>{
    const user=window.CheckersAuth?.user;
    if(!user)return;
    const avatar=$('profile-avatar-img'),fallback=$('profile-avatar-fallback'),name=$('profile-name'),username=$('profile-username');
    if(name)name.textContent=user.name||user.username||'Игрок';
    if(username)username.textContent=user.username?('@'+user.username):'Профиль MAX';
    if(avatar&&user.photo){avatar.src=user.photo;avatar.style.display='block';if(fallback)fallback.style.display='none'}
    else if(avatar){avatar.style.display='none';if(fallback)fallback.style.display='grid'}
  };
  syncProfile();
  setInterval(syncProfile,500);
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');
    if(!b)return;
    if(b.id==='shop-btn'){show('shop-screen');return}
    if(b.id==='profile-btn'){syncProfile();show('profile-screen');return}
    if(b.id==='rules-btn'){show('rules-screen');return}
    if(b.id==='shop-back'||b.id==='profile-back'||b.id==='rules-back'){show('menu-screen');return}
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
