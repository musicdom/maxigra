import { auth, errorResponse, redis, reply } from '../_lib.js';

const orderKey = id => `checkers:shop:order:${id}`;
const userOrdersKey = id => `checkers:shop:orders:user:${id}`;
const inventoryKey = id => `checkers:shop:user:${id}`;
const BOARD_IDS = new Set(['board_90s','board_svo','board_premium','board_premiumwood','board_light','board_darkwood','board_lightwood']);

async function reconcile(userId) {
  const raw = await redis('GET', [inventoryKey(userId)]);
  let state = {};
  try { state = raw ? JSON.parse(raw) : {}; } catch {}
  state.owned = Array.isArray(state.owned) ? state.owned.filter(Boolean) : [];
  if (!state.owned.includes('board_lightwood')) state.owned.push('board_lightwood');
  state.selectedBoard = state.selectedBoard || 'board_lightwood';
  state.selectedPieces = state.selectedPieces || 'default';
  state.ai = Math.max(1, Math.min(4, Number(state.ai) || 1));
  state.hints = Math.max(0, Number(state.hints) || 0);

  let orderIds = [];
  try {
    const result = await redis('SMEMBERS', [userOrdersKey(userId)]);
    orderIds = Array.isArray(result) ? result : [];
  } catch {}

  let changed = false;
  for (const orderId of orderIds.slice(-100)) {
    try {
      const orderRaw = await redis('GET', [orderKey(String(orderId))]);
      if (!orderRaw) continue;
      const order = JSON.parse(orderRaw);
      if (String(order.userId) !== String(userId) || order.status !== 'paid') continue;
      const itemId = String(order.itemId || '');
      if (!BOARD_IDS.has(itemId) || state.owned.includes(itemId)) continue;
      state.owned.push(itemId);
      changed = true;
    } catch {}
  }

  if (!BOARD_IDS.has(state.selectedBoard) || !state.owned.includes(state.selectedBoard)) state.selectedBoard = 'board_lightwood';
  if (changed || !raw) {
    await redis('SET', [inventoryKey(userId), JSON.stringify({owned:state.owned,selectedBoard:state.selectedBoard,selectedPieces:state.selectedPieces,ai:state.ai,hints:state.hints}),'EX','2592000']);
  }
  return state;
}

export async function GET(request) {
  try {
    const id = String(new URL(request.url).searchParams.get('id') || '');
    if (!/^mx_[a-f0-9]{32}$/.test(id)) return reply({ ok:false, error:'ORDER_NOT_FOUND' }, 400);
    const raw = await redis('GET', [orderKey(id)]);
    if (!raw) return reply({ ok:false, error:'ORDER_NOT_FOUND' }, 404);
    const order = JSON.parse(raw);
    return reply({ ok:true, status:String(order.status||'pending'), itemId:String(order.itemId||''), paidAt:order.paidAt||null });
  } catch { return reply({ ok:false, error:'PAYMENT_STATUS_ERROR' }, 500); }
}

export async function POST(request) {
  try {
    const user = auth(request);
    const state = await reconcile(user.id);
    return reply({ ok:true, state });
  } catch (error) { return errorResponse(error); }
}

export default { GET, POST };
