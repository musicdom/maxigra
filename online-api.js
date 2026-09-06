(()=>{
'use strict';
const initData=()=>window.WebApp?.initData||'';
async function api(path,method='GET',payload){
 const raw=initData();
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
