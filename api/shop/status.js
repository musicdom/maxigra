import { redis, reply } from '../_lib.js';

const orderKey = id => `checkers:shop:order:${id}`;

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

export default { GET };
