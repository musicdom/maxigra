import { redis, reply } from '../_lib.js';

const orderKey = id => `checkers:shop:order:${id}`;
const MINI_APP_URL = String(process.env.MAX_MINI_APP_URL || 'https://musicdom.github.io/maxigra/').trim();
const MAX_APP_URL = String(process.env.MAX_MINI_APP_MAX_URL || '').trim();

function esc(value) {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const id = String(url.searchParams.get('id') || '');
    if (!/^mx_[a-f0-9]{32}$/.test(id)) return new Response('Некорректный заказ.', { status: 400 });
    const raw = await redis('GET', [orderKey(id)]);
    if (!raw) return new Response('Заказ не найден или срок его оплаты истёк.', { status: 404 });
    const order = JSON.parse(raw);
    const item = String(order.itemId || '');
    const maxButton = MAX_APP_URL ? `<a class="btn primary" href="${esc(MAX_APP_URL)}">Открыть игру в MAX</a>` : '';
    return new Response(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Максигра — оплата</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#f5faff;color:#172536;font:16px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:grid;place-items:center;padding:20px}.box{width:min(440px,100%);background:#fff;border:1px solid #e5f3ff;border-radius:26px;padding:30px 24px;text-align:center;box-shadow:0 18px 60px rgba(23,37,54,.1)}.ok{width:66px;height:66px;margin:0 auto 18px;border-radius:50%;display:grid;place-items:center;background:#eaf8f1;color:#20a866;font-size:32px;font-weight:800}.brand{font-size:12px;font-weight:800;letter-spacing:.1em;color:#318bea}.title{font-size:27px;margin:8px 0}.sub{color:#647587;line-height:1.5;margin:0 auto 24px}.order{font-size:12px;color:#8a98a6;margin-bottom:22px;word-break:break-all}.btn{display:block;width:100%;padding:14px 16px;border-radius:15px;text-decoration:none;font-weight:750;margin-top:10px}.primary{background:#318bea;color:#fff}.secondary{background:#eef7ff;color:#1871c9}.hint{font-size:12px;color:#8a98a6;margin-top:18px;line-height:1.45}</style></head><body><main class="box"><div class="ok">✓</div><div class="brand">МАКСИГРА</div><h1 class="title">Платёж прошёл успешно</h1><p class="sub">Покупка подтверждена ЮMoney. Доска будет привязана к вашему аккаунту MAX автоматически через уведомление платежей.</p><div class="order">Заказ ${esc(id)}</div>${maxButton}<a class="btn secondary" href="${esc(MINI_APP_URL)}">Открыть мини-апп</a><p class="hint">Если вы открыли эту страницу в браузере, кнопка MAX вернёт вас в игру. Покупки хранятся за вашим аккаунтом MAX, а не в браузере.</p></main></body></html>`, { status: 200, headers: { 'content-type':'text/html; charset=utf-8', 'cache-control':'no-store' } });
  } catch (error) { return reply({ ok:false, error:'PAYMENT_SUCCESS_PAGE_ERROR' }, 500); }
}

export default { GET };
