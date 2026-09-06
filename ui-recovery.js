(()=>{
'use strict';
function boot(){
  const $=id=>document.getElementById(id);
  const show=id=>{document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$(id)?.classList.add('active')};
  const syncProfile=()=>{
    const user=window.CheckersAuth?.user;if(!user)return;
    const avatar=$('max-profile-avatar'),fallback=$('max-profile-avatar-fallback'),name=$('max-profile-name'),username=$('max-profile-username'),status=$('max-profile-status');
    if(name)name.textContent=user.name||user.username||'Игрок';if(username)username.textContent=user.username?('@'+user.username):'Профиль MAX';if(status)status.textContent=window.CheckersAuth?.registered?'✓ Профиль MAX подтверждён':'Профиль MAX';
    if(avatar&&user.photo){avatar.src=user.photo;avatar.style.display='block';if(fallback)fallback.style.display='none'}else if(avatar){avatar.removeAttribute('src');avatar.style.display='none';if(fallback)fallback.style.display='grid'}
  };
  syncProfile();window.addEventListener('max-profile-ready',syncProfile);setInterval(syncProfile,1000);
  document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='shop-btn'){show('shop-screen');return}if(b.id==='profile-btn'){syncProfile();show('profile-screen');return}if(b.id==='rules-btn'){show('rules-screen');return}if(b.id==='shop-back'||b.id==='profile-back'||b.id==='rules-back'){show('menu-screen');return}});
  if($('online-hard-overlay'))return;
  const style=document.createElement('style');style.id='online-hard-style';style.textContent='#online-hard-overlay{position:fixed;inset:0;z-index:200000;display:none;align-items:center;justify-content:center;padding:22px;background:rgba(8,3,5,.97);color:#fff;font-family:Inter,system-ui,sans-serif}#online-hard-overlay.show{display:flex}#online-hard-card{width:min(92vw,390px);padding:30px 22px;border-radius:28px;text-align:center;background:linear-gradient(145deg,#35151c,#14080b);border:1px solid rgba(255,80,90,.35);box-shadow:0 25px 90px rgba(0,0,0,.7)}#online-hard-icon{font-size:54px;margin-bottom:12px}#online-hard-card h2{margin:0 0 9px;font-size:25px}#online-hard-card p{margin:0 0 18px;color:rgba(255,230,230,.72);font-size:14px;line-height:1.5}#online-hard-loader{width:42px;height:42px;margin:18px auto;border:3px solid rgba(255,255,255,.16);border-top-color:#ff5252;border-radius:50%;animation:onlineHardSpin .8s linear infinite}@keyframes onlineHardSpin{to{transform:rotate(360deg)}}#online-hard-cancel{width:100%;min-height:52px;border:1px solid rgba(255,255,255,.15);border-radius:15px;background:rgba(255,255,255,.08);color:#fff;font-weight:700;font-size:15px}';document.head.appendChild(style);
  const overlay=document.createElement('div');overlay.id='online-hard-overlay';overlay.innerHTML='<div id="online-hard-card"><div id="online-hard-icon">⚔️</div><h2>Ищем соперника</h2><p id="online-hard-text">Подключаем вас к случайному игроку MAX…</p><div id="online-hard-loader"></div><button id="online-hard-cancel" type="button">Отменить поиск</button></div>';document.body.appendChild(overlay);
  const open=()=>{const text=$('online-hard-text');if(text)text.textContent='Подключаем вас к случайному игроку MAX…';overlay.classList.add('show');setTimeout(()=>{if(window.CheckersOnline?.start)window.CheckersOnline.start()},0)};
  const btn=$('online-play-btn');if(btn)btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();open()},{capture:true});
  $('online-hard-cancel').onclick=async()=>{overlay.classList.remove('show');if(window.CheckersOnline?.cancel)await window.CheckersOnline.cancel();else show('menu-screen')};
  window.addEventListener('online-search-message',e=>{const text=$('online-hard-text');if(text&&e.detail)text.textContent=e.detail});window.addEventListener('online-game-started',()=>overlay.classList.remove('show'));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
