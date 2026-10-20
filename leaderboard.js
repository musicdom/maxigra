(()=>{'use strict';
const $=id=>document.getElementById(id);
let mode='offline';\nlet seasonTimer=null;
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function avatar(x,cls='leader-avatar'){return x?.photo?'<img class="'+cls+'" src="'+esc(x.photo)+'" alt="">':'<div class="'+cls+' leader-avatar-fallback">♟</div>'}
function podiumCard(x,place){
  if(!x)return '<div class="leader-podium-slot empty"></div>';
  const medal=['','🥇','🥈','🥉'][place];
  return '<div class="leader-podium-card place-'+place+'">'+
    '<div class="leader-podium-medal">'+medal+'</div>'+
    avatar(x,'leader-podium-avatar')+
    '<div class="leader-podium-rank">'+place+'</div>'+
    '<div class="leader-podium-name">'+esc(x.name)+'</div>'+
    '<div class="leader-podium-wins">'+x.wins+' <span>ПОБЕД</span></div>'+
    '</div>';
}
function renderSeason(season){\n const panel=$('leaderboard-season');if(!panel)return;\n const end=Number(season?.endsAt||0);\n if(!end){panel.innerHTML='<div class=\"season-countdown-title\">🏆 СЕЗОННЫЙ РЕЙТИНГ</div><div class=\"season-countdown-empty\">Новый сезон ещё не запущен администратором.</div>';if(seasonTimer){clearInterval(seasonTimer);seasonTimer=null}return}\n const update=()=>{const left=Math.max(0,end-Date.now());const totalSeconds=Math.floor(left/1000);const days=Math.floor(totalSeconds/86400),hours=Math.floor(totalSeconds%86400/3600),minutes=Math.floor(totalSeconds%3600/60),seconds=totalSeconds%60;const months=Math.floor(days/30),remainingDays=days%30;const units=[['МЕСЯЦ',months],['ДНЕЙ',remainingDays],['ЧАСОВ',hours],['МИНУТ',minutes],['СЕКУНД',seconds]];panel.innerHTML='<div class=\"season-countdown-title\">🏆 ДО КОНЦА СЕЗОНА</div><div class=\"season-countdown-grid\">'+units.map(([label,value])=>'<div class=\"season-countdown-unit\"><b>'+String(value).padStart(2,'0')+'</b><span>'+label+'</span></div>').join('')+'</div>'+(left===0?'<div class=\"season-countdown-finished\">Сезон завершён</div>':'');if(left===0&&seasonTimer){clearInterval(seasonTimer);seasonTimer=null}};\n update();if(seasonTimer)clearInterval(seasonTimer);if(end>Date.now())seasonTimer=setInterval(update,1000);\n}\nfunction render(rows,me){
  const box=$('leaderboard-list');
  if(!box)return;
  if(!rows.length){
    box.innerHTML='<div class="leader-empty">Пока нет завершённых партий в этом рейтинге.</div>';
    return;
  }
  const top=rows.slice(0,3), rest=rows.slice(3);
  let html='<div class="leader-podium">'+podiumCard(top[1],2)+podiumCard(top[0],1)+podiumCard(top[2],3)+'</div>';
  if(rest.length){
    html+='<div class="leader-section-title"><span>РЕЙТИНГ</span><i></i></div><div class="leader-rows">';
    html+=rest.map(x=>{
      const isMe=x.id===String(window.CheckersAuth?.user?.id);
      return '<div class="leader-row '+(isMe?'me':'')+'">'+
        '<div class="leader-rank">'+x.rank+'</div>'+
        '<div class="leader-player">'+avatar(x)+'<div style="min-width:0"><div class="leader-name">'+esc(x.name)+'</div><div class="leader-record">'+x.games+' игр · '+x.losses+' поражений · '+x.draws+' ничьих</div></div></div>'+
        '<div class="leader-wins"><b>'+x.wins+'</b><span>ПОБЕД</span></div>'+
      '</div>';
    }).join('');
    html+='</div>';
  }
  box.innerHTML=html;
}
async function load(){
  const box=$('leaderboard-list');if(!box)return;
  box.innerHTML='<div class="leader-empty">Загружаем рейтинг…</div>';
  try{
    let raw='';
    for(let i=0;i<40&&!raw;i++){raw=String(window.CheckersShop?.getInitData?.()||window.WebApp?.initData||'').trim();if(!raw)await new Promise(resolve=>setTimeout(resolve,250));}
    const path='/api/profile?leaderboard=1&mode='+mode+'&initData='+encodeURIComponent(raw);
    const r=window.maxigraFetch?await window.maxigraFetch(path,{cache:'no-store'}):await fetch(window.maxigraApiUrl(path),{cache:'no-store'});
    const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||'Ошибка');
    renderSeason(d.season||{});\n    render(d.leaderboard||[],d.me);
    const me=d.me,el=$('leaderboard-me');
    if(el)el.innerHTML=me?
      '<div class="leader-me-label">ВАШ РЕЗУЛЬТАТ</div><div class="leader-me-main"><strong>#'+me.rank+'</strong><span>'+me.wins+' побед · '+me.games+' игр</span></div>':
      '<div class="leader-me-label">ВАШ РЕЗУЛЬТАТ</div><div class="leader-me-main"><span>Сыграйте хотя бы одну партию, чтобы попасть в рейтинг.</span></div>';
  }catch(e){
    box.innerHTML='<div class="leader-empty">Не удалось загрузить рейтинг. Проверьте соединение и повторите попытку.<br><button class="btn btn--secondary" id="leaderboard-retry" style="margin-top:12px">Повторить</button></div>';
    $('leaderboard-retry')?.addEventListener('click',load);
  }
}
function setMode(next){mode=next;document.querySelectorAll('.leader-tab').forEach(x=>x.classList.toggle('active',x.dataset.mode===mode));load()}
function open(){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$('leaderboard-screen')?.classList.add('active');setMode(mode)}
function setup(){
  $('leaderboard-btn')?.addEventListener('click',open);
  $('leaderboard-back')?.addEventListener('click',()=>{document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$('menu-screen')?.classList.add('active')});
  document.querySelectorAll('.leader-tab').forEach(x=>x.addEventListener('click',()=>setMode(x.dataset.mode)));
  window.CheckersLeaderboard={open,load,setMode};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
