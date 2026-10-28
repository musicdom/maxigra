import crypto from 'node:crypto';
import { redis, reply } from '../_lib.js';
import { BOT_URL, linkKeyboard, sendMaxMessage, supportUrl } from '../_max-bot.js';

const SECRET = String(process.env.YOOMONEY_NOTIFICATION_SECRET || '').trim();
const orderKey = id => `checkers:shop:order:${id}`;
const inventoryKey = id => `checkers:shop:user:${id}`;
const operationKey = id => `checkers:shop:payment:${id}`;
const lockKey = id => `checkers:shop:payment-lock:${id}`;
const grantKey = id => `checkers:shop:grant:${id}`;
const ticketCountKey = id => `checkers:tournament:prize-battle:tickets:${id}`;
const notifyLockKey = id => `checkers:shop:notify-lock:${id}`;
const ITEM_TITLES = { board_90s: 'СВО', board_svo: '90-е', board_max: 'MAX', board_orbita: 'ОРБИТА', board_original: 'Оригинал', master: 'Гроссмейстер', hints: '50 подсказок', starter_pack: 'Набор новичка', tournament_ticket: 'Билет на турнир «Битва за призы»' };

async function notifyPaid(order) {
  if (order.notificationSentAt) return order;
  const lock = await redis('SET', [notifyLockKey(order.id), '1', 'NX', 'EX', '60']);
  if (lock !== 'OK') return order;
  try {
    const title = ITEM_TITLES[String(order.itemId)] || 'покупка';
    const isBoard = String(order.itemId).startsWith('board_');
    const text = String(order.itemId) === 'tournament_ticket'
      ? `🏆 Оплата прошла успешно!\n\nБилет на турнир «Битва за призы» за ${Number(order.price).toFixed(0)} ₽ подтверждён. Вы зарегистрированы на турнир под своим аккаунтом MAX.\n\nУсловия и сроки проведения будут опубликованы организатором отдельно. Если возникли вопросы, нажмите «Техническая поддержка».`
      : isBoard
        ? `✅ Оплата прошла успешно!\n\nДоска «${title}» за ${Number(order.price).toFixed(0)} ₽ закреплена за вашим аккаунтом MAX. Она уже доступна в профиле игры «Шашки».\n\nЕсли возникли проблемы, нажмите «Техническая поддержка».`
        : `✅ Оплата прошла успешно!\n\nПокупка «${title}» за ${Number(order.price).toFixed(0)} ₽ закреплена за вашим аккаунтом MAX.\n\nЕсли возникли проблемы, нажмите «Техническая поддержка».`;
    await sendMaxMessage(order.userId, {
      text,
      attachments: [linkKeyboard([
        [{ text: 'Открыть игру', url: BOT_URL }],
        [{ text: 'Техническая поддержка', url: supportUrl() }]
      ])]
    });
    const updated = { ...order, notificationSentAt: Date.now() };
    await redis('SET', [orderKey(order.id), JSON.stringify(updated)]);
    return updated;
  } catch (error) {
    console.error('MAX payment confirmation failed', { orderId: order.id, error: error.message });
    return order;
  } finally {
    await redis('DEL', [notifyLockKey(order.id)]).catch(() => {});
  }
}

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
  if (itemId === 'tournament_ticket') {
    const userId=String(order.userId);
    const current=Math.max(0,Number(await redis('GET',[ticketCountKey(userId)]))||0);
    const tickets=current+1;
    const participant = { userId, orderId: String(order.id), price: Number(order.price), tickets, registeredAt: Date.now(), status: 'registered' };
    await redis('SET',[ticketCountKey(userId),String(tickets)]);
    await redis('SADD', ['checkers:tournament:prize-battle:participants', userId]);
    await redis('SET', [`checkers:tournament:prize-battle:participant:${userId}`, JSON.stringify(participant)]);
    return { tournamentTicket: true };
  }
  if (itemId === 'hints') {
    state.hints = Math.max(0, Number(state.hints) || 0) + 50;
  } else if (itemId === 'starter_pack') {
    state.hints = Math.max(0, Number(state.hints) || 0) + 25;
    if (!owned.includes('board_svo')) owned.push('board_svo');
    if (!owned.includes('board_90s')) owned.push('board_90s');
    if (!owned.includes('starter_pack')) owned.push('starter_pack');
  } else if (!owned.includes(itemId)) {
    owned.push(itemId);
  }

  state.owned = owned;
  state.selectedBoard = state.selectedBoard || 'board_original';
  state.selectedPieces = state.selectedPieces || 'default';
  state.ai = Math.max(1, Math.min(4, Number(state.ai) || 1));
  state.hints = Math.max(0, Number(state.hints) || 0);

  await redis('SET', [inventoryKey(order.userId), JSON.stringify(state)]);
  return state;
}

export async function POST(request) {
  if (!SECRET) return reply({ ok: false, error: 'PAYMENT_WEBHOOK_NOT_CONFIGURED' }, 503);

  let form;
  try { form = await request.formData(); }
  catch { return reply({ ok: false, error: 'BAD_NOTIFICATION' }, 400); }

  if (!validSign(form)) return reply({ ok: false, error: 'INVALID_NOTIFICATION_SIGNATURE' }, 401);

  const notificationType = formValue(form, 'notification_type');
  const operationId = formValue(form, 'operation_id');
  const orderId = formValue(form, 'label');
  const currency = formValue(form, 'currency');
  const unaccepted = formValue(form, 'unaccepted').toLowerCase();
  const codepro = formValue(form, 'codepro').toLowerCase();
  const amount = Number(formValue(form, 'amount'));
  const withdrawAmount = Number(formValue(form, 'withdraw_amount'));

  if (!['p2p-incoming', 'card-incoming'].includes(notificationType)) return reply({ ok: false, error: 'UNSUPPORTED_NOTIFICATION' }, 400);
  if (!operationId || !/^mx_[a-f0-9]{32}$/.test(orderId)) return reply({ ok: false, error: 'INVALID_PAYMENT_REFERENCE' }, 400);
  if (currency !== '643' || unaccepted === 'true' || codepro === 'true' || !Number.isFinite(amount) || amount <= 0) return reply({ ok: false, error: 'INVALID_PAYMENT' }, 400);
  if (!Number.isFinite(withdrawAmount) || withdrawAmount < 0) return reply({ ok: false, error: 'INVALID_PAYMENT' }, 400);

  const orderRaw = await redis('GET', [orderKey(orderId)]);
  if (!orderRaw) return reply({ ok: false, error: 'ORDER_NOT_FOUND' }, 404);
  let order;
  try { order = JSON.parse(orderRaw); } catch { return reply({ ok: false, error: 'ORDER_INVALID' }, 500); }

  if (String(order.currency) !== 'RUB' || Number(order.price) <= 0) return reply({ ok: false, error: 'ORDER_INVALID' }, 400);
  if (order.status === 'paid') { await notifyPaid(order); return reply({ ok: true, status: 'paid' }); }
  // YooMoney can deduct a commission from the credited amount. `amount` is what
  // reaches the wallet, while `withdraw_amount` is what the payer actually pays.
  // The order must therefore be checked against withdraw_amount, not amount.
  if (Number(withdrawAmount) + 0.000001 < Number(order.price)) return reply({ ok: false, error: 'PAYMENT_AMOUNT_TOO_LOW' }, 400);

  const lock = await redis('SET', [lockKey(operationId), '1', 'NX', 'EX', '120']);
  if (lock !== 'OK') return reply({ ok: true, status: 'processing' });

  try {
    const duplicate = await redis('SET', [operationKey(operationId), orderId, 'NX']);
    if (duplicate !== 'OK') {
      const currentRaw = await redis('GET', [orderKey(orderId)]);
      const current = currentRaw ? JSON.parse(currentRaw) : null;
      return reply({ ok: true, status: current?.status === 'paid' ? 'paid' : 'processing' });
    }

    const latestRaw = await redis('GET', [orderKey(orderId)]);
    const latest = latestRaw ? JSON.parse(latestRaw) : order;
    if (latest.status === 'paid') return reply({ ok: true, status: 'paid' });
    if (Number(latest.price) !== Number(order.price) || String(latest.userId) !== String(order.userId) || String(latest.itemId) !== String(order.itemId)) return reply({ ok: false, error: 'ORDER_CHANGED' }, 409);

    const grantMarker = await redis('SET', [grantKey(orderId), 'processing', 'NX', 'EX', '300']);
    if (grantMarker !== 'OK') return reply({ ok: true, status: 'processing' });

    try {
      await grant(latest);
      const paidOrder = {
        ...latest,
        status: 'paid',
        operationId,
        paidAmount: amount,
        withdrawAmount,
        paidAt: Date.now()
      };
      await redis('SET', [orderKey(orderId), JSON.stringify(paidOrder)]);
      await redis('SET', [grantKey(orderId), 'done']);
      await notifyPaid(paidOrder);
      return reply({ ok: true, status: 'paid' });
    } catch (error) {
      await redis('DEL', [grantKey(orderId)]).catch(() => {});
      throw error;
    }
  } finally {
    await redis('DEL', [lockKey(operationId)]).catch(() => {});
  }
}

export default { POST };
