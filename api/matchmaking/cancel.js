import { auth, errorResponse, redis, reply } from '../_lib.js';

export async function POST(request) {
  try {
    const user = auth(request);
    const queueKey = 'checkers:queue';
    const roomKey = `checkers:room:user:${user.id}`;

    // Cancel only matchmaking. An active game must be ended through /resign.
    await redis('SREM', [queueKey, user.id]);
    const roomId = await redis('GET', [roomKey]);

    if (roomId) {
      const raw = await redis('GET', [`checkers:room:${roomId}`]);
      if (raw) {
        const game = JSON.parse(raw);
        // Do not turn an active game into a loss when the search screen is closed.
        if (game.status !== 'playing') {
          await redis('DEL', [roomKey]);
        }
      } else {
        await redis('DEL', [roomKey]);
      }
    }

    // Keep the user visible/available after cancelling a search.
    await redis('SET', [`checkers:presence:${user.id}`, '1', 'EX', '120']);
    await redis('SADD', ['checkers:online', user.id]);
    return reply({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export default { POST };
