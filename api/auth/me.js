import { auth, body, errorResponse, redis, reply } from '../../_lib.js';

export async function POST(request) {
  try {
    const user = auth(request);
    const payload = await body(request);
    const now = Date.now();
    const profile = {
      id: user.id,
      name: user.name,
      username: user.username || '',
      photo: user.photo || '',
      createdAt: Number(payload?.createdAt) || now,
      updatedAt: now,
      lastSeenAt: now
    };
    const key = `checkers:user:${user.id}`;
    const existingRaw = await redis('GET', [key]);
    let existing = null;
    if (existingRaw) {
      try { existing = JSON.parse(existingRaw); } catch {}
    }
    if (existing) profile.createdAt = existing.createdAt || profile.createdAt;
    await redis('SET', [key, JSON.stringify(profile), 'EX', '2592000']);
    await redis('SET', [`checkers:presence:${user.id}`, '1', 'EX', '120']);
    return reply({
      ok: true,
      registered: Boolean(existing),
      isNew: !existing,
      user: profile
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export default { POST };
