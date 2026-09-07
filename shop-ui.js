(()=>{
'use strict';
function esc(v){return String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}
function errorText(e){if(e?.message==='PAYMENT_NOT_CONFIGURED')return'Оплата пока не настроена.';if(e?.message==='PAYMENT_REQUIRED')return'Покупка доступна после подтверждения оплаты.';if(e?.message==='MAX_INIT_DATA_REQUIRED')return'Откройте игру внутри MAX.';if(e?.message==='ITEM_NOT_OWNED')return'Сначала приобретите эту доску.';return'Не удалось выполнить действие. Попробуйте ещё раз.'}
function openPayment(url){if(!url)return false;try{const opened=window.open(url,'_blank','noopener,noreferrer');if(opened)return true}catch{}try{location.href=url;return true}catch{return false}}
function render(){
 const box=document.getElementById('shop-content');const shop=window.CheckersShop;if(!box||!shop)return;
 const s=shop.state||{},c=shop.catalog||{};const boards=(shop.boardIds||[]).filter(id=>c[id]);const extras=Object.entries(c).filter(([id])=>!boards.includes(id));
 const card=(id,x)=>{const isOwned=shop.owned(id),selected=s.selectedBoard===id;return `<article class="shop-item board-shop-item ${isOwned?'is-owned':''} ${selected?'is-selected':''}"><div class="shop-board-preview"><img src="${esc(x.image)}" alt="${esc(x.title)}" loading="lazy"></div><div class="shop-item-main"><span class="shop-tag">${esc(x.tag)}</span><h3>${esc(x.title)}</h3><p>${esc(x.desc)}</p><button class="shop-buy btn ${isOwned?'btn--secondary':'btn--primary'}" data-shop-id="${esc(id)}">${isOwned?(selected?'✓ Выбрано':'Выбрать'):x.price+' ₽'}</button></div></article>`};
 box.innerHTML=`<div class="shop-balance"><span>Ваши предметы</span><b>${s.owned?.length||0}</b></div><h3 class="shop-section-title">Доски</h3><div class="shop-grid shop-board-grid">${boards.map(id=>card(id,c[id])).join('')}</div>${extras.length?`<h3 class="shop-section-title">Дополнительно</h3><div class="shop-grid">${extras.map(([id,x])=>{const isOwned=shop.owned(id),selected=s.selectedPieces===id;return `<article class="shop-item ${isOwned?'is-owned':''} ${selected?'is-selected':''}"><div class="shop-item-icon">${x.icon||'🎁'}</div><div class="shop-item-main"><span class="shop-tag">${esc(x.tag)}</span><h3>${esc(x.title)}</h3><p>${esc(x.desc)}</p></div><button class="shop-buy btn ${isOwned?'btn--secondary':'btn--primary'}" data-shop-id="${esc(id)}">${id==='hints'?((s.hints||0)+' подсказок'):isOwned?(selected?'✓ Выбрано':'Использовать'):x.price+' ₽'}</button></article>`}).join('')}</div>`:''}`;
 box.querySelectorAll('[data-shop-id]').forEach(btn=>btn.addEventListener('click',async()=>{
  const id=btn.dataset.shopId;btn.disabled=true;
  try{
   if(shop.owned(id)){
    if(boards.includes(id))await shop.selectBoard(id);else if(id==='gold')await shop.selectPieces(id);else if(id==='master')shop.setAI(4);
   }else{
    const order=await shop.buy(id);
    if(order?.paymentUrl){openPayment(order.paymentUrl);showNotice(`Заказ ${order.id} создан. После оплаты предмет будет выдан автоматически.`)}
   }
   render();
  }catch(e){btn.disabled=false;showNotice(errorText(e))}
 }));
}
function showNotice(text){let el=document.getElementById('shop-notice');if(!el){el=document.createElement('div');el.id='shop-notice';el.className='shop-notice';document.getElementById('shop-content')?.prepend(el)}el.textContent=text;el.style.display='block';clearTimeout(el._timer);el._timer=setTimeout(()=>el.style.display='none',3500)}
async function boot(){try{await window.CheckersShop?.sync?.()}catch{}render();window.addEventListener('max-profile-ready',render);window.addEventListener('shop-state-ready',render);document.addEventListener('click',e=>{if(e.target.closest('#shop-btn'))setTimeout(render,0)})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
