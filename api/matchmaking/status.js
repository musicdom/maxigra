import { auth, errorResponse, publicGame, redis, reply } from '../_lib.js';

export async function GET(request) {
  try {
    const user = auth(request);
    await redis('SET', [`checkers:presence:${user.id}`, '1', 'EX', '120']);
    await redis('SET', [`checkers:user:${user.id}`, JSON.stringify(user), 'EX', '120']);
    await redis('SADD', ['checkers:online', user.id]);
    const roomId = await redis('GET', [`checkers:room:user:${user.id}`]);
    if (!roomId) {
      const queued = await redis('SISMEMBER', ['checkers:queue', user.id]);
      return reply({ ok: true, status: queued ? 'waiting' : 'idle' });
    }
    const raw = await redis('GET', [`checkers:room:${roomId}`]);
    if (!raw) {
      await redis('DEL', [`checkers:room:user:${user.id}`]);
      return reply({ ok: true, status: 'idle' });
    }
    const game = JSON.parse(raw);
    return reply({ ok: true, status: game.status === 'playing' ? 'matched' : game.status, game: publicGame(game, user.id) });
  } catch (error) { return errorResponse(error); }
}
export default { GET };
