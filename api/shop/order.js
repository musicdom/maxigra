import crypto from 'node:crypto';
import { auth, body, errorResponse, redis, reply } from '../_lib.js';

const CATALOG = {
  board_90s: 79,
  board_svo: 99,
  board_premium: 199,
  board_light: 49,
  board_darkwood: 59,
  board_lightwood: 59,
  master: 149,
  hints: 39
};

const ORDER_TTL = 86400;
const orderKey = id => `checkers:shop:order:${id}`;
const userOrdersKey = id => `checkers:shop:orders:user:${id}`;

export async function POST(request) {
  try {
    const user = auth(request);
    const payload = await body(request);
    const itemId = String(payload?.id || '');
    const price = CATALOG[itemId];
    if (!price) return reply({ ok: false, error: 'ITEM_NOT_FOUND' }, 404);

    const orderId = `mx_${crypto.randomUUID().replaceAll('-', '')}`;
    const order = {
      id: orderId,
      userId: user.id,
      itemId,
      price,
      currency: 'RUB',
      status: 'pending',
      createdAt: Date.now()
    };

    const created = await redis('SET', [orderKey(orderId), JSON.stringify(order), 'EX', String(ORDER_TTL), 'NX']);
    if (created !== 'OK') throw new Error('ORDER_CREATE_FAILED');

    await redis('SADD', [userOrdersKey(user.id), orderId]);
    await redis('EXPIRE', [userOrdersKey(user.id), String(ORDER_TTL)]);

    // Payment is deliberately not confirmed here. The item must only be
    // granted by a trusted payment webhook after provider-side verification.
    return reply({ ok: true, order: { id: orderId, itemId, price, currency: 'RUB', status: 'pending' } }, 201);
  } catch (error) {
    return errorResponse(error);
  }
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

    return reply({ ok: true, order: {
      id: order.id,
      itemId: order.itemId,
      price: order.price,
      currency: order.currency,
      status: order.status,
      createdAt: order.createdAt
    }});
  } catch (error) {
    return errorResponse(error);
  }
}

export default { GET, POST };
