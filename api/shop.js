import { auth, body, errorResponse, redis, reply } from './_lib.js';

const CATALOG = { board_90s:{price:299},board_svo:{price:299},board_max:{price:299},board_orbita:{price:299},board_original:{price:0},master:{price:149},hints:{price:99},starter_pack:{price:599} };
const BOARD_IDS = ['board_90s','board_svo','board_max','board_orbita','board_original'];
const DEFAULT_BOARD = 'board_original';
function inventoryKey(id) { return `checkers:shop:user:${id}`; }
function coinsKey(id) { return `checkers:coins:${id}`; }
const orderKey = id => `checkers:shop:order:${id}`;
const userOrdersKey = id => `checkers:shop:orders:user:${id}`;
function normalizeState(state, coinsRaw) { const owned=Array.isArray(state.owned)?state.owned.filter(itemId=>CATALOG[itemId]):[]; if(!owned.includes('board_original'))owned.push('board_original'); return {owned,selectedBoard:BOARD_IDS.includes(state.selectedBoard)&&owned.includes(state.selectedBoard)?state.selectedBoard:DEFAULT_BOARD,selectedPieces:state.selectedPieces||'default',ai:Math.max(1,Math.min(4,Number(state.ai)||1)),hints:Math.max(0,Number(state.hints)||0),coins:Math.max(0,Number(coinsRaw)||0),resetAt:Number(state.resetAt)||0}; }
async function readState(id) { const [raw,coinsRaw]=await Promise.all([redis('GET',[inventoryKey(id)]),redis('GET',[coinsKey(id)])]); let state={}; try{state=raw?JSON.parse(raw):{}}catch{} return normalizeState(state,coinsRaw); }
async function saveState(id,state) { await redis('SET',[inventoryKey(id),JSON.stringify({owned:state.owned,selectedBoard:state.selectedBoard,selectedPieces:state.selectedPieces,ai:state.ai,hints:state.hints,resetAt:Number(state.resetAt)||0})]); }

async function reconcile(userId) {
  const raw = await redis('GET', [inventoryKey(userId)]);
  let state = {};
  try { state = raw ? JSON.parse(raw) : {}; } catch {}
  state.owned = Array.isArray(state.owned) ? state.owned.filter(Boolean) : [];
  state.selectedBoard = state.selectedBoard || 'board_original';
  state.selectedPieces = state.selectedPieces || 'default';
  state.ai = Math.max(1, Math.min(4, Number(state.ai) || 1));
  state.hints = Math.max(0, Number(state.hints) || 0);
  state.resetAt = Number(state.resetAt) || 0;

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
      if (state.resetAt && Number(order.paidAt || 0) <= state.resetAt) continue;
      const itemId = String(order.itemId || '');
      if (!BOARD_IDS.includes(itemId) || state.owned.includes(itemId)) continue;
      state.owned.push(itemId);
      changed = true;
    } catch {}
  }

  if (!BOARD_IDS.includes(state.selectedBoard) || !state.owned.includes(state.selectedBoard)) state.selectedBoard = 'board_original';
  if (changed || !raw) {
    await redis('SET', [inventoryKey(userId), JSON.stringify({
      owned:state.owned, selectedBoard:state.selectedBoard, selectedPieces:state.selectedPieces,
      ai:state.ai, hints:state.hints, resetAt:state.resetAt
    }), 'EX', '2592000']);
  }
  return state;
}

async function paymentStatus(request) {
  const id = String(new URL(request.url).searchParams.get('id') || '');
  if (!/^mx_[a-f0-9]{32}$/.test(id)) return reply({ ok:false, error:'ORDER_NOT_FOUND' }, 400);
  const raw = await redis('GET', [orderKey(id)]);
  if (!raw) return reply({ ok:false, error:'ORDER_NOT_FOUND' }, 404);
  const order = JSON.parse(raw);
  if (order.status === 'paid') await reconcile(String(order.userId));
  if (order.status === 'pending' && Number(order.expiresAt || 0) > 0 && Date.now() > Number(order.expiresAt)) {
    order.status = 'expired'; order.expiredAt = Date.now();
    await redis('SET', [orderKey(id), JSON.stringify(order)]);
  }
  return reply({ ok:true, status:String(order.status || 'pending'), itemId:String(order.itemId || ''), paidAt:order.paidAt || null });
}

export async function OPTIONS(){return reply({ok:true});}
export async function GET(request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get('status') === '1') return await paymentStatus(request);
    const user = auth(request);
    if (url.searchParams.get('tournament') === '1') {
      const ticketCountKey = `checkers:tournament:prize-battle:tickets:${user.id}`;
      const participantKey = `checkers:tournament:prize-battle:participant:${user.id}`;
      const participantsKey = 'checkers:tournament:prize-battle:participants';
      // The ticket count is the source of truth. Participant-list metadata is best-effort:
      // a malformed/legacy Redis set must not break ticket status for every account.
      const rawTickets = await redis('GET', [ticketCountKey]);
      let participantCount = 0, registered = 0, participantRaw = null;
      try { participantCount = await redis('SCARD', [participantsKey]); } catch (error) { console.error('Tournament participant count unavailable:', error.message); }
      try { registered = await redis('SISMEMBER', [participantsKey, String(user.id)]); } catch (error) { console.error('Tournament participant membership unavailable:', error.message); }
      try { participantRaw = await redis('GET', [participantKey]); } catch (error) { console.error('Tournament legacy participant record unavailable:', error.message); }
      let savedTickets = 0;
      try { savedTickets = Number(JSON.parse(participantRaw || '{}').tickets) || 0; } catch {}
      const isRegistered = registered === 1 || registered === '1' || registered === true;
      // An existing numeric key is authoritative, including 0 after admin revocation.
      // Legacy participant records are consulted only when the canonical key is absent.
      const tickets = rawTickets !== null && rawTickets !== undefined
        ? Math.max(0, Math.floor(Number(rawTickets) || 0))
        : Math.max(0, Math.floor(savedTickets), isRegistered ? 1 : 0);
      return reply({ ok: true, tickets, participants: Math.max(0, Number(participantCount) || 0) });
    }
    return reply({ok:true,state:await readState(user.id)});
  } catch(error) { return errorResponse(error); }
}
export async function POST(request) {
  try {
    if (new URL(request.url).searchParams.get('status') === '1') {
      const user = auth(request);
      return reply({ ok:true, state:await reconcile(user.id) });
    }
    const user=auth(request); const payload=await body(request); const state=await readState(user.id); const id=String(payload?.id||''); const action=String(payload?.action||'');
    if(action==='reset-test'){if(String(user.id)!=='163701646')return reply({ok:false,error:'FORBIDDEN'},403);state.owned=['board_original'];state.selectedBoard=DEFAULT_BOARD;state.resetAt=Date.now();await saveState(user.id,state);return reply({ok:true,state,reset:true});}
    if(action==='select'){if(id!=='default'&&!state.owned.includes(id))return reply({ok:false,error:'ITEM_NOT_OWNED'},403);if(BOARD_IDS.includes(id))state.selectedBoard=id;else if(id==='gold')state.selectedPieces=id;else if(id==='master')state.ai=4;else if(id==='default')state.selectedBoard=DEFAULT_BOARD;await saveState(user.id,state);return reply({ok:true,state});}
    if(action==='purchase'){const item=CATALOG[id];if(!item)return reply({ok:false,error:'ITEM_NOT_FOUND'},404);if(state.owned.includes(id))return reply({ok:false,error:'ITEM_ALREADY_OWNED'},409);if(item.price===0){state.owned.push(id);await saveState(user.id,state);return reply({ok:true,state});}return reply({ok:false,error:'PAYMENT_REQUIRED',price:item.price},402);}
    return reply({ok:false,error:'BAD_ACTION'},400);
  } catch(error) { return errorResponse(error); }
}
export default {GET,POST,OPTIONS};
