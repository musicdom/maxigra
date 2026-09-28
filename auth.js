(()=>{
'use strict';
const USER_KEY='russian-checkers-max-user-v1';
const GUEST={name:'Игрок',username:'',photo:'',guest:true};
const goMenu=()=>{
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('menu-screen')?.classList.add('active');
};
function normalizeUser(u){
  if(!u?.id)return null;
  const first=String(u.first_name||'').trim(),last=String(u.last_name||'').trim();
  const name=[first,last].filter(Boolean).join(' ')||String(u.username||'').trim()||'Игрок';
  return {id:String(u.id),name,username:String(u.username||''),photo:String(u.photo_url||''),guest:false,max:true};
}
async function init(){
  if(window.__maxAuthStarted)return;
  window.__maxAuthStarted=true;
  let launch={user:null,initData:''};
  try{
    launch=await (window.MAXIGRA_MAX?.getUser?.()||Promise.resolve({user:null,initData:''}));
  }catch(e){console.warn('[MAX] init:',e)}
  let user=normalizeUser(launch.user);
  let initData=launch.initData||'';
  if(!user){
    try{
      const cached=localStorage.getItem(USER_KEY);
      if(cached){const parsed=JSON.parse(cached);if(parsed?.id&&!parsed.guest)user={...GUEST,...parsed,max:true};}
    }catch(e){}
  }
  if(!user)user=GUEST;
  try{localStorage.setItem(USER_KEY,JSON.stringify(user));}catch(e){}
  if(initData&&!user.guest){
    try{
      fetch(window.maxigraApiUrl('/api/profile'),{
        method:'POST',
        headers:{'content-type':'application/json','x-max-init-data':initData},
        body:JSON.stringify({name:user.name,username:user.username,photo:user.photo}),
        keepalive:true
      }).catch(()=>{});
    }catch(e){}
  }
  window.CheckersAuth={user,registered:!user.guest,ready:true,guest:!!user.guest,max:!!user.max,initData:initData||window.MAXIGRA_MAX?.readInitData?.()||''};
  document.body.classList.remove('max-auth-blocked');
  window.dispatchEvent(new CustomEvent('max-profile-ready',{detail:user}));
  try{
    if(window.MaxAssetCache?.ready)await Promise.race([window.MaxAssetCache.ready,new Promise(resolve=>setTimeout(resolve,6000))]);
    window.MaxAssetCache?.apply?.();
  }catch(e){}
  goMenu();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();