import crypto from 'node:crypto';
import { auth, body, errorResponse, redis, reply } from '../_lib.js';

const CATALOG = {
  board_90s: 79, board_svo: 99, board_premium: 199, board_light: 49,
  board_darkwood: 59, board_lightwood: 0, master: 149, hints: 39
};
const ORDER_TTL = 86400;
const RECEIVER = String(process.env.YOOMONEY_RECEIVER || '').trim();
const orderKey = id => `checkers:shop:order:${id}`;
const userOrdersKey = id => `checkers:shop:orders:user:${id}`;
const inventoryKey = id => `checkers:shop:user:${id}`;

// Let YooMoney choose the available payment method. Forcing PC/AC can
// produce an unavailable-transfer page when that method is restricted.
function paymentUrl(orderId, price) {
  if (!RECEIVER || price <= 0) return '';
  const params = new URLSearchParams({
    receiver: RECEIVER,
    'quickpay-form': 'button',
    targets: `MaxИгра заказ ${orderId}`,
    sum: price.toFixed(2),
    label: orderId
  });
  return `https://yoomoney.ru/quickpay/confirm?${params.toString()}`;
}
function paymentOptions(orderId, price) {
  const url = paymentUrl(orderId, price);
  return { wallet: url, card: url };
}
async function alreadyOwned(userId, itemId) {
  if (itemId === 'hints') return false;
  const raw = await redis('GET', [inventoryKey(userId)]);
  if (!raw) return itemId === 'board_lightwood';
  try {
    const state = JSON.parse(raw);
    return itemId === 'board_lightwood' || (Array.isArray(state.owned) && state.owned.includes(itemId));
  } catch { return itemId === 'board_lightwood'; }
}
export async function POST(request) {
  try {
    const user = auth(request);
    const payload = await body(request);
    const itemId = String(payload?.id || '');
    const price = CATALOG[itemId];
    if (price == null) return reply({ ok: false, error: 'ITEM_NOT_FOUND' }, 404);
    if (price <= 0) return reply({ ok: false, error: 'ITEM_ALREADY_OWNED' }, 409);
    if (!RECEIVER) return reply({ ok: false, error: 'PAYMENT_NOT_CONFIGURED' }, 503);
    if (await alreadyOwned(user.id, itemId)) return reply({ ok: false, error: 'ITEM_ALREADY_OWNED' }, 409);
    const orderId = `mx_${crypto.randomUUID().replaceAll('-', '')}`;
    const order = { id: orderId, userId: user.id, itemId, price, currency: 'RUB', status: 'pending', createdAt: Date.now() };
    const created = await redis('SET', [orderKey(orderId), JSON.stringify(order), 'EX', String(ORDER_TTL), 'NX']);
    if (created !== 'OK') throw new Error('ORDER_CREATE_FAILED');
    await redis('SADD', [userOrdersKey(user.id), orderId]);
    await redis('EXPIRE', [userOrdersKey(user.id), String(ORDER_TTL)]);
    return reply({ ok: true, order: { id: orderId, itemId, price, currency: 'RUB', status: 'pending', paymentUrl: paymentUrl(orderId, price), paymentOptions: paymentOptions(orderId, price) } }, 201);
  } catch (error) { return errorResponse(error); }
}
export async function GET(request) {
  try {
    const user = auth(request);
    const url = new URL(request.url);
    const orderId = String(url.searchParams.get('id') || '');
    if (!orderId || !/^mx_[a-f0-9]{32}$/.test(orderId)) return reply({ ok: false, error: 'ORDER_NOT_FOUND' }, 404);
    const raw = await redis('GET', [orderKey(orderId)]);
    if (!raw) return reply({ ok: false, error: 'ORDER_NOT_FOUND' }, 404);
    const order = JSON.parse(raw);
    if (String(order.userId) !== String(user.id)) return reply({ ok: false, error: 'ORDER_NOT_FOUND' }, 404);
    return reply({ ok: true, order: { id: order.id, itemId: order.itemId, price: order.price, currency: order.currency, status: order.status, createdAt: order.createdAt, paymentUrl: order.status === 'pending' ? paymentUrl(order.id, order.price) : '', paymentOptions: order.status === 'pending' ? paymentOptions(order.id, order.price) : { wallet: '', card: '' } } });
  } catch (error) { return errorResponse(error); }
}
export default { GET, POST };
