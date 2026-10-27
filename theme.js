(()=>{
'use strict';
const KEY='checkers-theme-preference-v1';
const valid=v=>v==='light'||v==='dark';
function read(){try{const v=localStorage.getItem(KEY);return valid(v)?v:'dark'}catch{return 'dark'}}
function apply(theme,save=false){if(!valid(theme))theme='dark';document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;document.querySelectorAll('[data-theme-choice]').forEach(btn=>{const active=btn.dataset.themeChoice===theme;btn.setAttribute('aria-pressed',active?'true':'false')});const status=document.getElementById('theme-setting-status');if(status)status.textContent=theme==='light'?'Светлая тема включена':'Тёмная тема включена';const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=theme==='light'?'#f2f7fc':'#080e16';if(save){try{localStorage.setItem(KEY,theme)}catch{if(status)status.textContent='Тема включена, но браузер не разрешил сохранить настройку'};try{window.dispatchEvent(new CustomEvent('checkers-theme-changed',{detail:{theme}}))}catch{}}}
function init(){apply(read());document.querySelectorAll('[data-theme-choice]').forEach(btn=>{if(btn.dataset.themeBound==='1')return;btn.dataset.themeBound='1';btn.addEventListener('click',()=>apply(btn.dataset.themeChoice,true))})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.CheckersTheme={get:read,set:theme=>apply(theme,true)};
})();
