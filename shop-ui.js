(()=>{ 
'use strict';
function esc(v){return String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}
function errorText(e){if(e?.message==='PAYMENT_NOT_CONFIGURED')return'Оплата пока не настроена.';if(e?.message==='PAYMENT_REQUIRED')return'Покупка доступна после подтверждения оплаты.';if(e?.message==='MAX_INIT_DATA_REQUIRED')return'Откройте игру внутри MAX.';if(e?.message==='MAX_BOT_TOKEN_NOT_CONFIGURED')return'На сервере не настроена авторизация MAX.';if(e?.message==='REDIS_NOT_CONFIGURED')return'Сервис магазина временно недоступен.';if(e?.message==='INVALID_INIT_DATA'||e?.message==='INIT_DATA_EXPIRED')return'Сеанс MAX устарел. Закройте и заново откройте игру.';if(e?.message==='PAYMENT_OPEN_FAILED')return'Не удалось открыть страницу оплаты. Попробуйте ещё раз.';if(e?.message==='ITEM_NOT_OWNED')return'Сначала приобретите эту доску.';const code=String(e?.message||'UNKNOWN_ERROR');return /^[A-Za-z0-9_:-]{1,80}$/.test(code)?`Не удалось выполнить действие. Код: ${code}`:'Не удалось выполнить действие. Попробуйте ещё раз.'}

function confirmPurchase(item){
 return new Promise(resolve=>{
  document.getElementById('purchase-confirm-overlay')?.remove();
  const overlay=document.createElement('div');overlay.id='purchase-confirm-overlay';overlay.className='purchase-confirm-overlay';
  const title=String(item?.title||'Покупка'),desc=String(item?.desc||'Цифровой товар для игры «Шашки».');
  const price=Number(item?.price)||0,icon=String(item?.icon||'🛍️');
  overlay.innerHTML=`<div class="purchase-confirm-backdrop" data-purchase-cancel></div><section class="purchase-confirm-card" role="dialog" aria-modal="true" aria-labelledby="purchase-confirm-title"><button type="button" class="purchase-confirm-close" aria-label="Закрыть" data-purchase-cancel>×</button><div class="purchase-confirm-icon">${icon}</div><div class="purchase-confirm-kicker">ПОДТВЕРЖДЕНИЕ ПОКУПКИ</div><h2 id="purchase-confirm-title">${title.replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}</h2><p class="purchase-confirm-desc">${desc.replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}</p><div class="purchase-confirm-total"><span>К оплате</span><strong>${price.toLocaleString('ru-RU')} ₽</strong></div><p class="purchase-confirm-note">После подтверждения откроется страница оплаты ЮMoney. Заказ ещё не оплачен.</p><div class="purchase-confirm-actions"><button type="button" class="purchase-confirm-cancel" data-purchase-cancel>Отмена</button><button type="button" class="purchase-confirm-submit" id="purchase-confirm-submit">Подтвердить и оплатить</button></div></section>`;
  document.body.appendChild(overlay);
  let settled=false;
  const finish=value=>{if(settled)return;settled=true;overlay.remove();document.removeEventListener('keydown',onKey);resolve(value)};
  const onKey=e=>{if(e.key==='Escape')finish(false)};
  overlay.querySelectorAll('[data-purchase-cancel]').forEach(el=>el.addEventListener('click',()=>finish(false)));
  overlay.querySelector('#purchase-confirm-submit')?.addEventListener('click',()=>finish(true));
  document.addEventListener('keydown',onKey);
  overlay.querySelector('#purchase-confirm-submit')?.focus();
 });
}
window.CheckersConfirmPurchase=confirmPurchase;

function openPayment(url){if(!url)return false;try{if(window.WebApp?.openLink){window.WebApp.openLink(url);return true}}catch{}try{const opened=window.open(url,'_blank','noopener,noreferrer');if(opened)return true}catch{}try{location.href=url;return true}catch{return false}}
const pendingPurchases=new Set();
const productDescriptions={
 board_90s:'Дополнительная игровая доска в стилистике СВО.',
 board_svo:'Дополнительная игровая доска в ретро-стиле 90-х.',
 board_max:'Фирменная игровая доска в стиле MAX.',
 board_orbita:'Дополнительная игровая доска в космическом стиле ОРБИТА.',
 master:'Постоянный доступ к максимальному уровню компьютера.',
 hints:'Пакет из 50 подсказок для сложных игровых позиций.',
 starter_pack:'Набор: 25 подсказок и две дополнительные доски — 90-е и СВО.'
};
function closePurchaseConfirm(){const overlay=document.getElementById('purchase-confirm-overlay');if(!overlay)return;overlay.classList.remove('is-visible');setTimeout(()=>overlay.remove(),190)}
function confirmPurchase(id,item){
 return new Promise(resolve=>{
  document.getElementById('purchase-confirm-overlay')?.remove();
  const overlay=document.createElement('div');overlay.id='purchase-confirm-overlay';overlay.className='purchase-confirm-overlay';
  const isBoard=(window.CheckersShop?.boardIds||[]).includes(id);
  const icon=item.image?'<img src="'+esc(item.image)+'" alt="">':esc(item.icon||'🎁');
  overlay.innerHTML=`<section class="purchase-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="purchase-confirm-title"><button type="button" class="purchase-confirm-close" aria-label="Закрыть">×</button><div class="purchase-confirm-kicker">ПОДТВЕРЖДЕНИЕ ПОКУПКИ</div><h2 id="purchase-confirm-title">Покупаете этот предмет?</h2><p class="purchase-confirm-description">Проверьте состав и стоимость заказа перед переходом к оплате.</p><div class="purchase-confirm-summary"><div class="purchase-confirm-icon">${icon}</div><div class="purchase-confirm-product"><strong>${esc(item.title)}</strong><span>${esc(productDescriptions[id]||item.desc||'Цифровой товар для игры «Шашки».')}</span></div><div class="purchase-confirm-price">${Number(item.price).toLocaleString('ru-RU')} ₽</div></div><div class="purchase-confirm-payment"><span>К оплате</span><strong>${Number(item.price).toLocaleString('ru-RU')} ₽</strong></div><div class="purchase-confirm-actions"><button type="button" class="purchase-confirm-cancel">Отмена</button><button type="button" class="purchase-confirm-accept">Подтвердить</button></div><p class="purchase-confirm-note">После подтверждения заказ будет создан, затем откроется страница оплаты ЮMoney.</p></section>`;
  document.body.appendChild(overlay);
  let settled=false;
  const finish=value=>{if(settled)return;settled=true;closePurchaseConfirm();resolve(value)};
  overlay.querySelector('.purchase-confirm-close').addEventListener('click',()=>finish(false));
  overlay.querySelector('.purchase-confirm-cancel').addEventListener('click',()=>finish(false));
  overlay.addEventListener('click',e=>{if(e.target===overlay)finish(false)});
  const accept=overlay.querySelector('.purchase-confirm-accept');
  accept.addEventListener('click',()=>finish(true));
  const onKey=e=>{if(e.key==='Escape'){finish(false);document.removeEventListener('keydown',onKey)}};
  document.addEventListener('keydown',onKey);
  requestAnimationFrame(()=>overlay.classList.add('is-visible'));
  overlay.addEventListener('transitionend',()=>{if(settled)document.removeEventListener('keydown',onKey)},{once:true});
 });
}
function render(){
 const box=document.getElementById('shop-content');const shop=window.CheckersShop;if(!box||!shop)return;
 const s=shop.state||{},c=shop.catalog||{};const boards=(shop.boardIds||[]).filter(id=>c[id]);const extras=Object.entries(c).filter(([id])=>!boards.includes(id)&&id!=='starter_pack');
 const card=(id,x)=>{const isFree=x.price===0,isOwned=shop.owned(id),selected=s.selectedBoard===id;return `<article class="shop-item board-shop-item ${isOwned?'is-owned':''} ${selected?'is-selected':''}"><div class="shop-board-preview"><img src="${esc(x.image)}" alt="${esc(x.title)}" loading="eager"></div><div class="shop-item-main"><span class="shop-tag">${esc(x.tag)}</span><h3>${esc(x.title)}</h3><p>${esc(x.desc)}</p><button class="shop-buy btn ${isOwned?'btn--secondary':'btn--primary'}" data-shop-id="${esc(id)}">${isFree?(isOwned?(selected?'✓ Выбрано':'Выбрать'):'Бесплатно'):isOwned?(selected?'✓ Выбрано':'Выбрать'):x.price+' ₽'}</button></div></article>`};
 box.innerHTML=`<div class="shop-balance"><span>Ваши предметы</span><b>${s.owned?.length||0}</b></div><h3 class="shop-section-title">Доски</h3><div class="shop-grid shop-board-grid">${boards.map(id=>card(id,c[id])).join('')}</div>${extras.length?`<h3 class="shop-section-title">Дополнительно</h3><div class="shop-grid">${extras.map(([id,x])=>{const isOwned=shop.owned(id),selected=s.selectedPieces===id;const isHints=id==='hints';return `<article class="shop-item ${isOwned?'is-owned':''} ${selected?'is-selected':''} ${isHints?'hints-shop-item':''}"><div class="shop-item-icon">${x.icon||'🎁'}</div><div class="shop-item-main"><span class="shop-tag">${esc(x.tag)}</span><h3>${esc(x.title)}</h3><p>${esc(x.desc)}</p>${isHints?`<div class="hints-balance"><span>У вас</span><b>${Number(s.hints)||0}</b><span>шт.</span></div>`:''}</div><button class="shop-buy btn btn--primary" data-shop-id="${esc(id)}">${isHints?'Купить 50 · '+x.price+' ₽':isOwned?(selected?'✓ Выбрано':'Использовать'):x.price+' ₽'}</button></article>`}).join('')}</div>`:''}`;
 box.querySelectorAll('[data-shop-id]').forEach(btn=>btn.addEventListener('click',async()=>{
  const id=btn.dataset.shopId;if(pendingPurchases.has(id))return;
  const item=c[id];if(!item)return;
  btn.disabled=true;
  try{
   if(shop.owned(id)){
    if(boards.includes(id))await shop.selectBoard(id);else if(id==='gold')await shop.selectPieces(id);else if(id==='master')shop.setAI(4);
   }else{
    const confirmed=await confirmPurchase(id,item);
    if(!confirmed){btn.disabled=false;return}
    pendingPurchases.add(id);
    btn.disabled=true;
    btn.textContent='Создаём заказ…';
    const order=await shop.buy(id);
    if(order?.sentToBot){showNotice('Сообщение с доской и кнопкой оплаты отправлено в бот MAX. Откройте чат с ботом.')}
    else{const paymentUrl=order?.paymentUrl||order?.paymentOptions?.wallet;if(!paymentUrl)throw new Error('PAYMENT_NOT_CONFIGURED');showNotice('Заказ создан. Открываем оплату ЮMoney…');if(!openPayment(paymentUrl))throw new Error('PAYMENT_OPEN_FAILED')}
   }
   render();
  }catch(e){console.error('[MAXIGRA SHOP] purchase failed:',e);showNotice(errorText(e));btn.disabled=false}
  finally{pendingPurchases.delete(id)}
 }));
}
function showNotice(text){let el=document.getElementById('shop-notice');if(!el){el=document.createElement('div');el.id='shop-notice';el.className='shop-notice';document.getElementById('shop-content')?.prepend(el)}el.textContent=text;el.style.display='block';clearTimeout(el._timer);el._timer=setTimeout(()=>el.style.display='none',3500)}
async function boot(){
 try{
  if(window.MaxAssetCache?.ready)await window.MaxAssetCache.ready;

  if(location.hash==='#reset-shop'){
   await window.CheckersShop?.resetForTest?.();
   history.replaceState(null,'',location.pathname+location.search);
   render();
   showNotice('Тестовый аккаунт сброшен: СВО и 90-е удалены, доступна только «Оригинал».');
  }else{
   await window.CheckersShop?.sync?.();
  }
 }catch(e){if(location.hash==='#reset-shop')showNotice(errorText(e))}
 render();window.addEventListener('max-profile-ready',render);window.addEventListener('shop-state-ready',render);window.addEventListener('max-assets-applied',render);window.addEventListener('max-assets-cached',render);document.addEventListener('click',e=>{if(e.target.closest('#shop-btn'))setTimeout(render,0)})
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
