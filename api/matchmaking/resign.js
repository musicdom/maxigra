import { auth, body, errorResponse, publicGame, redis, reply } from '../_lib.js';

export async function POST(request) {
  try {
    const user = auth(request);
    const data = await body(request);
    const roomId = String(data.roomId || '');
    if (!roomId) return reply({ ok:false, error:'ROOM_REQUIRED' }, 400);
    const raw = await redis('GET', [`checkers:room:${roomId}`]);
    if (!raw) return reply({ ok:false, error:'ROOM_NOT_FOUND' }, 404);
    const game = JSON.parse(raw);
    const side = game.p1.id === user.id ? game.p1Side : game.p2.id === user.id ? game.p2Side : 0;
    if (!side) return reply({ ok:false, error:'NOT_A_PLAYER' }, 403);
    if (game.status === 'playing') {
      game.status = 'finished';
      game.winner = side === 1 ? 2 : 1;
      game.updatedAt = Date.now();
      await redis('SET', [`checkers:room:${roomId}`, JSON.stringify(game), 'EX', '7200']);
    }
    return reply({ ok:true, game:publicGame(game,user.id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export default { POST };
