(()=>{
'use strict';
const USER_KEY='russian-checkers-max-user-v1';
const GUEST={name:'Игрок',username:'',photo:'',guest:true};
const goMenu=()=>{
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('menu-screen')?.classList.add('active');
};
function parseInitUser(raw){
  try{
    const params=new URLSearchParams(String(raw||''));
    const encoded=params.get('user');
    if(!encoded)return null;
    const u=JSON.parse(encoded);
    if(!u?.id)return null;
    const first=String(u.first_name||'').trim();
    const last=String(u.last_name||'').trim();
    const name=[first,last].filter(Boolean).join(' ')||String(u.username||'').trim()||'Игрок';
    return {id:String(u.id),name,username:String(u.username||''),photo:String(u.photo_url||''),guest:false,max:true};
  }catch(e){return null}
}
function readMaxUser(){
  const wa=window.WebApp;
  return parseInitUser(wa?.initData)||(()=>{
    const u=wa?.initDataUnsafe?.user;
    if(!u?.id)return null;
    const first=String(u.first_name||'').trim();
    const last=String(u.last_name||'').trim();
    const name=[first,last].filter(Boolean).join(' ')||'Игрок';
    return {id:String(u.id),name,username:String(u.username||''),photo:String(u.photo_url||''),guest:false,max:true};
  })();
}
async function init(){
  if(window.__maxAuthStarted)return;
  window.__maxAuthStarted=true;
  let user=null, initData='';
  for(let i=0;i<60&&(!user||!initData);i++){
    initData=String(window.WebApp?.initData||'').trim();
    user=readMaxUser();
    if(!user||!initData)await new Promise(resolve=>setTimeout(resolve,250));
  }
  if(!user){
    try{
      const cached=localStorage.getItem(USER_KEY);
      if(cached){const parsed=JSON.parse(cached);if(parsed?.id&&!parsed.guest)user={...GUEST,...parsed,max:true};}
    }catch(e){}
  }
  if(!user)user=GUEST;
  try{localStorage.setItem(USER_KEY,JSON.stringify(user));}catch(e){}

  // Регистрируем пользователя через уже существующий /api/profile,
  // чтобы не создавать отдельную Serverless Function на Vercel.
  try{
    const init=String(window.WebApp?.initData||'').trim();
    if(init)fetch(window.maxigraApiUrl('/api/profile'),{
      method:'POST',
      headers:{'content-type':'application/json','x-max-init-data':init},
      body:JSON.stringify({name:user.name,username:user.username,photo:user.photo}),
      keepalive:true
    }).catch(()=>{});
  }catch(e){}
  window.CheckersAuth={user,registered:!user.guest,ready:true,guest:!!user.guest,max:!!user.max,initData:init};
  document.body.classList.remove('max-auth-blocked');
  window.dispatchEvent(new CustomEvent('max-profile-ready',{detail:user}));
  // На iOS/Android MAX ждём завершения нативного кэша изображений,
  // чтобы главное меню не показывалось раньше своих фоновых изображений.
  try{if(window.MaxAssetCache?.ready)await Promise.race([window.MaxAssetCache.ready,new Promise(resolve=>setTimeout(resolve,6000))])}catch(e){}
  try{window.MaxAssetCache?.apply?.()}catch(e){}
  goMenu();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
