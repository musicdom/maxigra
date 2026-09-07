import { auth, errorResponse, reply, redis } from '../_lib.js';

export async function GET(request){
  try{
    const user=auth(request);
    const ids=await redis('KEYS',['checkers:room:*']);
    const rooms=[];
    for(const key of (ids||[])){
      if(key.includes(':user:'))continue;
      const raw=await redis('GET',[key]); if(!raw)continue;
      try{const r=JSON.parse(raw);if(r.status==='waiting'&&r.p1?.id!==user.id)rooms.push({id:r.id,name:r.p1?.name||'Игрок',createdAt:r.createdAt})}catch{}
    }
    rooms.sort((a,b)=>b.createdAt-a.createdAt);
    return reply({ok:true,rooms:rooms.slice(0,30)});
  }catch(e){return errorResponse(e)}
}
export default {GET};
