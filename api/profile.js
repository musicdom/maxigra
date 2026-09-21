import { auth, body, errorResponse, redis, reply } from './_lib.js';

const statsKey = id => `checkers:stats:${id}`;

function emptyStats(user){
  return { id:String(user.id), name:user.name||'Игрок', username:user.username||'', photo:user.photo||'', games:0, wins:0, losses:0, draws:0, updatedAt:Date.now() };
}

async function recordResult(user, resultId, result){
  if(!['win','loss','draw'].includes(result)) throw Object.assign(new Error('BAD_RESULT'),{status:400});
  if(!resultId) throw Object.assign(new Error('RESULT_ID_REQUIRED'),{status:400});
  const key=statsKey(user.id);
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

export async function GET(request){
  try{
    const user=auth(request);
    const url=new URL(request.url);
    if(url.searchParams.get('leaderboard')==='1'){
      const keys=await redis('KEYS',['checkers:stats:*']);
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
      return reply({ok:true,leaderboard,me:me||null,total:rows.length});
    }
    const raw=await redis('GET',[statsKey(user.id)]);
    let stats=null;try{stats=raw?JSON.parse(raw):null}catch{}
    return reply({ok:true,stats:stats||emptyStats(user)});
  }catch(error){return errorResponse(error)}
}

export async function POST(request){
  try{
    const user=auth(request);
    const payload=await body(request);
    if(payload?.action==='record_result')return reply({ok:true,stats:await recordResult(user,String(payload.resultId||''),String(payload.result||''))});
    const now=Date.now(),key=`checkers:user:${user.id}`;
    const existingRaw=await redis('GET',[key]);let existing=null;
    if(existingRaw){try{existing=JSON.parse(existingRaw)}catch{}}
    const profile={id:user.id,name:user.name,username:user.username||'',photo:user.photo||'',createdAt:existing?.createdAt||Number(payload?.createdAt)||now,updatedAt:now,lastSeenAt:now};
    await redis('SET',[key,JSON.stringify(profile),'EX','2592000']);
    await redis('SET',[`checkers:presence:${user.id}`,'1','EX','120']);
    return reply({ok:true,registered:Boolean(existing),isNew:!existing,user:profile});
  }catch(error){return errorResponse(error)}
}

export default {GET,POST};
