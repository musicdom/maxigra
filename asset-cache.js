/* MAXИГРА — persistent image cache using documented MAX DeviceStorage. */
(()=>{'use strict';
const ASSETS={play:'assets/кнопки/IMG_4614.jpeg',online:'assets/кнопки/IMG_4616.jpeg',profile:'assets/кнопки/IMG_4613.jpeg',leaderboard:'assets/кнопки/IMG_4609.jpeg',rules:'assets/кнопки/IMG_4612.jpeg',shop:'assets/кнопки/IMG_4605.jpeg',board_90s:'assets/boards/IMG_4486.jpeg',board_svo:'assets/boards/IMG_4487.jpeg',board_max:'assets/boards/IMG_4586.jpeg',board_orbita:'assets/boards/IMG_4587.jpeg',board_original:'assets/boards/IMG_4589.jpeg'};
const PREFIX='maxigra_asset_v1_';
const getStorage=()=>window.WebApp?.DeviceStorage;
const memory=new Map();
const IDB='maxigra-assets-v1';
let dbPromise=null;
function openDb(){if(dbPromise)return dbPromise;dbPromise=new Promise((resolve,reject)=>{try{const r=indexedDB.open(IDB,1);r.onupgradeneeded=()=>r.result.createObjectStore('assets');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)}catch(e){reject(e)}});return dbPromise}
async function idbGet(key){try{const db=await openDb();return await new Promise((resolve,reject)=>{const r=db.transaction('assets','readonly').objectStore('assets').get(key);r.onsuccess=()=>resolve(typeof r.result==='string'?r.result:'');r.onerror=()=>reject(r.error)})}catch{return ''}}
async function idbSet(key,value){try{const db=await openDb();await new Promise((resolve,reject)=>{const r=db.transaction('assets','readwrite').objectStore('assets').put(value,key);r.onsuccess=resolve;r.onerror=()=>reject(r.error)})}catch{}}
const call=(method,key,value)=>{const storage=getStorage();if(!storage?.[method])return Promise.resolve('');try{const p=value===undefined?storage[method](PREFIX+key):storage[method](PREFIX+key,value);return p&&typeof p.then==='function'?p.then(v=>String(v?.value??v??'')):Promise.resolve(String(p?.value??p??''));}catch{return Promise.resolve('')}};
async function fetchDataUrl(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('IMAGE_'+r.status);const blob=await r.blob();return await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(String(fr.result||''));fr.onerror=reject;fr.readAsDataURL(blob)})}
function applyCss(){const root=document.documentElement;const map={play:'--mx-img-play',online:'--mx-img-online',profile:'--mx-img-profile',leaderboard:'--mx-img-leaderboard',rules:'--mx-img-rules',shop:'--mx-img-shop',board_90s:'--mx-img-board_90s',board_svo:'--mx-img-board_svo',board_max:'--mx-img-board_max',board_orbita:'--mx-img-board_orbita',board_original:'--mx-img-board_original'};Object.entries(map).forEach(([k,v])=>{const x=memory.get(k);if(x)root.style.setProperty(v,'url("'+x.replace(/"/g,'\\\"')+'")')})}
async function loadOne(k){
 const v=await call('getItem',k);if(v){memory.set(k,v);return true}
 const local=await idbGet(k);if(local){memory.set(k,local);return true}
 return false
}
async function cacheOne(k){if(memory.has(k))return;try{const v=await fetchDataUrl(ASSETS[k]);if(v){memory.set(k,v);await call('setItem',k,v);await idbSet(k,v)}}catch{}}
async function init(){
 const keys=Object.keys(ASSETS);
 const critical=['play','online','profile','leaderboard','rules','shop'];
 await Promise.all(critical.map(k=>loadOne(k)));
 applyCss();
 window.dispatchEvent(new CustomEvent('max-assets-ready',{detail:{keys:[...memory.keys()]}}));
 await Promise.all(critical.map(k=>cacheOne(k)));
 applyCss();
 window.dispatchEvent(new CustomEvent('max-assets-cached',{detail:{keys:[...memory.keys()]}}));
 // Доски кэшируем отдельно, не задерживая показ главного меню.
 await Promise.all(keys.filter(k=>!critical.includes(k)).map(k=>cacheOne(k)));
 applyCss();
 window.dispatchEvent(new CustomEvent('max-assets-all-cached',{detail:{keys:[...memory.keys()]}}));
}
window.MaxAssetCache={assets:ASSETS,get:k=>memory.get(k)||'',ready:init()};
})();