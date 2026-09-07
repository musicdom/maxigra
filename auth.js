(()=>{
'use strict';
const USER_KEY='russian-checkers-max-user-v1';
const GUEST={name:'Игрок',username:'',photo:'',guest:true};
const goMenu=()=>{
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('menu-screen')?.classList.add('active');
};
function readMaxUser(){
  const wa=window.WebApp;
  const u=wa?.initDataUnsafe?.user;
  if(!u?.id)return null;
  const first=String(u.first_name||'').trim();
  const last=String(u.last_name||'').trim();
  const name=[first,last].filter(Boolean).join(' ')||'Игрок';
  return {
    id:String(u.id),
    name,
    username:String(u.username||''),
    photo:String(u.photo_url||''),
    guest:false,
    max:true
  };
}
async function init(){
  if(window.__maxAuthStarted)return;
  window.__maxAuthStarted=true;

  let user=null;
  for(let i=0;i<20&&!user;i++){
    user=readMaxUser();
    if(!user)await new Promise(resolve=>setTimeout(resolve,150));
  }

  if(!user){
    try{
      const cached=localStorage.getItem(USER_KEY);
      if(cached){
        const parsed=JSON.parse(cached);
        if(parsed?.id&&!parsed.guest)user={...GUEST,...parsed,max:true};
      }
    }catch(e){}
  }

  if(!user)user=GUEST;
  try{localStorage.setItem(USER_KEY,JSON.stringify(user));}catch(e){}

  window.CheckersAuth={
    user,
    registered:!user.guest,
    ready:true,
    guest:!!user.guest,
    max:!!user.max
  };
  document.body.classList.remove('max-auth-blocked');
  window.dispatchEvent(new CustomEvent('max-profile-ready',{detail:user}));
  goMenu();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
