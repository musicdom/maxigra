(()=>{
'use strict';
function readInitData(){
  const raw=window.WebApp?.initData;
  return typeof raw==='string'?raw.trim():'';
}
async function initData(){
  let raw=readInitData();
  if(raw)return raw;
  // MAX Bridge can finish exposing WebApp immediately after page scripts load.
  // Give it a short window instead of failing the first online-game click.
  for(let i=0;i<15&&!raw;i++){
    await new Promise(resolve=>setTimeout(resolve,200));
    raw=readInitData();
  }
  return raw;
}
async function api(path,method='GET',payload){
 const raw=await initData();
 if(!raw)throw new Error('MAX_INIT_DATA_REQUIRED');
 const options={method,headers:{'x-max-init-data':raw,'content-type':'application/json','cache-control':'no-cache'}};
 if(payload)options.body=JSON.stringify(payload);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{
  options.signal=controller.signal;
  const r=await fetch(window.maxigraApiUrl(path),options);
  const d=await r.json().catch(()=>({ok:false,error:'BAD_RESPONSE'}));
  if(!r.ok||d.ok===false)throw new Error(d.error||`HTTP_${r.status}`);
  return d;
 }finally{clearTimeout(timer)}
}
window.CheckersOnlineApi={initData,api};
})();
