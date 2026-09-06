import { auth, errorResponse, publicGame, redis, reply } from '../_lib.js';

export async function GET(request) {
  try {
    const user = auth(request);
    await redis('SET', [`checkers:presence:${user.id}`, '1', 'EX', '120']);
    const roomId = await redis('GET', [`checkers:room:user:${user.id}`]);
    if (!roomId) {
      const queued = await redis('SISMEMBER', ['checkers:queue', user.id]);
      return reply({ ok: true, status: queued ? 'waiting' : 'idle' });
    }
    const raw = await redis('GET', [`checkers:room:${roomId}`]);
    if (!raw) return reply({ ok: true, status: 'idle' });
    const game = JSON.parse(raw);
    return reply({ ok: true, status: game.status === 'playing' ? 'matched' : game.status, game: publicGame(game, user.id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export default { GET };
