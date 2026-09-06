/* Магазин Русских шашек. Владение предметами хранится на сервере. */
(()=>{
'use strict';
const KEY='russian-checkers-account-v2';
const catalog={
  board_90s:{title:'90-е',price:79,image:'assets/boards/IMG_4486.jpeg',tag:'ДОСКА',desc:'Ретро-стиль с атмосферой классических 90-х.'},
  board_svo:{title:'СВО',price:99,image:'assets/boards/IMG_4487.jpeg',tag:'ДОСКА',desc:'Тактическое оформление игровой доски.'},
  board_premium:{title:'Премиум',price:199,image:'assets/boards/IMG_4488.jpeg',tag:'ДОСКА',desc:'Премиальная эксклюзивная тема.'},
  board_light:{title:'Светлый',price:49,image:'assets/boards/IMG_4489.jpeg',tag:'ДОСКА',desc:'Чистая светлая классика.'},
  board_darkwood:{title:'Тёмное дерево',price:59,image:'assets/boards/IMG_4490.jpeg',tag:'ДОСКА',desc:'Глубокая деревянная фактура.'},
  board_lightwood:{title:'Светлое дерево',price:59,image:'assets/boards/IMG_4491.jpeg',tag:'ДОСКА',desc:'Тёплая натуральная древесина.'},
  master:{title:'Гроссмейстер',price:149,icon:'🏆',tag:'ИИ',desc:'Открывает максимальный уровень компьютера.'},
  hints:{title:'50 подсказок',price:39,icon:'💡',tag:'ПАКЕТ',desc:'50 подсказок для сложных позиций.'}
};
const boardIds=['board_90s','board_svo','board_premium','board_light','board_darkwood','board_lightwood'];
let local={};try{local=JSON.parse(localStorage.getItem(KEY)||'null')||{}}catch(e){}
const state=local;
state.owned=Array.isArray(state.owned)?state.owned:[];
state.selectedBoard=state.selectedBoard||'default';
state.selectedPieces=state.selectedPieces||'default';
state.ai=Math.max(1,Math.min(4,Number(state.ai)||1));state.hints=Math.max(0,Number(state.hints)||0);state.games=Number(state.games)||0;state.wins=Number(state.wins)||0;state.losses=Number(state.losses)||0;state.draws=Number(state.draws)||0;state.coins=Math.max(0,Number(state.coins)||0);
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}};
function readParam(container,name){
 try{return new URLSearchParams(String(container||'').replace(/^#/,'')).get(name)||''}catch(e){return ''}
}
function getInitData(){
 const direct=String(window.WebApp?.initData||'').trim();
 if(direct)return direct;
 const globals=[window.WebAppData,window.webAppData,window.MAX?.WebAppData,window.MAX?.initData];
 for(const value of globals){const data=String(value||'').trim();if(data)return data}
 try{
  const hashData=readParam(location.hash,'WebAppData');
  if(hashData)return hashData;
  const queryData=readParam(location.search,'WebAppData');
  if(queryData)return queryData;
 }catch(e){}
 return '';
}
async function waitForInitData(timeout=5000){
 const started=Date.now();
 while(Date.now()-started<timeout){
  const data=getInitData();
  if(data)return data;
  await new Promise(r=>setTimeout(r,100));
 }
 return '';
}
let readyPromise=null;
async function sync(){
 if(readyPromise)return readyPromise;
 readyPromise=(async()=>{
  const init=await waitForInitData();
  if(!init)throw new Error('MAX_INIT_DATA_REQUIRED');
  const r=await fetch(window.maxigraApiUrl('/api/shop'),{headers:{'x-max-init-data':init},cache:'no-store'});
  const d=await r.json().catch(()=>({ok:false,error:'BAD_RESPONSE'}));
  if(!r.ok||!d.ok)throw new Error(d.error||`HTTP_${r.status}`);
  Object.assign(state,d.state||{});save();window.dispatchEvent(new CustomEvent('shop-state-ready',{detail:state}));return state;
 })().finally(()=>{readyPromise=null});
 return readyPromise;
}
const owned=id=>id==='default'||state.owned.includes(id)||id==='premium'&&state.owned.includes('premium');
async function request(action,id){
 const init=await waitForInitData();
 if(!init)throw new Error('MAX_INIT_DATA_REQUIRED');
 const r=await fetch(window.maxigraApiUrl('/api/shop'),{method:'POST',headers:{'content-type':'application/json','x-max-init-data':init},body:JSON.stringify({action,id}),cache:'no-store'});
 const d=await r.json().catch(()=>({ok:false,error:'BAD_RESPONSE'}));
 if(!r.ok||!d.ok)throw new Error(d.error||`HTTP_${r.status}`);Object.assign(state,d.state||{});save();window.dispatchEvent(new CustomEvent('shop-state-ready',{detail:state}));return true;
}
async function buy(id){if(!catalog[id]||owned(id))return false;return request('purchase',id)}
async function selectBoard(id){if(!owned(id))return false;return request('select',id)}
async function selectPieces(id){if(!owned(id))return false;return request('select',id)}
function setAI(n){return owned('master')&&((state.ai=Math.max(1,Math.min(4,Number(n)||1))),save(),true)}
function getProfile(){return {...state,owned:[...state.owned]}}
window.CheckersShop={catalog,state,boardIds,save,owned,buy,selectBoard,selectPieces,setAI,getProfile,sync,getInitData};
sync().catch(()=>{});
})();
