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
 const owned=id=>id==='default'||state.owned.includes(id)||state.owned.includes('premium');
 const buy=id=>{if(!catalog[id]||state.owned.includes(id))return false;state.owned.push(id);if(id==='master')state.ai=4;if(id==='hints')state.hints+=50;save();return true};
 window.CheckersShop={catalog,state,save,owned,buy,selectBoard(id){if(owned(id)){state.selectedBoard=id;save();return true}return false},selectPieces(id){if(owned(id)){state.selectedPieces=id;save();return true}return false},setAI(n){n=Math.max(1,Math.min(4,Number(n)||1));if(n===1||owned('master')){state.ai=n;save();return true}return false},getProfile(){return {...state}}};
 save();
})();