/* Магазин Русских шашек. Пока без реального списания денег: готовая витрина + система выдачи предметов. */
(()=>{
 const KEY='russian-checkers-account-v2';
 const catalog={
  premium:{title:'Premium',price:199,icon:'👑',tag:'ЛУЧШЕЕ',desc:'Все темы, наборы шашек и расширенные настройки.'},
  wood:{title:'Дерево',price:49,icon:'🪵',tag:'ДОСКА',desc:'Тёплая классическая деревянная доска.'},
  neon:{title:'Neon',price:79,icon:'✨',tag:'ДОСКА',desc:'Контрастная неоновая тема для ночной игры.'},
  marble:{title:'Мрамор',price:99,icon:'⬜',tag:'ДОСКА',desc:'Премиальная светлая мраморная доска.'},
  gold:{title:'Gold',price:69,icon:'🟡',tag:'ШАШКИ',desc:'Золотой набор шашек.'},
  master:{title:'Гроссмейстер',price:149,icon:'🏆',tag:'ИИ',desc:'Самый сильный доступный уровень компьютера.'},
  hints:{title:'50 подсказок',price:39,icon:'💡',tag:'ПАКЕТ',desc:'50 подсказок для сложных позиций.'}
 };
 let state; try{state=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
 state=state||{owned:[],selectedBoard:'default',selectedPieces:'default',ai:1,hints:3,coins:0,games:0,wins:0};
 const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
 const owned=id=>id==='default'||state.owned.includes(id)||state.owned.includes('premium');
 const buy=id=>{if(!catalog[id]||state.owned.includes(id))return false;state.owned.push(id);if(id==='master')state.ai=3;if(id==='hints')state.hints+=50;save();return true};
 window.CheckersShop={catalog,state,save,owned,buy,selectBoard(id){if(owned(id)){state.selectedBoard=id;save();return true}},selectPieces(id){if(owned(id)){state.selectedPieces=id;save();return true}},setAI(n){if(n<=1||owned('master')){state.ai=n;save();return true}return false},getProfile(){return {...state}}};
})();
