import { auth, body, errorResponse, initialBoard, publicGame, reply, redis } from './_lib.js';

const roomKey = id => `checkers:room:${id}`;
const userRoomKey = id => `checkers:room:user:${id}`;
const lockKey = id => `checkers:room:lock:${id}`;

export async function GET(request){
  try{
    const user=auth(request);
    const url=new URL(request.url);
    const roomId=String(url.searchParams.get('roomId')||'');
    if(roomId){
      if(!/^R[A-Z0-9]{6}$/.test(roomId))throw Object.assign(new Error('ROOM_NOT_FOUND'),{status:404});
      const raw=await redis('GET',[roomKey(roomId)]);
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
  let lockId='';
  let lockHeld=false;
  try{
    const user=auth(request); const data=await body(request); const action=String(data.action||'');

    if(action==='sync'){
      const id=String(data.roomId||'');
      if(!/^R[A-Z0-9]{6}$/.test(id))throw Object.assign(new Error('ROOM_NOT_FOUND'),{status:404});
      const raw=await redis('GET',[roomKey(id)]);
      if(!raw)throw Object.assign(new Error('ROOM_NOT_FOUND'),{status:404});
      const room=JSON.parse(raw);
      if(room.p1?.id!==user.id&&room.p2?.id!==user.id)throw Object.assign(new Error('NOT_A_PLAYER'),{status:403});
      return reply({ok:true,status:room.status,version:Number(room.updatedAt||0),game:publicGame(room,user.id)});
    }

    if(action==='create'){
      const existing=await redis('GET',[userRoomKey(user.id)]);
      if(existing){
        const old=await redis('GET',[roomKey(existing)]);
        if(old){
          const oldRoom=JSON.parse(old);
          if(oldRoom.p1?.id===user.id&&oldRoom.status==='waiting')return reply({ok:true,room:{id:oldRoom.id,name:user.name},existing:true});
        }
        await redis('DEL',[userRoomKey(user.id)]);
      }
      const id='R'+Math.random().toString(36).slice(2,8).toUpperCase();
      const room={id,status:'waiting',p1:user,p2:null,p1Side:1,p2Side:2,board:initialBoard(),turn:1,chain:null,halfMoves:0,reps:{},winner:null,lastMove:null,createdAt:Date.now(),updatedAt:Date.now()};
      const ok=await redis('SET',[roomKey(id),JSON.stringify(room),'NX','EX',7200]);
      if(ok!=='OK')throw new Error('ROOM_CREATE_FAILED');
      await redis('SET',[userRoomKey(user.id),id,'EX',7200]);
      await redis('SET',[`checkers:user:${user.id}`,JSON.stringify(user),'EX',2592000]);
      return reply({ok:true,room:{id,name:user.name}});
    }

    if(action==='leave'){
      const id=String(data.roomId||''); if(!/^R[A-Z0-9]{6}$/.test(id))return reply({ok:true});
      lockId=id; lockHeld=(await redis('SET',[lockKey(id),user.id,'NX','EX',10]))==='OK';
      if(!lockHeld)throw new Error('ROOM_BUSY');
      const key=roomKey(id); const raw=await redis('GET',[key]);
      if(!raw){await redis('DEL',[userRoomKey(user.id)]);return reply({ok:true});}
      const room=JSON.parse(raw);
      if(room.p1?.id!==user.id||room.status!=='waiting')throw new Error('ROOM_BUSY');
      await redis('DEL',[key]); await redis('DEL',[userRoomKey(user.id)]); return reply({ok:true});
    }

    if(action==='join'){
      const id=String(data.roomId||''); if(!/^R[A-Z0-9]{6}$/.test(id))throw Object.assign(new Error('ROOM_NOT_FOUND'),{status:404});
      lockId=id; lockHeld=(await redis('SET',[lockKey(id),user.id,'NX','EX',10]))==='OK';
      if(!lockHeld)throw new Error('ROOM_BUSY');
      const key=roomKey(id); const raw=await redis('GET',[key]); if(!raw)throw Object.assign(new Error('ROOM_NOT_FOUND'),{status:404});
      const room=JSON.parse(raw); if(room.p1?.id===user.id)throw new Error('OWN_ROOM'); if(room.status!=='waiting'||room.p2)throw new Error('ROOM_BUSY');
      const oldRoomId=await redis('GET',[userRoomKey(user.id)]);
      if(oldRoomId&&oldRoomId!==id)await redis('DEL',[userRoomKey(user.id)]);
      room.p2=user; room.status='playing'; room.updatedAt=Date.now(); room.board=room.board?.length?room.board:initialBoard();
      const saved=await redis('SET',[key,JSON.stringify(room),'XX','EX',7200]); if(saved!=='OK')throw new Error('ROOM_BUSY');
      await redis('SET',[userRoomKey(user.id),id,'EX',7200]); await redis('SET',[`checkers:user:${user.id}`,JSON.stringify(user),'EX',2592000]);
      await redis('SET',[`checkers:presence:${room.p1.id}`,'1','EX',120]); await redis('SET',[`checkers:presence:${user.id}`,'1','EX',120]);
      return reply({ok:true,status:'matched',game:publicGame(room,user.id),roomId:id});
    }
    throw new Error('INVALID_ACTION');
  }catch(e){return errorResponse(e)}
  finally{if(lockHeld&&lockId)await redis('DEL',[lockKey(lockId)]).catch(()=>{});}
}

export default {GET,POST};