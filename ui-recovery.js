(()=>{
'use strict';
function boot(){
  const $=id=>document.getElementById(id);
  const show=id=>{document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$(id)?.classList.add('active')};
  const hideAuth=()=>{const gate=$('max-auth-gate');if(gate){gate.style.display='none';gate.style.pointerEvents='none'}};
  hideAuth();
  setTimeout(hideAuth,700);
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');
    if(!b)return;
    if(b.id==='shop-btn'){show('shop-screen');return}
    if(b.id==='profile-btn'){show('profile-screen');return}
    if(b.id==='rules-btn'){show('rules-screen');return}
    if(b.id==='shop-back'||b.id==='profile-back'||b.id==='rules-back'){show('menu-screen');return}
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
