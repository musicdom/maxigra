import { auth, body, errorResponse, redis, reply } from './_lib.js';
import { recordGameActivity } from './_retention.js';
import { submitAppSupport } from '../lib/support.js';

const statsKey = (id,mode='offline') => `checkers:stats:${mode}:${id}`;

function emptyStats(user){
  return { id:String(user.id), name:user.name||'Игрок', username:user.username||'', photo:user.photo||'', games:0, wins:0, losses:0, draws:0, updatedAt:Date.now() };
}

async function recordResult(user, resultId, result, mode='offline'){
  if(!['win','loss','draw'].includes(result)) throw Object.assign(new Error('BAD_RESULT'),{status:400});
  if(!resultId) throw Object.assign(new Error('RESULT_ID_REQUIRED'),{status:400});
  const key=statsKey(user.id,mode);
  const raw=await redis('GET',[key]);
  let stats;
  try{stats=raw?JSON.parse(raw):emptyStats(user)}catch{stats=emptyStats(user)}
  stats.id=String(user.id);stats.name=user.name||stats.name||'Игрок';stats.username=user.username||stats.username||'';stats.photo=user.photo||stats.photo||'';
  stats.resultIds=Array.isArray(stats.resultIds)?stats.resultIds.slice(-80):[];
  if(stats.resultIds.includes(String(resultId)))return stats;
  stats.games=Math.max(0,Number(stats.games)||0)+1;
  if(result==='win')stats.wins=Math.max(0,Number(stats.wins)||0)+1;
  if(result==='loss')stats.losses=Math.max(0,Number(stats.losses)||0)+1;
  if(result==='draw')stats.draws=Math.max(0,Number(stats.draws)||0)+1;
  stats.resultIds.push(String(resultId));
  stats.updatedAt=Date.now();
  await redis('SET',[key,JSON.stringify(stats)]);
  return stats;
}

export async function OPTIONS(){return reply({ok:true});}

export async function GET(request){
  try{
    const url=new URL(request.url);
    const user=auth(request,url.searchParams.get('initData')||'');
    if(url.searchParams.get('leaderboard')==='1'){
      const mode=url.searchParams.get('mode')==='online'?'online':'offline';
      const keys=await redis('KEYS',[`checkers:stats:${mode}:*`]);
      const rows=[];
      for(const key of (keys||[])){
        const raw=await redis('GET',[key]);if(!raw)continue;
        try{
          const s=JSON.parse(raw);
          if(Number(s.games||0)>0)rows.push({id:String(s.id),name:s.name||'Игрок',username:s.username||'',photo:s.photo||'',games:Number(s.games||0),wins:Number(s.wins||0),losses:Number(s.losses||0),draws:Number(s.draws||0)});
        }catch{}
      }
      rows.sort((a,b)=>b.wins-a.wins||b.games-a.games||b.draws-a.draws||a.losses-b.losses||a.name.localeCompare(b.name,'ru'));
      const limit=Math.min(100,Math.max(1,Number(url.searchParams.get('limit')||100)));
      const leaderboard=rows.slice(0,limit).map((x,i)=>({...x,rank:i+1}));
      const me=leaderboard.find(x=>x.id===String(user.id));
      const seasonStartedAt=Number(await redis('GET',['checkers:season:startedAt'])||0);
      let seasonEndsAt=0;if(seasonStartedAt){const end=new Date(seasonStartedAt);const day=end.getDate();end.setDate(1);end.setMonth(end.getMonth()+1);const lastDay=new Date(end.getFullYear(),end.getMonth()+1,0).getDate();end.setDate(Math.min(day,lastDay));seasonEndsAt=end.getTime();}
      return reply({ok:true,leaderboard,me:me||null,total:rows.length,season:{startedAt:seasonStartedAt,endsAt:seasonEndsAt}});
    }
    const raw=await redis('GET',[statsKey(user.id)]);
    let stats=null;try{stats=raw?JSON.parse(raw):null}catch{}
    const ticketRaw=await redis('GET',[`checkers:tournament:prize-battle:tickets:${user.id}`]);
    const tickets=Math.max(0,Math.floor(Number(ticketRaw)||0));
    return reply({ok:true,stats:stats||emptyStats(user),tickets});
  }catch(error){return errorResponse(error)}
}

export async function POST(request){
  try{
    const payload=await body(request);
    const user=auth(request,payload?.initData||'');
    if(payload?.action==='support'){
      await submitAppSupport(user, String(payload.message||''));
      return reply({ok:true});
    }
    if(payload?.action==='reset_season'){
      if(String(user.id)!=='163701646')throw Object.assign(new Error('FORBIDDEN'),{status:403});
      const modes=['offline','online'];
      let resetCount=0;
      for(const mode of modes){
        const keys=await redis('KEYS',['checkers:stats:'+mode+':*']);
        for(const key of (Array.isArray(keys)?keys:[])){
          const raw=await redis('GET',[key]);
          if(!raw)continue;
          try{
            const stats=JSON.parse(raw);
            stats.games=0;stats.wins=0;stats.losses=0;stats.draws=0;
            stats.resultIds=[];stats.updatedAt=Date.now();
            await redis('SET',[key,JSON.stringify(stats)]);
            resetCount++;
          }catch{}
        }
      }
      const startedAt=Date.now();
      const end=new Date(startedAt);const day=end.getDate();end.setDate(1);end.setMonth(end.getMonth()+1);const lastDay=new Date(end.getFullYear(),end.getMonth()+1,0).getDate();end.setDate(Math.min(day,lastDay));const endsAt=end.getTime();
      await redis('SET',['checkers:season:startedAt',String(startedAt)]);
      await redis('SET',['checkers:season:endsAt',String(endsAt)]);
      return reply({ok:true,resetCount,startedAt,endsAt});
    }
    if(payload?.action==='record_result')return reply({ok:true,stats:await recordResult(user,String(payload.resultId||''),String(payload.result||''),payload.mode==='online'?'online':'offline')});
    const now=Date.now(),key=`checkers:user:${user.id}`;
    const existingRaw=await redis('GET',[key]);let existing=null;
    if(existingRaw){try{existing=JSON.parse(existingRaw)}catch{}}
    const profile={id:String(user.id),name:user.name,username:user.username||'',photo:user.photo||'',createdAt:existing?.createdAt||Number(payload?.createdAt)||now,updatedAt:now,lastSeenAt:now,openCount:Math.max(0,Number(existing?.openCount)||0)+1};
    // Keep the account record permanently so older players remain visible in admin.
    await redis('SET',[key,JSON.stringify(profile)]);
    await redis('SET',[`checkers:presence:${user.id}`,'1','EX','120']);
    await recordGameActivity(user);
    return reply({ok:true,registered:Boolean(existing),isNew:!existing,user:profile});
  }catch(error){return errorResponse(error)}
}

export default {GET,POST,OPTIONS};
