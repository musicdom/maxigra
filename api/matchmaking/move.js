import { auth, body, errorResponse, legalPieceMoves, publicGame, redis, reply, applyMove, allMoves, stateKey } from '../_lib.js';

export async function POST(request) {
  let lock = '';
  let roomForLock = '';
  try {
    const user = auth(request);
    const data = await body(request);
    const roomId = String(data.roomId || '');
    roomForLock = roomId;
    const from = { r: Number(data.from?.r), c: Number(data.from?.c) };
    const to = { r: Number(data.to?.r), c: Number(data.to?.c) };
    if (!roomId || !Number.isInteger(from.r) || !Number.isInteger(from.c) || !Number.isInteger(to.r) || !Number.isInteger(to.c)) return reply({ ok:false, error:'BAD_MOVE' }, 400);

    lock = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const locked = await redis('SET', [`checkers:room:lock:${roomId}`, lock, 'NX', 'EX', '5']);
    if (locked !== 'OK') return reply({ ok:false, error:'BUSY' }, 409);

    const raw = await redis('GET', [`checkers:room:${roomId}`]);
    if (!raw) return reply({ ok:false, error:'ROOM_NOT_FOUND' }, 404);
    const game = JSON.parse(raw);
    if (game.status !== 'playing') return reply({ ok:true, game:publicGame(game,user.id) });
    const side = game.p1.id === user.id ? game.p1Side : game.p2.id === user.id ? game.p2Side : 0;
    if (!side) return reply({ ok:false, error:'NOT_A_PLAYER' }, 403);
    if (game.turn !== side) return reply({ ok:false, error:'NOT_YOUR_TURN' }, 409);

    const legal = legalPieceMoves(game, side, from.r, from.c);
    const move = legal.find(m => m.r === to.r && m.c === to.c);
    if (!move) return reply({ ok:false, error:'ILLEGAL_MOVE' }, 400);

    const nextBoard = applyMove(game.board, from, move);
    game.board = nextBoard;
    game.lastMove = { from, to, cap: move.cap || null };
    game.halfMoves = move.cap ? 0 : Number(game.halfMoves || 0) + 1;
    game.updatedAt = Date.now();

    if (move.cap) {
      const nextCaptures = legalPieceMoves({ ...game, board: nextBoard, chain: { side, r: to.r, c: to.c } }, side, to.r, to.c).filter(m => m.cap);
      if (nextCaptures.length) {
        game.chain = { side, r: to.r, c: to.c };
      } else {
        game.chain = null;
        game.turn = side === 1 ? 2 : 1;
      }
    } else {
      game.chain = null;
      game.turn = side === 1 ? 2 : 1;
    }

    const key = stateKey(game);
    game.reps = game.reps || {};
    game.reps[key] = (game.reps[key] || 0) + 1;

    if (game.halfMoves >= 100 || game.reps[key] >= 3) {
      game.status = 'finished';
      game.winner = 'draw';
    } else {
      const nextMoves = allMoves(game, game.turn);
      if (!nextMoves.length) {
        game.status = 'finished';
        game.winner = side;
      }
    }

    await redis('SET', [`checkers:room:${roomId}`, JSON.stringify(game), 'EX', '7200']);
    await redis('SET', [`checkers:presence:${user.id}`, '1', 'EX', '7200']);
    return reply({ ok:true, game:publicGame(game,user.id) });
  } catch (error) {
    return errorResponse(error);
  } finally {
    if (lock && roomForLock) {
      try {
        const script = `if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end`;
        await redis('EVAL', [script, 1, `checkers:room:lock:${roomForLock}`, lock]);
      } catch {}
    }
  }
}

export default { POST };
