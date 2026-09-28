// MAX Bridge helper — initialization pattern aligned with the working ORBITA mini app.
(()=>{'use strict';
function readUser(){
  try{
    const u=window.WebApp?.initDataUnsafe?.user;
    if(u?.id)return u;
    if(window.MAX?.user?.id)return window.MAX.user;
    if(window.Telegram?.WebApp?.initDataUnsafe?.user?.id)return window.Telegram.WebApp.initDataUnsafe.user;
  }catch(e){console.warn('[MAX] Bridge user read:',e)}
  return null;
}
function readInitData(){
  try{
    const value=window.WebApp?.initData;
    if(typeof value==='string'&&value.trim())return value.trim();
  }catch(e){}
  try{
    const params=new URLSearchParams(String(location.hash||'').replace(/^#/,''));
    const raw=params.get('WebAppData');
    if(raw)return String(raw).trim();
  }catch(e){}
  return '';
}
function getUser(){
  return new Promise(resolve=>{
    let attempts=0;
    const timer=setInterval(()=>{
      const user=readUser(), initData=readInitData();
      if(user?.id||initData){
        clearInterval(timer);
        resolve({user:user||null,initData});
        return;
      }
      attempts++;
      if(attempts>=15){
        clearInterval(timer);
        resolve({user:null,initData:''});
      }
    },300);
  });
}
window.MAXIGRA_MAX={readUser,readInitData,getUser};
})();