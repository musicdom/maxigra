/* ВРЕМЕННО: свободный вход без обязательной авторизации MAX. */
(()=>{
'use strict';
const USER_KEY='russian-checkers-max-user-v1';
const GUEST={name:'Игрок',username:'',photo:'',guest:true};
const goMenu=()=>{
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('menu-screen')?.classList.add('active');
};
function init(){
  if(window.__maxAuthStarted)return;
  window.__maxAuthStarted=true;
  let user=GUEST;
  try{
    const cached=localStorage.getItem(USER_KEY);
    if(cached) user={...GUEST,...JSON.parse(cached)};
  }catch(e){}
  window.CheckersAuth={user,registered:false,ready:true,guest:true};
  document.body.classList.remove('max-auth-blocked');
  window.dispatchEvent(new CustomEvent('max-profile-ready',{detail:user}));
  goMenu();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
