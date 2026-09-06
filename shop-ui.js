(()=>{
'use strict';
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function render(){
 const box=document.getElementById('shop-content');const shop=window.CheckersShop;if(!box||!shop)return;
 const s=shop.state||{};const c=shop.catalog||{};
 box.innerHTML=`<div class="shop-balance"><span>Ваши предметы</span><b>${s.owned?.length||0}</b></div><div class="shop-grid">${Object.entries(c).map(([id,x])=>{const owned=shop.owned(id),selected=s.selectedBoard===id||s.selectedPieces===id;return `<article class="shop-item ${owned?'is-owned':''} ${selected?'is-selected':''}"><div class="shop-item-icon">${x.icon}</div><div class="shop-item-main"><span class="shop-tag">${esc(x.tag)}</span><h3>${esc(x.title)}</h3><p>${esc(x.desc)}</p></div><button class="shop-buy btn ${owned?'btn--secondary':'btn--primary'}" data-shop-id="${esc(id)}">${id==='hints'?((s.hints||0)+' подсказок'):owned?(selected?'Выбрано':'Использовать'):x.price+' ₽'}</button></article>`}).join('')}</div>`;
 box.querySelectorAll('[data-shop-id]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.shopId;if(id==='hints'){if(shop.buy(id))render();return}if(shop.owned(id)){if(['wood','neon','marble','default'].includes(id))shop.selectBoard(id);else if(id==='gold')shop.selectPieces(id);else if(id==='premium'){shop.selectBoard('default');shop.selectPieces('gold')}else if(id==='master')shop.setAI(4);render();return}if(shop.buy(id)){if(['wood','neon','marble'].includes(id))shop.selectBoard(id);if(id==='gold')shop.selectPieces(id);render()}}));
}
function boot(){render();window.addEventListener('max-profile-ready',render);document.addEventListener('click',e=>{if(e.target.closest('#shop-btn'))setTimeout(render,0)})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
