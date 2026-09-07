(()=>{
'use strict';
function menu(){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById('menu-screen')?.classList.add('active')}
function cancel(e){if(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}const api=window.CheckersOnline;if(api?.cancel){api.cancel();return false}menu();return false}
function bind(){const b=document.getElementById('online-cancel-btn');if(!b||b.dataset.cancelFix)return;b.dataset.cancelFix='1';b.type='button';b.onclick=cancel;b.addEventListener('pointerup',cancel,true);b.addEventListener('touchend',cancel,{capture:true,passive:false})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
window.addEventListener('checkers-online-ready',bind);
})();
