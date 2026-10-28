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
 const initData=String(window.WebApp?.initData||window.CheckersAuth?.initData||'');
 if(!initData){status.textContent='Не удалось проверить профиль MAX. Открой бота и отправь команду /support.';return}
 send.disabled=true;send.textContent='Отправляем…';status.classList.remove('is-success');status.textContent='';
 try{
  const response=await fetch(window.maxigraApiUrl('/api/support'),{method:'POST',headers:{'content-type':'application/json','x-max-init-data':initData},body:JSON.stringify({message,initData}),cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.ok)throw new Error(data.error==='MAX_INIT_DATA_REQUIRED'?'Не удалось проверить профиль MAX. Переоткрой приложение.':'Не удалось отправить сообщение. Попробуй ещё раз.');
  field.value='';status.classList.add('is-success');status.textContent='Готово! Обращение отправлено. Ответ придёт в бот MAX.';send.textContent='Отправлено';
  setTimeout(()=>{close();send.textContent='Отправить сообщение';status.textContent='';status.classList.remove('is-success')},1800);
 }catch(error){status.textContent=error?.message||'Не удалось отправить сообщение. Попробуй ещё раз.';send.textContent='Повторить'}
 finally{send.disabled=false}
});
})();