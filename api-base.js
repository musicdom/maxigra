(()=>{
'use strict';
const host=location.hostname;
const isGithubPages=host.endsWith('.github.io');
// Vercel production aliases for this project.
const apiHosts=[
  'https://maxigra.vercel.app',
  'https://maxigra-git-main-sasharemiws-projects.vercel.app',
  'https://maxigra-sasharemiws-projects.vercel.app'
];
const primary=isGithubPages?apiHosts[0]:'';
let preferredBase=primary;
window.MAXIGRA_CONFIG={
  apiBase:primary,
  apiHosts:isGithubPages?apiHosts:[''],
  isStatic:isGithubPages,
  isMax:!!(window.WebApp?.initData)
};
window.maxigraApiUrl=function(path){
  const clean=String(path||'').replace(/^\/+/, '');
  const base=preferredBase||window.MAXIGRA_CONFIG.apiBase;
  return `${base}/${clean}`;
};
window.maxigraFetch=async function(path,options={}){
  const clean='/'+String(path||'').replace(/^\/+/, '');
  const bases=window.MAXIGRA_CONFIG.apiHosts||[''];
  const method=String(options.method||'GET').toUpperCase();
  if(method==='GET'||method==='HEAD'){
    const controllers=[];
    const timers=[];
    const attempts=bases.map(base=>{
      const controller=typeof AbortController!=='undefined'?new AbortController():null;
      if(controller)controllers.push(controller);
      const timer=controller?setTimeout(()=>controller.abort(),4500):null;
      if(timer)timers.push(timer);
      return fetch(base+clean,{...options,...(controller?{signal:controller.signal}:{})})
        .then(response=>{
          if(response.ok)return {response,controller,base};
          // Promise.any must treat HTTP errors as failed attempts, not as a winner.
          throw {response,controller,base};
        });
    });
    try{
      const winner=await Promise.any(attempts);
      preferredBase=winner.base;
      controllers.forEach(c=>{if(c!==winner.controller)c.abort()});
      return winner.response;
    }catch(error){
      // All aliases failed: prefer a meaningful client response (e.g. MAX auth error)
      // over a server error, so the UI can show the actual API response.
      const failures=error?.errors||[];
      const withResponses=failures.filter(item=>item&&item.response);
      const selected=
        withResponses.find(item=>item.response.status>=400&&item.response.status<500)||
        withResponses.find(item=>item.response.status>=500)||
        withResponses[0];
      if(selected){
        preferredBase=selected.base;
        return selected.response;
      }
      throw new Error('Не удалось подключиться к API Vercel. Проверьте соединение и доступность сервера.');
    }finally{
      timers.forEach(clearTimeout);
    }
  }
  // Never race writes: a result/payment/admin action must not be submitted twice.
  const base=preferredBase||bases[0]||'';
  const controller=typeof AbortController!=='undefined'?new AbortController():null;
  const timer=controller?setTimeout(()=>controller.abort(),8000):null;
  try{
    return await fetch(base+clean,{...options,...(controller?{signal:controller.signal}:{})});
  }finally{
    if(timer)clearTimeout(timer);
  }
};
})();