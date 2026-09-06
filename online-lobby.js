(()=>{
'use strict';
const ID='online-players-panel';
let timer=null;
function ensure(){
 if(document.getElementById(ID))return document.getElementById(ID);
 const el=document.createElement('div');el.id=ID;el.innerHTML='<div class="online-players-title">Сейчас онлайн</div><div class="online-players-list"></div>';
 document.body.appendChild(el);return el;
}
function hide(){const el=document.getElementById(ID);if(el)el.style.display='none';}
async function refresh(){
 const el=ensure();
 if(!window.CheckersOnline?.active){hide();return;}
 // Keep the search/game UI above the informational players panel.
 el.style.display='block';
 try{
  const init=window.WebApp?.initData||'';if(!init)return;
  const r=await fetch('/api/matchmaking/players',{headers:{'x-max-init-data':init},cache:'no-store'});
  const d=await r.json();if(!r.ok||!d.ok)throw new Error('PLAYERS');
  const list=el.querySelector('.online-players-list');
  if(!list)return;
  list.innerHTML=(d.players||[]).map(p=>`<div class="online-player"><span class="online-dot"></span><span>${String(p.name||'Игрок').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}${p.me?' <small>(вы)</small>':''}</span><span class="online-player-state">${p.state==='playing'?'играет':p.state==='searching'?'ищет':'онлайн'}</span></div>`).join('')||'<div class="online-empty">Пока никого нет</div>';
 }catch{ }
}
function boot(){
 if(timer)return;
 refresh();
 timer=setInterval(refresh,2500);
 const observer=new MutationObserver(refresh);
 observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
