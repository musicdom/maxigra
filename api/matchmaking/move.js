import { auth, body, errorResponse, legalPieceMoves, publicGame, redis, reply, applyMove, allMoves, stateKey } from '../_lib.js';

export function OPTIONS(){ return reply({ok:true}); }

export async function POST(request) {
  if (new URL(request.url).pathname.endsWith('/resign')) {
    try {
      const user = auth(request), data = await body(request), roomId = String(data.roomId || '');
      if (!roomId) return reply({ok:false,error:'ROOM_REQUIRED'},400);
      const raw = await redis('GET',['checkers:room:' + roomId]);
      if (!raw) return reply({ok:false,error:'ROOM_NOT_FOUND'},404);
      const game = JSON.parse(raw);
      const side = String(game.p1?.id)===String(user.id)?Number(game.p1Side):String(game.p2?.id)===String(user.id)?Number(game.p2Side):0;
      if (!side) return reply({ok:false,error:'NOT_A_PLAYER'},403);
      if (game.status==='playing') { game.status='finished'; game.winner=side===1?2:1; game.updatedAt=Date.now(); await redis('SET',['checkers:room:' + roomId,JSON.stringify(game),'EX','7200']); }
      await redis('SREM',['checkers:online',user.id]); await redis('DEL',['checkers:presence:' + user.id]);
      return reply({ok:true,game:publicGame(game,user.id)});
    } catch(error) { return errorResponse(error); }
  }
  let lock = '', roomForLock = '';
  try {
    const user = auth(request);
    const data = await body(request);
    const roomId = String(data.roomId || ''); roomForLock = roomId;
    const from = { r:Number(data.from?.r), c:Number(data.from?.c) }, to = { r:Number(data.to?.r), c:Number(data.to?.c) };
    if(!roomId||![from.r,from.c,to.r,to.c].every(Number.isInteger)||![from.r,from.c,to.r,to.c].every(v=>v>=0&&v<8)) return reply({ok:false,error:'BAD_MOVE'},400);
    lock=`${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if(await redis('SET',[`checkers:room:lock:${roomId}`,lock,'NX','EX','5'])!=='OK') return reply({ok:false,error:'BUSY'},409);
    const raw=await redis('GET',[`checkers:room:${roomId}`]);
    if(!raw)return reply({ok:false,error:'ROOM_NOT_FOUND'},404);
    const game=JSON.parse(raw);
    if(!game.p1||!game.p2)return reply({ok:false,error:'ROOM_NOT_READY'},409);
    if(game.status!=='playing')return reply({ok:true,game:publicGame(game,user.id)});

    const uid=String(user.id);
    const side=String(game.p1.id)===uid?Number(game.p1Side||1):String(game.p2.id)===uid?Number(game.p2Side||2):0;
    if(!side)return reply({ok:false,error:'NOT_A_PLAYER'},403);
    if(Number(game.turn)!==side)return reply({ok:false,error:'NOT_YOUR_TURN'},409);

    const legal=legalPieceMoves(game,side,from.r,from.c);
    const move=legal.find(m=>Number(m.r)===to.r&&Number(m.c)===to.c);
    if(!move)return reply({ok:false,error:'ILLEGAL_MOVE'},400);

    game.board=applyMove(game.board,from,move);
    game.lastMove={from:{r:from.r,c:from.c},to:{r:to.r,c:to.c},cap:move.cap||null};
    game.halfMoves=move.cap?0:Number(game.halfMoves||0)+1;
    game.updatedAt=Date.now();

    if(move.cap){
      const nextCaptures=legalPieceMoves({...game,board:game.board,chain:{side,r:to.r,c:to.c}},side,to.r,to.c).filter(m=>m.cap);
      if(nextCaptures.length)game.chain={side,r:to.r,c:to.c};
      else{game.chain=null;game.turn=side===1?2:1}
    }else{game.chain=null;game.turn=side===1?2:1}

    const key=stateKey(game);
    game.reps=game.reps||{};
    game.reps[key]=(game.reps[key]||0)+1;
    if(game.halfMoves>=100||game.reps[key]>=3){game.status='finished';game.winner='draw'}
    else if(!allMoves(game,game.turn).length){game.status='finished';game.winner=side}

    await redis('SET',[`checkers:room:${roomId}`,JSON.stringify(game),'EX','7200']);
    await Promise.allSettled([
      redis('SET',[`checkers:presence:${user.id}`,'1','EX','7200']),
      redis('SADD',['checkers:online',user.id])
    ]);

    return reply({ok:true,game:publicGame(game,user.id)});
  }catch(error){return errorResponse(error)}finally{
    if(lock&&roomForLock)try{await redis('EVAL',[`if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end`,1,`checkers:room:lock:${roomForLock}`,lock])}catch{}
  }
}
export default { POST, OPTIONS };
