(()=>{
'use strict';
const $=id=>document.getElementById(id);
const launcher=$('support-launcher'),modal=$('support-modal'),form=$('support-form'),field=$('support-message'),status=$('support-status'),send=$('support-send');
if(!launcher||!modal||!form)return;
const close=()=>{modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true')};
const open=()=>{if(document.getElementById('game-screen')?.classList.contains('active'))return;modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');setTimeout(()=>field?.focus(),40)};
launcher.addEventListener('click',open);
$('support-close')?.addEventListener('click',close);
modal.querySelector('[data-support-close]')?.addEventListener('click',close);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('is-open'))close()});
const syncLauncher=()=>{
 const game=document.getElementById('game-screen')?.classList.contains('active');
 launcher.classList.toggle('is-hidden',!!game);
 if(game)close();
};
document.querySelectorAll('.screen').forEach(screen=>new MutationObserver(syncLauncher).observe(screen,{attributes:true,attributeFilter:['class']}));
syncLauncher();
form.addEventListener('submit',async e=>{
 e.preventDefault();
 const message=String(field.value||'').trim();
 if(!message){status.textContent='Напиши сообщение перед отправкой.';return}
 const initData=String(window.WebApp?.initData||window.CheckersAuth?.initData||'').trim();
 if(!initData){status.textContent='Не удалось проверить профиль MAX. Открой бота и отправь команду /support.';return}
 send.disabled=true;send.textContent='Отправляем…';status.classList.remove('is-success');status.textContent='';
 try{
  const requestOptions={method:'POST',headers:{'content-type':'text/plain;charset=UTF-8'},body:JSON.stringify({message,initData}),cache:'no-store'};
  const response=window.maxigraFetch?await window.maxigraFetch('/api/support',requestOptions):await fetch(window.maxigraApiUrl('/api/support'),requestOptions);
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.ok){const reason=String(data.error||'');throw new Error(reason==='MAX_INIT_DATA_REQUIRED'||reason==='INVALID_INIT_DATA'||reason==='INIT_DATA_EXPIRED'?'Не удалось проверить профиль MAX. Полностью закрой и снова открой приложение.':reason==='MAX_BOT_TOKEN_NOT_CONFIGURED'?'Поддержка временно недоступна: не настроен бот.':reason==='REDIS_NOT_CONFIGURED'||reason.includes('Redis')?'Поддержка временно недоступна: проблема с хранилищем.':reason==='MAX_USER_ID_REQUIRED'?'Не удалось определить твой MAX-профиль. Открой приложение из MAX.':`Не удалось отправить сообщение (${reason||response.status}). Попробуй ещё раз.`)}
  field.value='';status.classList.add('is-success');status.textContent='Готово! Обращение отправлено. Ответ придёт в бот MAX.';send.textContent='Отправлено';
  setTimeout(()=>{close();send.textContent='Отправить сообщение';status.textContent='';status.classList.remove('is-success')},1800);
 }catch(error){status.textContent=error?.message||'Не удалось отправить сообщение. Попробуй ещё раз.';send.textContent='Повторить'}
 finally{send.disabled=false}
});
})();