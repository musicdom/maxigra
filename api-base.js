(()=>{
'use strict';
const host=location.hostname;
const isGithubPages=host.endsWith('.github.io');
// Existing aliases of the same Vercel project; no new service is required.
const apiHosts=[
  'https://maxigra-git-main-sasharemiws-projects.vercel.app',
  'https://maxigra-sasharemiws-projects.vercel.app',
  'https://maxigra.vercel.app'
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
  return `${window.MAXIGRA_CONFIG.apiBase}/${clean}`;
};
window.maxigraFetch=async function(path,options={}){
  const clean='/'+String(path||'').replace(/^\/+/, '');
  const bases=window.MAXIGRA_CONFIG.apiHosts||[''];
  const method=String(options.method||'GET').toUpperCase();
  // GET requests are safe to race: use the first reachable alias instead of
  // waiting up to five seconds for each blocked hostname in sequence.
  if(method==='GET'||method==='HEAD'){
    const controllers=[];
    const timers=[];
    try{
      const attempts=bases.map(base=>{
        const controller=typeof AbortController!=='undefined'?new AbortController():null;
        if(controller)controllers.push(controller);
        const timer=controller?setTimeout(()=>controller.abort(),4500):null;
        if(timer)timers.push(timer);
        return fetch(base+clean,{...options,...(controller?{signal:controller.signal}:{})})
          .then(response=>{preferredBase=base;return response;})
          .catch(error=>{throw error;});
      });
      const response=await Promise.any(attempts);
      controllers.forEach(c=>c.abort());
      return response;
    }finally{
      timers.forEach(clearTimeout);
    }
  }
  // Do not retry writes across aliases: a timeout can happen after the server
  // has already processed an action, and retrying could apply it twice.
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
