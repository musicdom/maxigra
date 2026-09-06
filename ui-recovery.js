(()=>{
'use strict';
function boot(){
  const $=id=>document.getElementById(id);
  const show=id=>{document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$(id)?.classList.add('active')};
  const hideAuth=()=>{const gate=$('max-auth-gate');if(gate){gate.style.display='none';gate.style.pointerEvents='none'}};
  hideAuth();
  setTimeout(hideAuth,700);
  const click=id=>{const el=$(id);if(el)el.click()};
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');
    if(!b)return;
    const id=b.id;
    if(id==='shop-btn'){e.stopImmediatePropagation();show('shop-screen');return}
    if(id==='profile-btn'){e.stopImmediatePropagation();show('profile-screen');return}
    if(id==='rules-btn'){e.stopImmediatePropagation();show('rules-screen');return}
    if(id==='shop-back'||id==='profile-back'||id==='rules-back'){e.stopImmediatePropagation();show('menu-screen');return}
    if(id==='online-play-btn'){e.stopImmediatePropagation();click('online-play-btn');return}
    if(id==='online-cancel-btn'){e.stopImmediatePropagation();click('online-cancel-btn');return}
  },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
