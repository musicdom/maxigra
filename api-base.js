(()=>{
'use strict';
const host=location.hostname;
const isGithubPages=host.endsWith('.github.io');
// Confirmed production aliases for this Vercel project. Try them in parallel for GETs.
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
    try{
      const attempts=bases.map(base=>{
        const controller=typeof AbortController!=='undefined'?new AbortController():null;
        if(controller)controllers.push(controller);
        const timer=controller?setTimeout(()=>controller.abort(),4500):null;
        if(timer)timers.push(timer);
        return fetch(base+clean,{...options,...(controller?{signal:controller.signal}:{})})
          .then(response=>({response,controller,base}));
      });
      const winner=await Promise.any(attempts);
      preferredBase=winner.base;
      controllers.forEach(c=>{if(c!==winner.controller)c.abort()});
      return winner.response;
    }finally{
      timers.forEach(clearTimeout);
    }
  }
  // Writes use the most recently confirmed reachable host; never race duplicate writes.
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