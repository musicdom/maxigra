(()=>{
'use strict';
function boot(){
 const b=document.getElementById('online-play-btn');
 if(!b||b.dataset.onlineFix)return;
 b.dataset.onlineFix='1';
 b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();if(window.CheckersOnline?.start)window.CheckersOnline.start();else{const s=document.getElementById('online-search-screen');const t=document.getElementById('online-search-text');document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));s?.classList.add('active');if(t)t.textContent='Онлайн-модуль ещё загружается. Попробуйте через секунду.'}},true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
