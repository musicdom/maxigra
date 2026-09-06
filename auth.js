(()=>{
'use strict';
let user=null,started=false;
const $=id=>document.getElementById(id);
const initData=()=>window.WebApp?.initData||'';
const show=id=>document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));
async function register(){
  if(!initData()){
    show('auth-screen');
    $('auth-status').textContent='Откройте игру внутри MAX — регистрация выполняется через ваш профиль MAX.';
    $('auth-loader').style.display='none';
    $('auth-retry').style.display='block';
    return;
  }
  $('auth-loader').style.display='block';
  $('auth-retry').style.display='none';
  $('auth-status').textContent='Проверяем профиль MAX…';
  try{
    const response=await fetch('/api/auth/me',{method:'POST',headers:{'content-type':'application/json','x-max-init-data':initData()}});
    const data=await response.json().catch(()=>({ok:false,error:'BAD_RESPONSE'}));
    if(!response.ok||!data.ok)throw new Error(data.error||`HTTP_${response.status}`);
    user=data.user;
    window.CheckersAuth={user,registered:true};
    $('auth-loader').style.display='none';
    $('auth-status').textContent=data.isNew?'Профиль создан. Добро пожаловать!':'Профиль MAX подтверждён.';
    const name=$('auth-name');
    if(name)name.textContent=user.name;
    setTimeout(()=>show('menu-screen'),450);
  }catch(error){
    $('auth-loader').style.display='none';
    $('auth-retry').style.display='block';
    $('auth-status').textContent=error.message==='MAX_BOT_TOKEN_NOT_CONFIGURED'?'На сервере не настроен MAX_BOT_TOKEN.':'Не удалось подтвердить профиль MAX. Попробуйте ещё раз.';
  }
}
function setup(){
  if(started)return;started=true;
  window.WebApp?.ready?.();
  window.WebApp?.expand?.();
  const retry=$('auth-retry');if(retry)retry.onclick=register;
  register();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
