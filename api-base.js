(()=>{
'use strict';
const host=location.hostname;
const isGithubPages=host.endsWith('.github.io');
const vercelBase='https://maxigra.vercel.app';
window.MAXIGRA_CONFIG={
  apiBase:isGithubPages?vercelBase:'',
  isStatic:isGithubPages,
  isMax:!!(window.WebApp?.initData)
};
window.maxigraApiUrl=function(path){
  const clean=String(path||'').replace(/^\/+/,'');
  return `${window.MAXIGRA_CONFIG.apiBase}/${clean}`;
};
})();
