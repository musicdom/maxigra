import crypto from 'node:crypto';
import { redis, reply } from '../_lib.js';

const SECRET = String(process.env.YOOMONEY_NOTIFICATION_SECRET || '').trim();
const orderKey = id => `checkers:shop:order:${id}`;
const inventoryKey = id => `checkers:shop:user:${id}`;
const operationKey = id => `checkers:shop:payment:${id}`;
const lockKey = id => `checkers:shop:payment-lock:${id}`;

function formValue(form, key) {
  const value = form.get(key);
  return value == null ? '' : String(value);
}

function signPayload(form) {
  return [...form.entries()]
    .filter(([key]) => key !== 'sign')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

function validSign(form) {
  if (!SECRET) return false;
  const received = formValue(form, 'sign').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(received)) return false;
  const calculated = crypto.createHmac('sha256', SECRET).update(signPayload(form)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(received, 'hex'));
}

async function grant(order) {
  const raw = await redis('GET', [inventoryKey(order.userId)]);
  let state = {};
  try { state = raw ? JSON.parse(raw) : {}; } catch {}

  const owned = Array.isArray(state.owned) ? state.owned.filter(Boolean) : [];
  const itemId = String(order.itemId);
  if (itemId === 'hints') {
    state.hints = Math.max(0, Number(state.hints) || 0) + 50;
  } else if (!owned.includes(itemId)) {
    owned.push(itemId);
  }

  state.owned = owned;
  state.selectedBoard = state.selectedBoard || 'default';
  state.selectedPieces = state.selectedPieces || 'default';
  state.ai = Math.max(1, Math.min(4, Number(state.ai) || 1));
  state.hints = Math.max(0, Number(state.hints) || 0);

  await redis('SET', [inventoryKey(order.userId), JSON.stringify(state), 'EX', '2592000']);
  return state;
}

export async function POST(request) {
  if (!SECRET) return reply({ ok: false, error: 'PAYMENT_WEBHOOK_NOT_CONFIGURED' }, 503);

  let form;
  try {
    form = await request.formData();
  } catch {
    return reply({ ok: false, error: 'BAD_NOTIFICATION' }, 400);
  }

  if (!validSign(form)) return reply({ ok: false, error: 'INVALID_NOTIFICATION_SIGNATURE' }, 401);

  const notificationType = formValue(form, 'notification_type');
  const operationId = formValue(form, 'operation_id');
  const orderId = formValue(form, 'label');
  const currency = formValue(form, 'currency');
  const unaccepted = formValue(form, 'unaccepted');
  const codepro = formValue(form, 'codepro');
  const paid = Number(formValue(form, 'withdraw_amount') || formValue(form, 'amount'));

  if (!['p2p-incoming', 'card-incoming'].includes(notificationType)) return reply({ ok: false, error: 'UNSUPPORTED_NOTIFICATION' }, 400);
  if (!operationId || !/^mx_[a-f0-9]{32}$/.test(orderId)) return reply({ ok: false, error: 'INVALID_PAYMENT_REFERENCE' }, 400);
  if (currency !== '643' || unaccepted === 'true' || codepro === 'true' || !Number.isFinite(paid) || paid <= 0) return reply({ ok: false, error: 'INVALID_PAYMENT' }, 400);

  const orderRaw = await redis('GET', [orderKey(orderId)]);
  if (!orderRaw) return reply({ ok: false, error: 'ORDER_NOT_FOUND' }, 404);
  let order;
  try { order = JSON.parse(orderRaw); } catch { return reply({ ok: false, error: 'ORDER_INVALID' }, 500); }

  if (order.status === 'paid') return reply({ ok: true, status: 'paid' });
  if (Number(paid) < Number(order.price)) return reply({ ok: false, error: 'PAYMENT_AMOUNT_TOO_LOW' }, 400);

  const lock = await redis('SET', [lockKey(operationId), '1', 'NX', 'EX', '120']);
  if (lock !== 'OK') return reply({ ok: true, status: 'processing' });

  try {
    const duplicate = await redis('SET', [operationKey(operationId), orderId, 'NX', 'EX', '2592000']);
    if (duplicate !== 'OK') return reply({ ok: true, status: 'paid' });

    const latestRaw = await redis('GET', [orderKey(orderId)]);
    const latest = latestRaw ? JSON.parse(latestRaw) : order;
    if (latest.status === 'paid') return reply({ ok: true, status: 'paid' });

    await grant(latest);
    const paidOrder = {
      ...latest,
      status: 'paid',
      operationId,
      paidAmount: paid,
      paidAt: Date.now()
    };
    await redis('SET', [orderKey(orderId), JSON.stringify(paidOrder), 'EX', '2592000']);
    return reply({ ok: true, status: 'paid' });
  } finally {
    await redis('DEL', [lockKey(operationId)]).catch(() => {});
  }
}

export default { POST };
