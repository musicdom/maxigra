// Магазин «Русские шашки». Демо-режим: покупки сохраняются локально.
(()=>{
 const KEY='russian-checkers-shop-v1';
 const catalog={premium:{title:'Премиум',price:199,icon:'👑',desc:'Без рекламы + все базовые темы'},wood:{title:'Деревянная доска',price:49,icon:'🪵',desc:'Классический набор'},neon:{title:'Неоновая доска',price:79,icon:'✨',desc:'Яркая современная тема'},master:{title:'Гроссмейстер',price:149,icon:'🏆',desc:'Сильнейший уровень ИИ'}};
 let state=JSON.parse(localStorage.getItem(KEY)||'{"coins":0,"owned":[]}');
 const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
 window.CheckersShop={catalog,getState:()=>state,owned:id=>state.owned.includes(id),buy(id){if(!catalog[id])return false;if(!state.owned.includes(id)){state.owned.push(id);save()}return true},coins(){return state.coins},addCoins(n){state.coins+=n;save()}};
})();
