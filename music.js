(()=>{
'use strict';
const KEY='maxigra-background-music-v1';
const common='Song/Общая%20.mp3';
const games=['Song/Игра.mp3','Song/Игра2.mp3','Song/Игра3.mp3','Song/Игра4.mp3'];
let enabled=true, currentMode='common', audio=null, fadeTimer=null, pendingGesture=false;
try{enabled=localStorage.getItem(KEY)!=='off'}catch{}
function getAudio(){if(!audio){audio=new Audio();audio.loop=true;audio.preload='auto';audio.volume=0;audio.setAttribute('playsinline','')}return audio}
function updateButton(){
 const b=document.getElementById('music-toggle');if(!b)return;
 b.classList.toggle('is-off',!enabled);
 b.setAttribute('aria-pressed',enabled?'true':'false');
 b.setAttribute('aria-label',enabled?'Музыка включена. Выключить':'Музыка выключена. Включить');
 b.innerHTML='<span class="music-toggle-icon" aria-hidden="true">'+(enabled?'♫':'♪̸')+'</span><span class="music-toggle-state">'+(enabled?'Музыка включена':'Музыка выключена')+'</span>';
}
function fadeIn(el,target=.22){
 clearInterval(fadeTimer);el.volume=0;
 const start=Date.now(),duration=2600;
 fadeTimer=setInterval(()=>{
  if(!enabled||el!==audio){clearInterval(fadeTimer);return}
  const t=Math.min(1,(Date.now()-start)/duration);
  const eased=t*t*(3-2*t);
  el.volume=Math.min(1,target*eased);
  if(t>=1)clearInterval(fadeTimer)
 },70)
}
async function play(mode,force=false){
 currentMode=mode;
 if(!enabled)return;
 const el=getAudio(),src=mode==='game'?games[Math.floor(Math.random()*games.length)]:common;
 const url=new URL(src,document.baseURI).href;
 if(!force&&el.src===url&&!el.paused)return;
 clearInterval(fadeTimer);
 el.pause();el.src=url;el.currentTime=0;el.volume=0;
 try{await el.play();fadeIn(el,mode==='game'?.20:.18);pendingGesture=false}
 catch(e){pendingGesture=true}
}
function syncScreen(){
 const game=document.getElementById('game-screen');
 const menu=document.getElementById('menu-screen');
 const auth=document.getElementById('auth-screen');
 const gameActive=!!game?.classList.contains('active');
 const menuActive=!!menu?.classList.contains('active');
 const authActive=!!auth?.classList.contains('active');
 if(gameActive){if(currentMode!=='game')play('game');}
 else if(menuActive||authActive){if(currentMode!=='common')play('common');else if(enabled&&(getAudio().paused||!getAudio().src))play('common');}
}
function toggle(){
 enabled=!enabled;
 try{localStorage.setItem(KEY,enabled?'on':'off')}catch{}
 updateButton();
 if(!enabled){clearInterval(fadeTimer);if(audio){audio.pause();audio.volume=0}}
 else{play(currentMode,true)}
}
function unlock(){if(!enabled||!pendingGesture)return;play(currentMode,true)}
document.addEventListener('DOMContentLoaded',()=>{
 const b=document.getElementById('music-toggle');
 b?.addEventListener('click',toggle);
 updateButton();
 document.addEventListener('pointerdown',unlock,{passive:true});
 document.addEventListener('keydown',unlock);
 const app=document.getElementById('app');
 if(app)new MutationObserver(syncScreen).observe(app,{subtree:true,attributes:true,attributeFilter:['class']});
 syncScreen();
 // Attempt autoplay immediately; mobile/MAX may require the first user gesture.
 if(enabled)play('common');
});
window.addEventListener('pageshow',()=>{if(enabled&&audio?.paused)play(currentMode,true)});
})();
