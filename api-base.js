(()=>{
'use strict';
const host=location.hostname;
const isGithubPages=host.endsWith('.github.io');
// These are existing aliases of the same Vercel project; no new service is required.
const apiHosts=[
  'https://maxigra-git-main-sasharemiws-projects.vercel.app',
  'https://maxigra-sasharemiws-projects.vercel.app',
  'https://maxigra.vercel.app'
];
const primary=isGithubPages?apiHosts[0]:'';
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
// Use host failover only for the API screens that opt into this helper.
// A network block/timeout tries the next existing alias; HTTP responses are returned as-is.
window.maxigraFetch=async function(path,options={}){
  const clean='/'+String(path||'').replace(/^\/+/, '');
  const bases=window.MAXIGRA_CONFIG.apiHosts||[''];
  let lastError;
  for(const base of bases){
    const controller=typeof AbortController!=='undefined'?new AbortController():null;
    const timer=controller?setTimeout(()=>controller.abort(),5000):null;
    try{
      const response=await fetch(base+clean,{...options,...(controller?{signal:controller.signal}:{})});
      if(timer)clearTimeout(timer);
      return response;
    }catch(error){
      if(timer)clearTimeout(timer);
      lastError=error;
    }
  }
  throw lastError||new Error('API_UNAVAILABLE');
};
})();
