/* Магазин Русских шашек. Витрина и локальное состояние аккаунта. */
(()=>{
 const KEY='russian-checkers-account-v2';
 const CONSENT_KEY='russian-checkers-legal-consent-v1';
 const USER_KEY='russian-checkers-max-user-v1';
 const catalog={premium:{title:'Premium',price:199,icon:'👑',tag:'ЛУЧШЕЕ',desc:'Все темы, наборы шашек и расширенные настройки.'},wood:{title:'Дерево',price:49,icon:'🪵',tag:'ДОСКА',desc:'Тёплая классическая деревянная доска.'},neon:{title:'Neon',price:79,icon:'✨',tag:'ДОСКА',desc:'Контрастная неоновая тема для ночной игры.'},marble:{title:'Мрамор',price:99,icon:'⬜',tag:'ДОСКА',desc:'Премиальная светлая мраморная доска.'},gold:{title:'Gold',price:69,icon:'🟡',tag:'ШАШКИ',desc:'Золотой набор шашек.'},master:{title:'Гроссмейстер',price:149,icon:'🏆',tag:'ИИ',desc:'Открывает максимальный уровень компьютера.'},hints:{title:'50 подсказок',price:39,icon:'💡',tag:'ПАКЕТ',desc:'50 подсказок для сложных позиций.'}};
 let state;try{state=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){state=null}
 state=state||{owned:[],selectedBoard:'default',selectedPieces:'default',ai:1,hints:3,coins:0,games:0,wins:0,losses:0,draws:0};
 state.owned=Array.isArray(state.owned)?state.owned:[];state.ai=Math.max(1,Math.min(4,Number(state.ai)||1));state.hints=Math.max(0,Number(state.hints)||0);state.games=Number(state.games)||0;state.wins=Number(state.wins)||0;state.losses=Number(state.losses)||0;state.draws=Number(state.draws)||0;
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}};
 const readCachedUser=()=>{try{const raw=localStorage.getItem(USER_KEY);return raw?JSON.parse(raw):null}catch(e){return null}};
 const cacheUser=user=>{try{localStorage.setItem(USER_KEY,JSON.stringify(user))}catch(e){}};
 const goMenu=()=>{document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById('menu-screen')?.classList.add('active')};
 const owned=id=>id==='default'||(id!=='hints'&&state.owned.includes(id))||state.owned.includes('premium');
 const buy=id=>{if(!catalog[id])return false;if(id==='hints'){state.hints+=50;if(!state.owned.includes('hints'))state.owned.push('hints');save();return true}if(state.owned.includes(id))return false;state.owned.push(id);if(id==='master')state.ai=4;save();return true};
 window.CheckersShop={catalog,state,save,owned,buy,selectBoard(id){if(owned(id)){state.selectedBoard=id;save();return true}return false},selectPieces(id){if(owned(id)){state.selectedPieces=id;save();return true}return false},setAI(n){n=Math.max(1,Math.min(4,Number(n)||1));if(n===1||owned('master')){state.ai=n;save();return true}return false},getProfile(){return {...state}}};
 save();
 function initMAXRegistration(){
   if(window.__maxRegistrationStarted)return;window.__maxRegistrationStarted=true;
   const css=document.createElement('style');css.textContent='#max-auth-gate{position:fixed;inset:0;z-index:99999;background:#0b0e14;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Inter,system-ui,sans-serif;text-align:center}.max-auth-card{width:min(440px,100%);padding:32px 24px;border-radius:28px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);box-shadow:0 20px 60px rgba(0,0,0,.35)}.max-auth-icon{font-size:58px;margin-bottom:16px}.max-auth-card h1{margin:0 0 10px;font-size:27px}.max-auth-card p{margin:0 auto 18px;color:rgba(255,255,255,.68);line-height:1.5}.max-auth-name{font-weight:700;margin-bottom:8px}.max-auth-loader{width:32px;height:32px;border:3px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;margin:18px auto;animation:maxspin .8s linear infinite}.max-auth-retry{display:none;width:100%;padding:13px 18px;border:0;border-radius:14px;background:#fff;color:#111;font-weight:700;font-size:16px}.max-auth-login{display:none;width:100%;padding:14px 18px;border:0;border-radius:14px;background:#fff;color:#111;font-weight:800;font-size:16px;cursor:pointer}.max-auth-consent{display:none;text-align:left;margin:18px 0}.max-auth-consent label{display:flex;gap:10px;align-items:flex-start;color:rgba(255,255,255,.8);font-size:13px;line-height:1.45}.max-auth-consent input{width:18px;height:18px;flex:0 0 18px;margin-top:1px}.max-auth-consent a{color:#fff;text-decoration:underline}.max-auth-legal{font-size:12px!important;color:rgba(255,255,255,.5)!important;margin:12px 0 18px!important}.max-auth-error{display:none;color:#ff9b9b!important;margin-top:12px!important}@keyframes maxspin{to{transform:rotate(360deg)}}';document.head.appendChild(css);
   const startGate=()=>{
     const cached=readCachedUser();
     const current=window.WebApp?.initData||'';
     if(cached&&current){
       window.CheckersAuth={user:cached,registered:true,ready:true,cached:true};
       document.body.classList.remove('max-auth-blocked');
       window.dispatchEvent(new CustomEvent('max-profile-ready',{detail:cached}));
       goMenu();
       fetch('/api/profile',{method:'POST',headers:{'content-type':'application/json','x-max-init-data':current},cache:'no-store'})
         .then(r=>r.json().catch(()=>null)).then(d=>{if(d?.ok&&d.user){cacheUser(d.user);window.CheckersAuth={user:d.user,registered:true,ready:true};window.dispatchEvent(new CustomEvent('max-profile-ready',{detail:d.user}))}})
         .catch(()=>{});
       return;
     }
     document.body.classList.add('max-auth-blocked');
     const gate=document.createElement('div');gate.id='max-auth-gate';gate.innerHTML='<div class="max-auth-card"><div class="max-auth-icon">♛</div><h1>Русские шашки</h1><div class="max-auth-name" id="max-auth-name"></div><p id="max-auth-status">Войдите через MAX, чтобы начать игру.</p><div class="max-auth-consent" id="max-auth-consent"><label><input type="checkbox" id="max-auth-check"><span>Я ознакомился(лась) и принимаю <a href="privacy.html" target="_blank" rel="noopener">Политику конфиденциальности</a> и <a href="terms.html" target="_blank" rel="noopener">Пользовательское соглашение</a>.</span></label></div><p class="max-auth-legal" id="max-auth-legal">Для первого входа необходимо подтвердить согласие с документами.</p><button class="max-auth-login" id="max-auth-login">Войти через MAX</button><div class="max-auth-loader" id="max-auth-loader" style="display:none"></div><button class="max-auth-retry" id="max-auth-retry">Повторить</button><p class="max-auth-error" id="max-auth-error"></p></div>';document.body.appendChild(gate);
     const status=document.getElementById('max-auth-status'),loader=document.getElementById('max-auth-loader'),retry=document.getElementById('max-auth-retry'),login=document.getElementById('max-auth-login'),check=document.getElementById('max-auth-check'),consent=document.getElementById('max-auth-consent'),legal=document.getElementById('max-auth-legal'),error=document.getElementById('max-auth-error'),name=document.getElementById('max-auth-name');
     const hasConsent=()=>{try{return localStorage.getItem(CONSENT_KEY)==='1'}catch(e){return false}};
     const setMode=()=>{consent.style.display=hasConsent()?'none':'block';legal.style.display=hasConsent()?'none':'block';login.style.display='block';login.disabled=!hasConsent()&&!check.checked;login.style.opacity=login.disabled?'.5':'1';status.textContent=hasConsent()?'Войдите через MAX, чтобы продолжить.':'Перед входом ознакомьтесь с документами и подтвердите согласие.'};
     const finish=user=>{cacheUser(user);window.CheckersAuth={user,registered:true,ready:true};name.textContent=user.name||user.username||'Игрок';status.textContent='Профиль MAX подтверждён. Добро пожаловать!';loader.style.display='none';login.style.display='none';consent.style.display='none';legal.style.display='none';document.body.classList.remove('max-auth-blocked');window.dispatchEvent(new CustomEvent('max-profile-ready',{detail:user}));goMenu();setTimeout(()=>gate.remove(),350)};
     const register=async()=>{error.style.display='none';retry.style.display='none';login.style.display='none';loader.style.display='block';status.textContent='Подтверждаем вход через MAX…';const current=window.WebApp?.initData||'';if(!current){loader.style.display='none';retry.style.display='block';status.textContent='Эта игра работает только внутри MAX. Откройте мини-приложение через MAX.';return}try{const r=await fetch('/api/profile',{method:'POST',headers:{'content-type':'application/json','x-max-init-data':current},cache:'no-store'});const d=await r.json().catch(()=>({ok:false,error:'BAD_RESPONSE'}));if(!r.ok||!d.ok)throw new Error(d.error||`HTTP_${r.status}`);try{localStorage.setItem(CONSENT_KEY,'1')}catch(e){}finish(d.user)}catch(e){loader.style.display='none';login.style.display='block';login.disabled=false;login.style.opacity='1';error.textContent=e.message==='MAX_BOT_TOKEN_NOT_CONFIGURED'?'На сервере не настроен MAX_BOT_TOKEN.':e.message==='INIT_DATA_EXPIRED'?'Сеанс MAX устарел. Полностью закройте мини-приложение и откройте его снова.':'Не удалось подтвердить вход через MAX. Попробуйте ещё раз.';error.style.display='block'}};
     check.onchange=()=>{login.disabled=!check.checked;login.style.opacity=check.checked?'1':'.5'};
     login.onclick=register;
     retry.onclick=()=>{retry.style.display='none';setMode()};
     if(!current){loader.style.display='none';login.style.display='none';consent.style.display='none';legal.style.display='none';retry.style.display='block';status.textContent='Эта игра работает только внутри MAX. Откройте мини-приложение через MAX.';}
     else setMode();
   };
   if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startGate,{once:true});else startGate();
 }
 initMAXRegistration();
 const recovery=document.createElement('script');recovery.src='ui-recovery.js?v=20260910';document.head.appendChild(recovery);
})();
