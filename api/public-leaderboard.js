import { redis, reply, errorResponse } from './_lib.js';

export async function OPTIONS(){return reply({ok:true});}

export async function GET(request){
  try{
    const url=new URL(request.url);
    const mode=url.searchParams.get('mode')==='online'?'online':'offline';
    const keys=await redis('KEYS',[`checkers:stats:${mode}:*`]);
    const rows=[];
    for(const key of (keys||[])){
      const raw=await redis('GET',[key]);
      if(!raw)continue;
      try{
        const s=JSON.parse(raw);
        if(Number(s.games||0)>0)rows.push({id:String(s.id),name:s.name||'Игрок',username:s.username||'',photo:s.photo||'',games:Number(s.games||0),wins:Number(s.wins||0),losses:Number(s.losses||0),draws:Number(s.draws||0)});
      }catch{}
    }
    rows.sort((a,b)=>b.wins-a.wins||b.games-a.games||b.draws-a.draws||a.losses-b.losses||a.name.localeCompare(b.name,'ru'));
    const leaderboard=rows.slice(0,100).map((x,i)=>({...x,rank:i+1}));
    const startedAt=Number(await redis('GET',['checkers:season:startedAt'])||0);
    let endsAt=Number(await redis('GET',['checkers:season:endsAt'])||0);
    if(!endsAt&&startedAt){const end=new Date(startedAt);const day=end.getDate();end.setDate(1);end.setMonth(end.getMonth()+1);const lastDay=new Date(end.getFullYear(),end.getMonth()+1,0).getDate();end.setDate(Math.min(day,lastDay));endsAt=end.getTime();}
    return reply({ok:true,mode,updatedAt:Date.now(),leaderboard,total:rows.length,season:{startedAt,endsAt}});
  }catch(error){return errorResponse(error)}
}

export default {GET,OPTIONS};
