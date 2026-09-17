import { auth, errorResponse, redis, reply } from '../_lib.js';

const BOARD_IDS = new Set(['board_90s','board_svo','board_premium','board_premiumwood','board_light','board_darkwood','board_lightwood']);
const INVENTORY_TTL = '2592000';
const inventoryKey = id => `checkers:shop:user:${id}`;
const userOrdersKey = id => `checkers:shop:orders:user:${id}`;
const orderKey = id => `checkers:shop:order:${id}`;

async function saveInventory(userId, state) {
  await redis('SET', [inventoryKey(userId), JSON.stringify(state), 'EX', INVENTORY_TTL]);
}

export async function POST(request) {
  try {
    const user = auth(request);
    const rawState = await redis('GET', [inventoryKey(user.id)]);
    let state = {};
    try { state = rawState ? JSON.parse(rawState) : {}; } catch {}
    state.owned = Array.isArray(state.owned) ? state.owned.filter(Boolean) : [];
    if (!state.owned.includes('board_lightwood')) state.owned.push('board_lightwood');
    state.selectedBoard = state.selectedBoard || 'board_lightwood';
    state.selectedPieces = state.selectedPieces || 'default';
    state.ai = Math.max(1, Math.min(4, Number(state.ai) || 1));
    state.hints = Math.max(0, Number(state.hints) || 0);

    let orderIds = [];
    try {
      const result = await redis('SMEMBERS', [userOrdersKey(user.id)]);
      orderIds = Array.isArray(result) ? result : [];
    } catch {}

    const recovered = [];
    for (const orderId of orderIds.slice(-100)) {
      try {
        const raw = await redis('GET', [orderKey(String(orderId))]);
        if (!raw) continue;
        const order = JSON.parse(raw);
        if (String(order.userId) !== String(user.id) || order.status !== 'paid') continue;
        const itemId = String(order.itemId || '');
        if (!BOARD_IDS.has(itemId) || state.owned.includes(itemId)) continue;
        state.owned.push(itemId);
        recovered.push(itemId);
      } catch {}
    }

    if (!BOARD_IDS.has(state.selectedBoard) || !state.owned.includes(state.selectedBoard)) state.selectedBoard = 'board_lightwood';
    await saveInventory(user.id, state);
    return reply({ ok: true, recovered, state });
  } catch (error) { return errorResponse(error); }
}

export default { POST };
