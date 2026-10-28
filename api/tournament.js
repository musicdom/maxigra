import { auth, errorResponse, redis, reply } from './_lib.js';

const ticketCountKey = id => `checkers:tournament:prize-battle:tickets:${id}`;
const participantKey = id => `checkers:tournament:prize-battle:participant:${id}`;
const participantsKey = 'checkers:tournament:prize-battle:participants';

export async function OPTIONS() { return reply({ ok: true }); }
export async function GET(request) {
  try {
    const user = auth(request);
    const [rawTickets, participants, registered, participantRaw] = await Promise.all([
      redis('GET', [ticketCountKey(user.id)]),
      redis('SCARD', [participantsKey]),
      redis('SISMEMBER', [participantsKey, String(user.id)]),
      redis('GET', [participantKey(user.id)])
    ]);
    let savedTickets = 0;
    try { savedTickets = Number(JSON.parse(participantRaw || '{}').tickets) || 0; } catch {}
    const tickets = Math.max(0, Number(rawTickets) || 0, savedTickets, registered === 1 || registered === '1' || registered === true ? 1 : 0);
    return reply({ ok: true, tickets, participants: Math.max(0, Number(participants) || 0) });
  } catch (error) { return errorResponse(error); }
}
