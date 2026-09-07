import { auth, body, errorResponse, initialBoard, reply, redis } from '../_lib.js';

export async function POST(request){
  try{
    const user=auth(request);
    const id='R'+Math.random().toString(36).slice(2,8).toUpperCase();
    const room={id,status:'waiting',p1:user,p2:null,p1Side:1,p2Side:2,board:initialBoard(),turn:1,chain:null,halfMoves:0,reps:{},winner:null,lastMove:null,createdAt:Date.now(),updatedAt:Date.now()};
    const ok=await redis('SET',[`checkers:room:${id}`,JSON.stringify(room),'NX','EX',7200]);
    if(ok!=='OK')throw new Error('ROOM_CREATE_FAILED');
    await redis('SET',[`checkers:room:user:${user.id}`,id,'EX',7200]);
    await redis('SET',[`checkers:user:${user.id}`,JSON.stringify(user),'EX',2592000]);
    return reply({ok:true,room:{id,name:user.name}});
  }catch(e){return errorResponse(e)}
}
export async function GET(){return reply({ok:true})}
export default {POST,GET};
