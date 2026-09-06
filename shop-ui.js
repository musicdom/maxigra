(()=>{
'use strict';
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function errorText(e){if(e?.message==='PAYMENT_REQUIRED')return'Покупка доступна после подтверждения оплаты.';if(e?.message==='MAX_INIT_DATA_REQUIRED')return'Откройте игру внутри MAX.';return'Не удалось выполнить действие. Попробуйте ещё раз.'}
function render(){
 const box=document.getElementById('shop-content');const shop=window.CheckersShop;if(!box||!shop)return;
 const s=shop.state||{};const c=shop.catalog||{};
 box.innerHTML=`<div class="shop-balance"><span>Ваши предметы</span><b>${s.owned?.length||0}</b></div><div class="shop-grid">${Object.entries(c).map(([id,x])=>{const owned=shop.owned(id),selected=s.selectedBoard===id||s.selectedPieces===id;return `<article class="shop-item ${owned?'is-owned':''} ${selected?'is-selected':''}"><div class="shop-item-icon">${x.icon}</div><div class="shop-item-main"><span class="shop-tag">${esc(x.tag)}</span><h3>${esc(x.title)}</h3><p>${esc(x.desc)}</p></div><button class="shop-buy btn ${owned?'btn--secondary':'btn--primary'}" data-shop-id="${esc(id)}">${id==='hints'?((s.hints||0)+' подсказок'):owned?(selected?'Выбрано':'Использовать'):x.price+' ₽'}</button></article>`}).join('')}</div>`;
 box.querySelectorAll('[data-shop-id]').forEach(btn=>btn.addEventListener('click',async()=>{
  const id=btn.dataset.shopId;btn.disabled=true;
  try{
   if(shop.owned(id)){
    if(['wood','neon','marble','default'].includes(id))await shop.selectBoard(id);else if(id==='gold')await shop.selectPieces(id);else if(id==='premium')await shop.selectBoard('premium');else if(id==='master')shop.setAI(4);
   }else await shop.buy(id);
   render();
  }catch(e){btn.disabled=false;showNotice(errorText(e))}
 }));
}
function showNotice(text){let el=document.getElementById('shop-notice');if(!el){el=document.createElement('div');el.id='shop-notice';el.className='shop-notice';document.getElementById('shop-content')?.prepend(el)}el.textContent=text;el.style.display='block';clearTimeout(el._timer);el._timer=setTimeout(()=>el.style.display='none',2500)}
async function boot(){
 try{await window.CheckersShop?.sync?.()}catch{}
 render();window.addEventListener('max-profile-ready',render);window.addEventListener('shop-state-ready',render);document.addEventListener('click',e=>{if(e.target.closest('#shop-btn'))setTimeout(render,0)})
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
