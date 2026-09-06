(()=>{
'use strict';
let pending=false;
function showLoading(){
 const screen=document.getElementById('online-search-screen');
 const text=document.getElementById('online-search-text');
 document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
 screen?.classList.add('active');
 if(text)text.textContent='Подключаем онлайн-модуль…';
}
function run(){
 if(!pending)return;
 const api=window.CheckersOnline;
 if(!api?.start)return;
 pending=false;
 const b=document.getElementById('online-play-btn');
 if(b){b.disabled=false;b.textContent=b.dataset.onlineOriginalText||'🎲 Играть с игроком';}
 api.start();
}
function boot(){
 const b=document.getElementById('online-play-btn');
 if(!b||b.dataset.onlineFix)return;
 b.dataset.onlineFix='1';
 b.dataset.onlineOriginalText=b.textContent;
 b.addEventListener('click',e=>{
  e.preventDefault();
  e.stopImmediatePropagation();
  if(window.CheckersOnline?.start){window.CheckersOnline.start();return;}
  if(pending)return;
  pending=true;
  b.disabled=true;
  b.textContent='⏳ Подключаем онлайн…';
  showLoading();
 },true);
 window.addEventListener('checkers-online-ready',run,{once:false});
 run();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
