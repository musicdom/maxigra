import { auth, body, errorResponse, initialBoard, publicGame, reply, redis } from './_lib.js';

export async function GET(request){
  try{
    const user=auth(request);
    const url=new URL(request.url);
    const roomId=String(url.searchParams.get('roomId')||'');
    if(roomId){
      if(!/^R[A-Z0-9]{6}$/.test(roomId))throw Object.assign(new Error('ROOM_NOT_FOUND'),{status:404});
      const raw=await redis('GET',[`checkers:room:${roomId}`]);
      if(!raw)throw Object.assign(new Error('ROOM_NOT_FOUND'),{status:404});
      const room=JSON.parse(raw);
      if(room.p1?.id!==user.id&&room.p2?.id!==user.id)throw Object.assign(new Error('NOT_A_PLAYER'),{status:403});
      if(room.status==='playing'||room.status==='finished')return reply({ok:true,status:room.status,game:publicGame(room,user.id),roomId});
      return reply({ok:true,status:'waiting',roomId,room:{id:room.id,name:room.p1?.name||'Игрок'}});
    }
    const ids=await redis('KEYS',['checkers:room:*']); const rooms=[];
    for(const key of (ids||[])){
      if(key.includes(':user:')||key.includes(':lock:'))continue;
      const raw=await redis('GET',[key]); if(!raw)continue;
      try{const r=JSON.parse(raw);if(r.status==='waiting'&&r.p1?.id!==user.id)rooms.push({id:r.id,name:r.p1?.name||'Игрок',createdAt:r.createdAt})}catch{}
    }
    rooms.sort((a,b)=>b.createdAt-a.createdAt);
    return reply({ok:true,rooms:rooms.slice(0,30)});
  }catch(e){return errorResponse(e)}
}

export async function POST(request){
  try{
    const user=auth(request); const data=await body(request); const action=String(data.action||'');
    if(action==='create'){
      const id='R'+Math.random().toString(36).slice(2,8).toUpperCase();
      const room={id,status:'waiting',p1:user,p2:null,p1Side:1,p2Side:2,board:initialBoard(),turn:1,chain:null,halfMoves:0,reps:{},winner:null,lastMove:null,createdAt:Date.now(),updatedAt:Date.now()};
      const ok=await redis('SET',[`checkers:room:${id}`,JSON.stringify(room),'NX','EX',7200]);
      if(ok!=='OK')throw new Error('ROOM_CREATE_FAILED');
      await redis('SET',[`checkers:room:user:${user.id}`,id,'EX',7200]);
      await redis('SET',[`checkers:user:${user.id}`,JSON.stringify(user),'EX',2592000]);
      return reply({ok:true,room:{id,name:user.name}});
    }
    if(action==='leave'){
      const id=String(data.roomId||''); const key=`checkers:room:${id}`; const raw=await redis('GET',[key]);
      if(!raw)return reply({ok:true}); const room=JSON.parse(raw);
      if(room.p1?.id!==user.id||room.status!=='waiting')throw new Error('ROOM_BUSY');
      await redis('DEL',[key]); await redis('DEL',[`checkers:room:user:${user.id}`]); return reply({ok:true});
    }
    if(action==='join'){
      const id=String(data.roomId||''); if(!/^R[A-Z0-9]{6}$/.test(id))throw Object.assign(new Error('ROOM_NOT_FOUND'),{status:404});
      const key=`checkers:room:${id}`; const raw=await redis('GET',[key]); if(!raw)throw Object.assign(new Error('ROOM_NOT_FOUND'),{status:404});
      const room=JSON.parse(raw); if(room.p1?.id===user.id)throw new Error('OWN_ROOM'); if(room.status!=='waiting'||room.p2)throw new Error('ROOM_BUSY');
      room.p2=user; room.status='playing'; room.updatedAt=Date.now(); room.board=room.board?.length?room.board:initialBoard();
      const saved=await redis('SET',[key,JSON.stringify(room),'XX','EX',7200]); if(saved!=='OK')throw new Error('ROOM_BUSY');
      await redis('SET',[`checkers:room:user:${user.id}`,id,'EX',7200]); await redis('SET',[`checkers:user:${user.id}`,JSON.stringify(user),'EX',2592000]);
      await redis('SET',[`checkers:presence:${room.p1.id}`,'1','EX',120]); await redis('SET',[`checkers:presence:${user.id}`,'1','EX',120]);
      return reply({ok:true,status:'matched',game:publicGame(room,user.id),roomId:id});
    }
    throw new Error('INVALID_ACTION');
  }catch(e){return errorResponse(e)}
}
export default {GET,POST};
