import { auth, errorResponse, reply, redis } from '../_lib.js';

export async function POST(request){
  try{
    const user=auth(request); const data=await request.json().catch(()=>({})); const id=String(data.roomId||'');
    if(!id)throw new Error('ROOM_NOT_FOUND');
    const key=`checkers:room:${id}`; const raw=await redis('GET',[key]);
    if(!raw)return reply({ok:true});
    const room=JSON.parse(raw);
    if(room.p1?.id!==user.id||room.status!=='waiting')throw new Error('ROOM_BUSY');
    await redis('DEL',[key]); await redis('DEL',[`checkers:room:user:${user.id}`]);
    return reply({ok:true});
  }catch(e){return errorResponse(e)}
}
export default {POST};
