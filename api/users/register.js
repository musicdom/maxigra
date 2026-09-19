import { auth, body, errorResponse, redis, reply } from '../_lib.js';

const usersKey='checkers:users';

export async function POST(request){
  try{
    const user=auth(request);
    const payload=await body(request);
    const record={
      id:String(user.id),
      name:String(payload?.name||user.name||'Игрок'),
      username:String(payload?.username||user.username||''),
      photo:String(payload?.photo||user.photo||''),
      lastSeenAt:Date.now()
    };
    await redis('HSET',[usersKey,record.id,JSON.stringify(record)]);
    return reply({ok:true,user:record});
  }catch(error){return errorResponse(error);}
}
export default {POST};
