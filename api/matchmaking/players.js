import { auth, errorResponse, redis, reply } from '../_lib.js';

export async function GET(request) {
  try {
    const me = auth(request);
    const ids = await redis('SMEMBERS', ['checkers:online']);
    const players = [];
    const stale = [];
    for (const id of ids || []) {
      const presence = await redis('EXISTS', [`checkers:presence:${id}`]);
      if (!presence) { stale.push(id); continue; }
      const profileRaw = await redis('GET', [`checkers:user:${id}`]);
      if (!profileRaw) continue;
      const profile = JSON.parse(profileRaw);
      const roomId = await redis('GET', [`checkers:room:user:${id}`]);
      let state = 'searching';
      if (roomId) {
        const roomRaw = await redis('GET', [`checkers:room:${roomId}`]);
        if (roomRaw) {
          const room = JSON.parse(roomRaw);
          if (room.status === 'playing') state = 'playing';
        }
      }
      players.push({ id: String(id), name: profile.name || 'Игрок', username: profile.username || '', state, me: String(id) === me.id });
    }
    if (stale.length) await redis('SREM', ['checkers:online', ...stale]);
    players.sort((a, b) => Number(b.me) - Number(a.me) || a.name.localeCompare(b.name, 'ru'));
    return reply({ ok: true, count: players.length, playing: players.filter(p => p.state === 'playing').length, players });
  } catch (error) {
    return errorResponse(error);
  }
}

export default { GET };
