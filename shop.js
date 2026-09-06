/* Магазин Русских шашек. Витрина и локальное состояние аккаунта. */
(()=>{
 const KEY='russian-checkers-account-v2';
 const catalog={
  premium:{title:'Premium',price:199,icon:'👑',tag:'ЛУЧШЕЕ',desc:'Все темы, наборы шашек и расширенные настройки.'},
  wood:{title:'Дерево',price:49,icon:'🪵',tag:'ДОСКА',desc:'Тёплая классическая деревянная доска.'},
  neon:{title:'Neon',price:79,icon:'✨',tag:'ДОСКА',desc:'Контрастная неоновая тема для ночной игры.'},
  marble:{title:'Мрамор',price:99,icon:'⬜',tag:'ДОСКА',desc:'Премиальная светлая мраморная доска.'},
  gold:{title:'Gold',price:69,icon:'🟡',tag:'ШАШКИ',desc:'Золотой набор шашек.'},
  master:{title:'Гроссмейстер',price:149,icon:'🏆',tag:'ИИ',desc:'Открывает максимальный уровень компьютера.'},
  hints:{title:'50 подсказок',price:39,icon:'💡',tag:'ПАКЕТ',desc:'50 подсказок для сложных позиций.'}
 };
 let state;try{state=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){state=null}
 state=state||{owned:[],selectedBoard:'default',selectedPieces:'default',ai:1,hints:3,coins:0,games:0,wins:0,losses:0,draws:0};
 state.owned=Array.isArray(state.owned)?state.owned:[];
 state.ai=Math.max(1,Math.min(4,Number(state.ai)||1));
 state.hints=Math.max(0,Number(state.hints)||0);
 state.games=Number(state.games)||0;state.wins=Number(state.wins)||0;state.losses=Number(state.losses)||0;state.draws=Number(state.draws)||0;
 const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
 const owned=id=>id==='default'||(id!=='hints'&&state.owned.includes(id))||state.owned.includes('premium');
 const buy=id=>{
  if(!catalog[id])return false;
  if(id==='hints'){
   state.hints+=50;
   if(!state.owned.includes('hints'))state.owned.push('hints');
   save();return true;
  }
  if(state.owned.includes(id))return false;
  state.owned.push(id);
  if(id==='master')state.ai=4;
  save();return true;
 };
 window.CheckersShop={catalog,state,save,owned,buy,selectBoard(id){if(owned(id)){state.selectedBoard=id;save();return true}return false},selectPieces(id){if(owned(id)){state.selectedPieces=id;save();return true}return false},setAI(n){n=Math.max(1,Math.min(4,Number(n)||1));if(n===1||owned('master')){state.ai=n;save();return true}return false},getProfile(){return {...state}}};
 save();
})();

/* Онлайн-режим подключается динамически, чтобы не менять существующую разметку. */
(()=>{
  function bootOnlineUI(){
    if(document.getElementById('online-play-btn')) return;
    const menu=document.querySelector('.menu__buttons');
    const game=document.getElementById('game-screen');
    if(!menu||!game) return;
    const button=document.createElement('button');
    button.className='btn btn--secondary';
    button.id='online-play-btn';
    button.textContent='🎲 Играть с игроком';
    menu.insertBefore(button, document.getElementById('shop-btn') || null);

    const screen=document.createElement('section');
    screen.className='screen';
    screen.id='online-search-screen';
    screen.innerHTML='<div class="online-search-card"><div class="online-search-icon">⚔️</div><h2>Ищем соперника</h2><p id="online-search-text">Подключаем вас к случайному игроку MAX…</p><div class="online-loader"></div><button class="btn btn--secondary" id="online-cancel-btn">Отменить поиск</button></div>';
    game.parentNode.insertBefore(screen,game);

    const style=document.createElement('style');
    style.textContent='.online-search-card{width:min(92vw,430px);margin:auto;padding:34px 24px;border-radius:26px;text-align:center;background:rgba(20,24,34,.94);border:1px solid rgba(255,255,255,.08);box-shadow:0 20px 70px rgba(0,0,0,.35)}.online-search-icon{font-size:46px;margin-bottom:8px}.online-search-card h2{margin:6px 0 8px}.online-search-card p{opacity:.72;line-height:1.45}.online-loader{width:42px;height:42px;margin:22px auto;border:3px solid rgba(255,255,255,.15);border-top-color:currentColor;border-radius:50%;animation:online-spin .8s linear infinite}@keyframes online-spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);

    const script=document.createElement('script');
    script.src='online.js?v=20260906';
    script.defer=true;
    document.body.appendChild(script);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bootOnlineUI,{once:true});
  else bootOnlineUI();
})();
