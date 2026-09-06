import { auth, errorResponse, redis, reply } from '../_lib.js';

export async function POST(request) {
  try {
    const user = auth(request);
    const roomId = await redis('GET', [`checkers:room:user:${user.id}`]);
    await redis('SREM', ['checkers:queue', user.id]);
    await redis('DEL', [`checkers:presence:${user.id}`]);
    if (roomId) {
      const raw = await redis('GET', [`checkers:room:${roomId}`]);
      if (raw) {
        const game = JSON.parse(raw);
        if (game.status === 'waiting') {
          await redis('DEL', [`checkers:room:${roomId}`, `checkers:room:user:${user.id}`]);
        }
      }
    }
    return reply({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export default { POST };
