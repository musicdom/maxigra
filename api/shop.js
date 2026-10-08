import { auth, body, errorResponse, redis, reply } from './_lib.js';

const CATALOG = {
  board_90s: { price: 999 },
  board_svo: { price: 999 },
  board_max: { price: 999 },
  board_orbita: { price: 999 },
  board_original: { price: 0 },
  master: { price: 149 },
  hints: { price: 99 },
  starter_pack: { price: 599 }
};
const BOARD_IDS = ['board_90s','board_svo','board_max','board_orbita','board_original'];
const DEFAULT_BOARD = 'board_original';

function inventoryKey(id) { return `checkers:shop:user:${id}`; }
function coinsKey(id) { return `checkers:coins:${id}`; }

function normalizeState(state, coinsRaw) {
  const owned = Array.isArray(state.owned) ? state.owned.filter(itemId => CATALOG[itemId]) : [];
  if (!owned.includes('board_original')) owned.push('board_original');

  return {
    owned,
    selectedBoard: BOARD_IDS.includes(state.selectedBoard) && owned.includes(state.selectedBoard) ? state.selectedBoard : DEFAULT_BOARD,
    selectedPieces: state.selectedPieces || 'default',
    ai: Math.max(1, Math.min(4, Number(state.ai) || 1)),
    hints: Math.max(0, Number(state.hints) || 0),
    coins: Math.max(0, Number(coinsRaw) || 0),
    resetAt: Number(state.resetAt) || 0
  };
}

async function readState(id) {
  const [raw, coinsRaw] = await Promise.all([
    redis('GET', [inventoryKey(id)]),
    redis('GET', [coinsKey(id)])
  ]);
  let state = {};
  try { state = raw ? JSON.parse(raw) : {}; } catch {}
  return normalizeState(state, coinsRaw);
}

async function saveState(id, state) {
  await redis('SET', [inventoryKey(id), JSON.stringify({
    owned: state.owned,
    selectedBoard: state.selectedBoard,
    selectedPieces: state.selectedPieces,
    ai: state.ai,
    hints: state.hints,
    resetAt: Number(state.resetAt) || 0
  })]);
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

    if (action === 'reset-test') {
      if (String(user.id) !== '163701646') return reply({ ok: false, error: 'FORBIDDEN' }, 403);
      state.owned = ['board_original'];
      state.selectedBoard = DEFAULT_BOARD;
      state.resetAt = Date.now();
      await saveState(user.id, state);
      return reply({ ok: true, state, reset: true });
    }

    if (action === 'select') {
      if (id !== 'default' && !state.owned.includes(id)) {
        return reply({ ok: false, error: 'ITEM_NOT_OWNED' }, 403);
      }
      if (BOARD_IDS.includes(id)) state.selectedBoard = id;
      else if (id === 'gold') state.selectedPieces = id;
      else if (id === 'master') state.ai = 4;
      else if (id === 'default') state.selectedBoard = DEFAULT_BOARD;
      await saveState(user.id, state);
      return reply({ ok: true, state });
    }

    if (action === 'purchase') {
      const item = CATALOG[id];
      if (!item) return reply({ ok: false, error: 'ITEM_NOT_FOUND' }, 404);
      if (state.owned.includes(id)) return reply({ ok: false, error: 'ITEM_ALREADY_OWNED' }, 409);
      if (item.price === 0) {
        state.owned.push(id);
        await saveState(user.id, state);
        return reply({ ok: true, state });
      }
      return reply({ ok: false, error: 'PAYMENT_REQUIRED', price: item.price }, 402);
    }

    return reply({ ok: false, error: 'BAD_ACTION' }, 400);
  } catch (error) { return errorResponse(error); }
}

export default { GET, POST };
