import { auth, errorResponse, redis, reply } from '../_lib.js';

export async function POST(request) {
  try {
    const user = auth(request);
    const roomId = await redis('GET', [`checkers:room:user:${user.id}`]);
    await redis('SREM', ['checkers:queue', user.id]);
    if (roomId) {
      const raw = await redis('GET', [`checkers:room:${roomId}`]);
      if (raw) {
        const game = JSON.parse(raw);
        if (game.status === 'playing') {
          const side = game.p1.id === user.id ? game.p1Side : game.p2Side;
          game.status = 'finished';
          game.winner = side === 1 ? 2 : 1;
          game.updatedAt = Date.now();
          await redis('SET', [`checkers:room:${roomId}`, JSON.stringify(game), 'EX', '7200']);
        }
      }
      await redis('DEL', [`checkers:room:user:${user.id}`]);
    }
    await redis('DEL', [`checkers:presence:${user.id}`]);
    return reply({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export default { POST };
