import { auth, errorResponse, publicGame, reply, redis } from '../_lib.js';

export async function POST(request){
  try{
    const user=auth(request); const data=await request.json().catch(()=>({})); const id=String(data.roomId||'');
    if(!/^R[A-Z0-9]{6}$/.test(id))throw Object.assign(new Error('ROOM_NOT_FOUND'),{status:404});
    const key=`checkers:room:${id}`; const raw=await redis('GET',[key]);
    if(!raw)throw Object.assign(new Error('ROOM_NOT_FOUND'),{status:404});
    const room=JSON.parse(raw);
    if(room.p1?.id===user.id)throw new Error('OWN_ROOM');
    if(room.status!=='waiting'||room.p2)throw new Error('ROOM_BUSY');
    room.p2=user; room.status='playing'; room.updatedAt=Date.now();
    room.board=room.board?.length?room.board:initialBoard();
    const saved=await redis('SET',[key,JSON.stringify(room),'XX','EX',7200]);
    if(saved!=='OK')throw new Error('ROOM_BUSY');
    await redis('SET',[`checkers:room:user:${user.id}`,id,'EX',7200]);
    await redis('SET',[`checkers:user:${user.id}`,JSON.stringify(user),'EX',2592000]);
    await redis('SET',[`checkers:presence:${room.p1.id}`,'1','EX',120]);
    await redis('SET',[`checkers:presence:${user.id}`,'1','EX',120]);
    return reply({ok:true,status:'matched',game:publicGame(room,user.id),roomId:id});
  }catch(e){return errorResponse(e)}
}
export default {POST};
