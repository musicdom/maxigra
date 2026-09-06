import { auth, body, errorResponse, redis, reply } from './_lib.js';

const CATALOG = {
  premium: { price: 199 },
  wood: { price: 49 },
  neon: { price: 79 },
  marble: { price: 99 },
  gold: { price: 69 },
  master: { price: 149 },
  hints: { price: 39 }
};

function inventoryKey(id) { return `checkers:shop:user:${id}`; }
function coinsKey(id) { return `checkers:coins:${id}`; }

async function readState(id) {
  const [raw, coinsRaw] = await Promise.all([
    redis('GET', [inventoryKey(id)]),
    redis('GET', [coinsKey(id)])
  ]);
  let state = {};
  try { state = raw ? JSON.parse(raw) : {}; } catch {}
  return {
    owned: Array.isArray(state.owned) ? state.owned.filter(id => CATALOG[id]) : [],
    selectedBoard: state.selectedBoard || 'default',
    selectedPieces: state.selectedPieces || 'default',
    ai: Math.max(1, Math.min(4, Number(state.ai) || 1)),
    hints: Math.max(0, Number(state.hints) || 0),
    coins: Math.max(0, Number(coinsRaw) || 0)
  };
}

async function saveState(id, state) {
  await redis('SET', [inventoryKey(id), JSON.stringify({
    owned: state.owned,
    selectedBoard: state.selectedBoard,
    selectedPieces: state.selectedPieces,
    ai: state.ai,
    hints: state.hints
  }), 'EX', '2592000']);
}

export async function GET(request) {
  try {
    const user = auth(request);
    return reply({ ok: true, state: await readState(user.id) });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request) {
  try {
    const user = auth(request);
    const payload = await body(request);
    const state = await readState(user.id);
    const id = String(payload?.id || '');
    const action = String(payload?.action || '');

    if (action === 'select') {
      if (id !== 'default' && id !== 'premium' && !state.owned.includes(id)) {
        return reply({ ok: false, error: 'ITEM_NOT_OWNED' }, 403);
      }
      if (['wood', 'neon', 'marble'].includes(id)) state.selectedBoard = id;
      else if (id === 'gold') state.selectedPieces = id;
      else if (id === 'premium') { state.selectedBoard = 'default'; state.selectedPieces = 'gold'; }
      else if (id === 'master') state.ai = 4;
      else if (id === 'default') state.selectedBoard = 'default';
      await saveState(user.id, state);
      return reply({ ok: true, state });
    }

    if (action === 'purchase') {
      const item = CATALOG[id];
      if (!item) return reply({ ok: false, error: 'ITEM_NOT_FOUND' }, 404);
      if (state.owned.includes(id)) return reply({ ok: false, error: 'ITEM_ALREADY_OWNED' }, 409);
      // Do not trust the browser for payment or balance. Real purchases must be
      // credited by a verified payment webhook before this endpoint can grant an item.
      return reply({ ok: false, error: 'PAYMENT_REQUIRED', price: item.price }, 402);
    }

    return reply({ ok: false, error: 'BAD_ACTION' }, 400);
  } catch (error) { return errorResponse(error); }
}

export default { GET, POST };
