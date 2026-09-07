(()=>{
'use strict';
function menu(){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id==='menu-screen'))}
function cancel(){
  menu();
  try{window.CheckersOnline?.cancel?.()}catch(e){console.warn('online cancel',e)}
}
function bind(){
  const b=document.getElementById('online-cancel-btn');
  if(!b||b.dataset.cancelBound)return;
  b.dataset.cancelBound='1';
  b.addEventListener('touchend',e=>{e.preventDefault();e.stopPropagation();cancel()},{passive:false});
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();cancel()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
window.addEventListener('online-search-ready',bind);
})();
