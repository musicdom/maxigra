import { auth, errorResponse, redis, reply } from './_lib.js';

const ticketCountKey = id => `checkers:tournament:prize-battle:tickets:${id}`;
const participantsKey = 'checkers:tournament:prize-battle:participants';

export async function OPTIONS() { return reply({ ok: true }); }
export async function GET(request) {
  try {
    const user = auth(request);
    const [rawTickets, participants] = await Promise.all([
      redis('GET', [ticketCountKey(user.id)]),
      redis('SCARD', [participantsKey])
    ]);
    return reply({ ok: true, tickets: Math.max(0, Number(rawTickets) || 0), participants: Math.max(0, Number(participants) || 0) });
  } catch (error) { return errorResponse(error); }
}
