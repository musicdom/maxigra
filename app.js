(()=>{
'use strict';
const q=id=>document.getElementById(id);
const show=id=>document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));
const ACCOUNT_KEY='russian-checkers-account-v2';
function esc(v){return String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}
function gameBack(){if(window.CheckersOnline?.active){window.CheckersOnline.cancel();return}show('menu-screen')}
function renderOwnedBoards(){
 const box=q('profile-boards'),shop=window.CheckersShop;if(!box||!shop)return;
 const state=shop.state||{},catalog=shop.catalog||{};
 const ids=(shop.boardIds||[]).filter(id=>shop.owned(id)&&catalog[id]);
 if(!ids.length){box.innerHTML='<div class="profile-empty">Покупок пока нет</div>';return}
 box.innerHTML=`<div class="profile-section-title">Мои доски</div><div class="owned-boards">${ids.map(id=>{const x=catalog[id],selected=state.selectedBoard===id;return `<button type="button" class="owned-board ${selected?'is-selected':''}" data-board-id="${esc(id)}"><img src="${esc(x.image)}" alt=""><span>${esc(x.title)}</span><small>${selected?'Выбрана':'Выбрать'}</small></button>`}).join('')}</div>`;
 box.querySelectorAll('[data-board-id]').forEach(btn=>btn.addEventListener('click',async()=>{const id=btn.dataset.boardId;try{await shop.selectBoard(id);renderOwnedBoards();window.dispatchEvent(new CustomEvent('shop-state-ready',{detail:shop.state}))}catch{}}));
}
function syncProfile(){
 const user=window.CheckersAuth?.user;if(!user)return;
 const avatar=q('max-profile-avatar'),fallback=q('max-profile-avatar-fallback'),name=q('max-profile-name'),username=q('max-profile-username'),status=q('max-profile-status');
 if(name)name.textContent=user.name||user.username||'Игрок';if(username)username.textContent=user.username?('@'+user.username):'Профиль MAX';
 if(status){status.textContent=window.CheckersAuth?.registered?'✓ Профиль MAX подтверждён':'Гостевой профиль';status.classList.toggle('is-guest',!window.CheckersAuth?.registered)}
 if(avatar&&user.photo){avatar.src=user.photo;avatar.style.display='block';if(fallback)fallback.style.display='none'}else if(avatar){avatar.removeAttribute('src');avatar.style.display='none';if(fallback)fallback.style.display='grid'}
 let stats={};try{stats=JSON.parse(localStorage.getItem(ACCOUNT_KEY)||'null')||{}}catch(e){}
 let currentStats=stats,profileTickets='…';
 const renderStats=s=>{const games=Math.max(0,Number(s.games)||0),wins=Math.max(0,Number(s.wins)||0),losses=Math.max(0,Number(s.losses)||0),draws=Math.max(0,Number(s.draws)||0),winRate=games?Math.round((wins/games)*100):0;
 const box=q('profile-stats');if(box)box.innerHTML=`<div class="profile-stat profile-stat--games"><span class="profile-stat-icon">🎮</span><b>${games}</b><span>Игр</span></div><div class="profile-stat profile-stat--wins"><span class="profile-stat-icon">🏆</span><b>${wins}</b><span>Побед</span></div><div class="profile-stat profile-stat--losses"><span class="profile-stat-icon">⚔️</span><b>${losses}</b><span>Поражений</span></div><div class="profile-stat profile-stat--draws"><span class="profile-stat-icon">🤝</span><b>${draws}</b><span>Ничьих</span></div>`;
 const extra=q('profile-extra');if(extra)extra.innerHTML=`<div class="profile-extra-row"><span>Процент побед</span><strong>${winRate}%</strong></div><div class="profile-progress"><span style="width:${Math.min(100,winRate)}%"></span></div><div class="profile-extra-row"><span>Статус</span><strong>${window.CheckersAuth?.registered?'Игрок MAX':'Гость'}</strong></div><div class="profile-extra-row profile-ticket-row"><span>🎟 Билеты на призовой турнир</span><strong>${profileTickets}</strong></div>`;};
 renderStats(currentStats);
 try{const init=window.WebApp?.initData||window.CheckersShop?.getInitData?.()||'';if(init){const fetcher=window.maxigraFetch||fetch;const url=window.maxigraFetch?'/api/profile':window.maxigraApiUrl('/api/profile');fetcher(url,{headers:{'x-max-init-data':init,'cache-control':'no-cache'},cache:'no-store'}).then(r=>r.json()).then(d=>{if(d?.ok&&d.stats){currentStats=d.stats;if(d.tickets!==undefined)profileTickets=String(Math.max(0,Number(d.tickets)||0));else profileTickets='—';renderStats(currentStats);try{localStorage.setItem(ACCOUNT_KEY,JSON.stringify(d.stats))}catch{}}else{profileTickets='—';renderStats(currentStats)}}).catch(()=>{profileTickets='—';renderStats(currentStats)})}}catch{}
 renderOwnedBoards();
 try{window.CheckersShop?.sync?.().then(renderOwnedBoards).catch(()=>{})}catch{}
}

function starterOfferPurchased(){
 const s=window.CheckersShop?.state||{};
 return Array.isArray(s.owned)&&s.owned.includes('starter_pack');
}
function initStarterOffer(){
 const offer=q('starter-offer');if(!offer)return;
 const firstKey='maxigra-starter-offer-first-open-v1',sessionKey='maxigra-starter-offer-session-v1';
 const now=Date.now();
 let first=0;try{first=Number(localStorage.getItem(firstKey)||0)}catch{}
 if(!first){first=now;try{localStorage.setItem(firstKey,String(first))}catch{}}
 if(now-first>=24*60*60*1000||starterOfferPurchased())return;
 let shownThisSession=false;try{shownThisSession=sessionStorage.getItem(sessionKey)==='1'}catch{}
 if(shownThisSession)return;
 let closed=false;
 const close=()=>{if(closed)return;closed=true;offer.classList.remove('is-visible');offer.classList.add('is-closing');offer.setAttribute('aria-hidden','true');setTimeout(()=>offer.classList.remove('is-closing'),360)};
 const showOffer=()=>{if(closed||starterOfferPurchased())return;if(document.getElementById('startup-screen')){setTimeout(showOffer,120);return}try{sessionStorage.setItem(sessionKey,'1')}catch{};offer.classList.add('is-visible');offer.setAttribute('aria-hidden','false')};
 q('starter-offer-close')?.addEventListener('click',close);offer.querySelector('[data-starter-close]')?.addEventListener('click',close);
 q('starter-offer-buy')?.addEventListener('click',async()=>{const b=q('starter-offer-buy');if(!b)return;b.disabled=true;try{const confirmed=await window.CheckersConfirmPurchase?.({title:'Набор новичка',price:599,desc:'25 подсказок и две игровые доски: «90-е» и «СВО».',icon:'🎁'});if(!confirmed){b.disabled=false;return}b.textContent='Подготавливаем оплату…';const order=await window.CheckersShop?.buy?.('starter_pack');const url=order?.paymentUrl||order?.paymentOptions?.wallet;if(url){if(window.WebApp?.openLink)window.WebApp.openLink(url);else window.location.href=url;close()}else{b.disabled=false;b.textContent='Получить набор · 599 ₽'}}catch{b.disabled=false;b.textContent='Получить набор · 599 ₽'}});
 showOffer();
}
async function tournamentRequest(){let init='';const started=Date.now();while(Date.now()-started<6000){init=window.CheckersShop?.getInitData?.()||window.WebApp?.initData||'';if(init)break;await new Promise(resolve=>setTimeout(resolve,150))}if(!init)throw new Error('MAX_INIT_DATA_REQUIRED');const path=`/api/shop?tournament=1&_=${Date.now()}`;const useMaxigraFetch=typeof window.maxigraFetch==='function';const url=useMaxigraFetch?path:(window.maxigraApiUrl?window.maxigraApiUrl(path):path);const fetcher=useMaxigraFetch?window.maxigraFetch:fetch;let r;try{r=await fetcher(url,{cache:'no-store',headers:{'x-max-init-data':init}})}catch(error){console.error('Tournament ticket request failed:',error);throw new Error('API_CONNECTION_FAILED')}const d=await r.json().catch(()=>({ok:false,error:'BAD_RESPONSE'}));if(!r.ok||!d.ok)throw new Error(d.error||`HTTP_${r.status}`);return d}
async function openPrizeTournament(){const status=q('tournament-open-status');if(status){status.className='tournament-status';status.textContent=''}show('tournament-open-screen');try{const data=await tournamentRequest();q('tournament-my-tickets').textContent=String(data.tickets||0);q('tournament-participant-count').textContent=String(data.participants||0);const table=q('tournament-table-status');if(table)table.textContent='Таблица и результаты появятся после объявления формата турнира.'}catch(error){if(status){status.className='tournament-status is-error';status.textContent=String(error?.message)==='MAX_INIT_DATA_REQUIRED'?'Откройте игру внутри MAX и попробуйте снова.':'Не удалось обновить данные турнира. Попробуйте позже.'}}}
async function refreshTournamentButton(){const button=q('tournament-buy'),status=q('tournament-status');if(!button)return;button.textContent='Проверяем билет…';button.disabled=true;try{const data=await tournamentRequest();delete button.dataset.statusError;button.dataset.hasTicket=Number(data.tickets||0)>0?'1':'0';button.textContent=Number(data.tickets||0)>0?'Открыть турнир':'Купить билет · 199 ₽';if(status){status.className='tournament-status';status.textContent=''}}catch(error){console.error('Tournament ticket status check failed:',error);button.dataset.statusError='1';button.textContent='Повторить проверку билета';if(status){const code=String(error?.message||'');const messages={MAX_INIT_DATA_REQUIRED:'MAX не передал данные авторизации. Закройте мини-приложение и откройте его из чата бота.',INVALID_INIT_DATA:'MAX отклонил данные авторизации. Полностью перезапустите мини-приложение.',INIT_DATA_EXPIRED:'Сессия MAX устарела. Закройте и заново откройте игру из бота.',REDIS_NOT_CONFIGURED:'Сервер базы данных не настроен.',API_CONNECTION_FAILED:'Не удалось подключиться к серверу турнира. Проверьте соединение и попробуйте ещё раз.',BAD_RESPONSE:'Сервер турнира вернул некорректный ответ.'};status.className='tournament-status is-error';status.textContent=messages[code]||`Проверка билета не прошла (${code||'неизвестная ошибка'}). Нажмите «Повторить проверку билета».`}}finally{button.disabled=false}}
async function buyTournamentTicket(){
 const button=q('tournament-buy'),status=q('tournament-status');if(!button||button.disabled)return;
 if(button.dataset.statusError==='1'){await refreshTournamentButton();return}
 if(button.dataset.hasTicket==='1'){await openPrizeTournament();return}
 button.disabled=true;if(status){status.className='tournament-status';status.textContent='';}
 try{
  const confirmed=await window.CheckersConfirmPurchase?.({title:'Билет на турнир «Битва за призы»',price:199,desc:'Билет участника призового турнира по русским шашкам.',icon:'🏆'});
  if(!confirmed){button.disabled=false;return}
  button.textContent='Подготавливаем оплату…';
  const order=await window.CheckersShop?.createOrder?.('tournament_ticket');
  const url=order?.paymentUrl||order?.paymentOptions?.wallet;
  if(!url)throw new Error('PAYMENT_NOT_CONFIGURED');
  if(window.WebApp?.openLink)window.WebApp.openLink(url);else window.location.href=url;
  if(status){status.className='tournament-status is-info';status.textContent='Заказ создан. После успешной оплаты билет будет закреплён за вашим аккаунтом MAX.'}
  button.textContent='Проверяем оплату…';
 }catch(error){
  const message=String(error?.message||'');
  if(status){status.className='tournament-status is-error';status.textContent=message==='MAX_INIT_DATA_REQUIRED'?'Откройте игру внутри MAX и попробуйте ещё раз.':message==='PAYMENT_NOT_CONFIGURED'?'Оплата временно недоступна. Попробуйте позже.':message==='TOURNAMENT_TICKET_ALREADY_OWNED'?'У вас уже есть билет. Обновите экран турнира.':'Не удалось создать заказ. Попробуйте ещё раз.'}
  button.textContent='Повторить · 199 ₽';
 }finally{button.disabled=false}
}
function startOnlineFromButton(){const openRooms=()=>window.CheckersRooms?.open?.();if(window.CheckersRooms?.open){openRooms();return}show('online-search-screen');const el=q('online-search-text');if(el)el.textContent='Загрузка комнат…';const handler=()=>{window.removeEventListener('checkers-online-ready',handler);openRooms()};window.addEventListener('checkers-online-ready',handler,{once:true})}
function ensureAdminButton(){
 const panel=q('profile-screen')?.querySelector('.profile-panel');if(!panel)return;
 const isAdmin=String(window.CheckersAuth?.user?.id)==='163701646';
 let adminButton=q('profile-admin-btn'),seasonButton=q('profile-reset-season-btn');
 if(!isAdmin){adminButton?.remove();seasonButton?.remove();q('profile-reset-season-dialog')?.remove();return}
 if(!adminButton){adminButton=document.createElement('button');adminButton.id='profile-admin-btn';adminButton.className='btn btn--primary';adminButton.textContent='⚙️ Админ-панель';adminButton.addEventListener('click',()=>window.CheckersAdmin?.show?.());panel.appendChild(adminButton)}
 const closeDialog=()=>q('profile-reset-season-dialog')?.remove();
 const showDialog=()=>{
  closeDialog();
  const overlay=document.createElement('div');overlay.id='profile-reset-season-dialog';
  overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(8,15,28,.76);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box';
  overlay.innerHTML='<div role="dialog" aria-modal="true" aria-labelledby="season-reset-title" style="width:100%;max-width:360px;background:#fff;color:#172536;border-radius:20px;padding:22px;box-sizing:border-box;box-shadow:0 18px 60px rgba(0,0,0,.3)"><div style="font-size:30px;margin-bottom:8px">🏆</div><div id="season-reset-title" style="font-size:20px;font-weight:800;margin-bottom:10px">Начать новый сезон?</div><div style="font-size:14px;line-height:1.5;margin-bottom:18px">Рейтинг и статистика всех игроков в онлайн- и офлайн-играх будут обнулены. Профили и покупки сохранятся. Действие нельзя отменить.</div><div id="season-reset-error" role="alert" style="display:none;color:#b42318;font-size:13px;line-height:1.4;margin-bottom:12px"></div><div style="display:flex;gap:10px"><button type="button" id="season-reset-cancel" style="flex:1;min-height:44px;border:0;border-radius:12px;background:#eef2f7;color:#172536;font-weight:700">Отмена</button><button type="button" id="season-reset-confirm" style="flex:1;min-height:44px;border:0;border-radius:12px;background:#246fe5;color:white;font-weight:700">Сбросить рейтинг</button></div></div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click',e=>{if(e.target===overlay)closeDialog()});
  q('season-reset-cancel')?.addEventListener('click',closeDialog);
  q('season-reset-confirm')?.addEventListener('click',async()=>{
   const confirmButton=q('season-reset-confirm'),cancelButton=q('season-reset-cancel'),errorBox=q('season-reset-error');
   confirmButton.disabled=true;cancelButton.disabled=true;confirmButton.textContent='Сбрасываем…';errorBox.style.display='none';
   try{
    const init=window.WebApp?.initData||await window.CheckersShop?.getInitData?.()||'';
    if(!init)throw Error('Не удалось получить данные авторизации MAX. Закрой и заново открой мини-приложение.');
    const response=await fetch(window.maxigraApiUrl('/api/profile'),{method:'POST',headers:{'content-type':'text/plain;charset=UTF-8'},body:JSON.stringify({action:'reset_season',initData:init}),cache:'no-store'});
    let data={};try{data=await response.json()}catch{}
    if(!response.ok||!data.ok){
     if(response.status===403||data.error==='FORBIDDEN')throw Error('Сервер не распознал этот аккаунт как администратора. Проверь, что открыл игру под нужным аккаунтом MAX.');
     throw Error(data.error||('Ошибка сервера: '+response.status));
    }
    try{localStorage.removeItem(ACCOUNT_KEY)}catch{}
    closeDialog();
    syncProfile();
    const done=document.createElement('div');done.id='profile-reset-season-success';done.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(8,15,28,.72);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box';
    done.innerHTML='<div style="width:100%;max-width:340px;background:#fff;color:#172536;border-radius:20px;padding:24px;text-align:center;box-sizing:border-box"><div style="font-size:32px">✅</div><div style="font-size:20px;font-weight:800;margin:10px 0">Новый сезон начат!</div><div style="font-size:14px;line-height:1.5;margin-bottom:18px">Обнулено записей статистики: '+Number(data.resetCount||0)+'. Можно начинать соревнование заново.</div><button type="button" id="season-reset-success-close" style="width:100%;min-height:44px;border:0;border-radius:12px;background:#246fe5;color:white;font-weight:700">Готово</button></div>';
    document.body.appendChild(done);q('season-reset-success-close')?.addEventListener('click',()=>done.remove());
   }catch(error){
    errorBox.textContent=error?.message||'Не удалось сбросить рейтинг. Попробуй ещё раз.';
    errorBox.style.display='block';confirmButton.disabled=false;cancelButton.disabled=false;confirmButton.textContent='Повторить';
   }
  });
 };
 if(!seasonButton){seasonButton=document.createElement('button');seasonButton.id='profile-reset-season-btn';seasonButton.className='btn btn--secondary';seasonButton.textContent='🏆 Начать новый сезон';seasonButton.addEventListener('click',showDialog);panel.appendChild(seasonButton)}
}
function lockMenuHorizontalGesture(){
 const menu=q('menu-screen');if(!menu||menu.dataset.gestureLocked==='1')return;
 menu.dataset.gestureLocked='1';
 let sx=0,sy=0,tracking=false;
 menu.addEventListener('touchstart',e=>{const t=e.touches?.[0];if(!t)return;sx=t.clientX;sy=t.clientY;tracking=true},{passive:true});
 menu.addEventListener('touchmove',e=>{if(!tracking)return;const t=e.touches?.[0];if(!t)return;const dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)>Math.abs(dy)+3)e.preventDefault()},{passive:false});
 menu.addEventListener('touchend',()=>{tracking=false},{passive:true});
 menu.addEventListener('touchcancel',()=>{tracking=false},{passive:true});
}
function bindNavigation(){q('tournament-btn')?.addEventListener('click',()=>{show('tournament-screen');refreshTournamentButton()});q('tournament-back')?.addEventListener('click',()=>show('menu-screen'));q('tournament-cancel')?.addEventListener('click',()=>show('menu-screen'));q('tournament-buy')?.addEventListener('click',buyTournamentTicket);q('tournament-open-back')?.addEventListener('click',()=>show('tournament-screen'));q('tournament-open-menu')?.addEventListener('click',()=>show('menu-screen'));q('shop-btn')?.addEventListener('click',()=>show('shop-screen'));q('profile-btn')?.addEventListener('click',()=>{syncProfile();show('profile-screen')});q('rules-btn')?.addEventListener('click',()=>show('rules-screen'));q('shop-back')?.addEventListener('click',()=>show('menu-screen'));q('profile-back')?.addEventListener('click',()=>show('menu-screen'));q('rules-back')?.addEventListener('click',()=>show('menu-screen'));ensureAdminButton();const onlineBtn=q('online-play-btn');if(onlineBtn)onlineBtn.onclick=e=>{e.preventDefault();e.stopPropagation();startOnlineFromButton()};const cancel=q('online-cancel-btn');if(cancel)cancel.onclick=e=>{e.preventDefault();e.stopPropagation();show('menu-screen')}}
function boot(){lockMenuHorizontalGesture();bindNavigation();setTimeout(initStarterOffer,900);q('game-back')?.addEventListener('click',gameBack);window.addEventListener('max-profile-ready',()=>{syncProfile();ensureAdminButton();setTimeout(initStarterOffer,180)});window.addEventListener('shop-state-ready',()=>{renderOwnedBoards();syncProfile()});window.addEventListener('online-game-started',()=>show('game-screen'));syncProfile()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
