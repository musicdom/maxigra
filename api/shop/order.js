import crypto from 'node:crypto';
import { auth, body, errorResponse, redis, reply } from '../_lib.js';
import { BOT_URL, linkKeyboard, sendMaxMessage, supportUrl } from '../_max-bot.js';

const CATALOG = {
  board_90s: { price: 299 },
  board_svo: { price: 299 },
  board_max: { price: 299 },
  board_orbita: { price: 299 },
  board_original: { price: 0 },
  master: { price: 149 },
  hints: { price: 99 },
  starter_pack: { price: 599 }
};
const BOARD_MESSAGES = {
  board_90s: { title: 'СВО', image: 'https://musicdom.github.io/maxigra/assets/boards/IMG_4486.jpeg' },
  board_svo: { title: '90-е', image: 'https://musicdom.github.io/maxigra/assets/boards/IMG_4487.jpeg' },
  board_max: { title: 'MAX', image: 'https://musicdom.github.io/maxigra/assets/boards/IMG_4586.jpeg' },
  board_orbita: { title: 'ОРБИТА', image: 'https://musicdom.github.io/maxigra/assets/boards/IMG_4587.jpeg' }
};
const ORDER_TTL = 86400;
const RECEIVER = String(process.env.YOOMONEY_RECEIVER || '').trim();
const PAYMENT_PAGE = String(process.env.YOOMONEY_PAYMENT_PAGE_URL || 'https://maxigra.vercel.app/api/shop/pay').trim();
const orderKey = id => `checkers:shop:order:${id}`;
const userOrdersKey = id => `checkers:shop:orders:user:${id}`;
const inventoryKey = id => `checkers:shop:user:${id}`;

function paymentUrl(orderId, price, base = PAYMENT_PAGE) {
  if (!RECEIVER || price <= 0) return '';
  return `${base}?id=${encodeURIComponent(orderId)}`;
}
function paymentOptions(orderId, price, base = PAYMENT_PAGE) {
  const url = paymentUrl(orderId, price, base);
  return { wallet: url, card: url };
}
async function alreadyOwned(userId, itemId) {
  if (itemId === 'hints') return false;
  const raw = await redis('GET', [inventoryKey(userId)]);
  if (!raw) return false;
  try {
    const state = JSON.parse(raw);
    return Array.isArray(state.owned) && state.owned.includes(itemId);
  } catch { return false; }
}
async function sendBoardOrder(userId, order, board, payUrl) {
  const support = supportUrl();
  await sendMaxMessage(userId, {
    text: `🎲 Покупка доски «${board.title}»

Стоимость: ${order.price} ₽

После успешной оплаты доска будет автоматически закреплена за вашим аккаунтом MAX и появится в профиле игры «Шашки».

Если возникнут вопросы, нажмите «Техническая поддержка».`,
    attachments: [
      { type: 'image', payload: { url: board.image } },
      linkKeyboard([
        [{ text: `Оплатить ${order.price} ₽`, url: payUrl }],
        [{ text: 'Техническая поддержка', url: support }]
      ])
    ]
  });
}

export async function POST(request) {
  try {
    const user = auth(request);
    const payload = await body(request);
    const itemId = String(payload?.id || '');
    const price = CATALOG[itemId]?.price;
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

    const paymentPage = `${new URL(request.url).origin}/api/shop/pay`;
    const payUrl = paymentUrl(orderId, price, paymentPage);
    const board = BOARD_MESSAGES[itemId];
    if (board) {
      await sendBoardOrder(user.id, order, board, payUrl);
      return reply({
        ok: true,
        order: { id: orderId, itemId, price, currency: 'RUB', status: 'pending', paymentUrl: payUrl, paymentOptions: paymentOptions(orderId, price, paymentPage), sentToBot: true }
      }, 201);
    }

    return reply({
      ok: true,
      order: { id: orderId, itemId, price, currency: 'RUB', status: 'pending', paymentUrl: payUrl, paymentOptions: paymentOptions(orderId, price, paymentPage), sentToBot: false }
    }, 201);
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
    return reply({ ok: true, order: { id: order.id, itemId: order.itemId, price: order.price, currency: order.currency, status: order.status, createdAt: order.createdAt, paymentUrl: order.status === 'pending' ? paymentUrl(order.id, order.price, `${new URL(request.url).origin}/api/shop/pay`) : '', paymentOptions: order.status === 'pending' ? paymentOptions(order.id, order.price, `${new URL(request.url).origin}/api/shop/pay`) : { wallet: '', card: '' } } });
  } catch (error) { return errorResponse(error); }
}
export default { POST, GET };
