import { redis, reply } from '../_lib.js';

const RECEIVER = String(process.env.YOOMONEY_RECEIVER || '').trim();
const orderKey = id => `checkers:shop:order:${id}`;
const YOOMONEY_URL = 'https://yoomoney.ru/quickpay/confirm';

function esc(value) {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
function page({ order, error='', origin='https://maxigra.vercel.app' }) {
  if (error) return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Оплата — Шашки</title><style>body{margin:0;background:#f5faff;color:#172536;font:16px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:grid;place-items:center;min-height:100vh}.box{width:min(420px,calc(100% - 32px));background:#fff;border:1px solid #e5f3ff;border-radius:24px;padding:28px;box-shadow:0 16px 50px rgba(23,37,54,.08)}h1{font-size:22px;margin:0 0 10px}p{line-height:1.5;opacity:.72;margin:0}</style></head><body><main class="box"><h1>Оплата недоступна</h1><p>${esc(error)}</p></main></body></html>`;
  const amount=Number(order.price).toFixed(2), label=esc(order.id), receiver=esc(RECEIVER), success=`${origin}/api/shop/success?id=${encodeURIComponent(order.id)}`;
  // Keep the validated order on the server, then auto-submit the official YooMoney quickpay form.
  // The intermediate Vercel page is only a short redirect bridge and is not a user-facing checkout.
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Переход к оплате</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5faff;color:#172536;font:16px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.box{padding:28px;text-align:center}.spin{width:26px;height:26px;margin:0 auto 16px;border:3px solid #dcecf8;border-top-color:#318bea;border-radius:50%;animation:s .7s linear infinite}@keyframes s{to{transform:rotate(360deg)}}button{border:0;border-radius:12px;background:#318bea;color:white;padding:12px 18px;font-weight:700}</style></head><body><main class="box"><div class="spin"></div><p>Переходим к оплате в ЮMoney…</p><form id="pay" method="POST" action="${YOOMONEY_URL}"><input type="hidden" name="receiver" value="${receiver}"><input type="hidden" name="quickpay-form" value="button"><input type="hidden" name="sum" value="${amount}"><input type="hidden" name="label" value="${label}"><input type="hidden" name="successURL" value="${esc(success)}"><input type="hidden" name="paymentType" value="AC"><noscript><p>Нажмите кнопку, чтобы продолжить.</p><button type="submit">Перейти в ЮMoney</button></noscript></form><script>document.getElementById('pay').submit()</script></main></body></html>`;
}

export async function GET(request) {
  try {
    if(!RECEIVER)return new Response(page({error:'Платёжная система пока не настроена.'}),{status:503,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
    const url=new URL(request.url),orderId=String(url.searchParams.get('id')||'');
    if(!/^mx_[a-f0-9]{32}$/.test(orderId))return new Response(page({error:'Некорректный номер заказа.'}),{status:400,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
    const raw=await redis('GET',[orderKey(orderId)]);if(!raw)return new Response(page({error:'Заказ не найден или срок его оплаты истёк.'}),{status:404,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
    const order=JSON.parse(raw);if(order.status!=='pending'||Number(order.price)<=0)return new Response(page({error:'Этот заказ уже обработан.'}),{status:409,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});if(Number(order.expiresAt||0)>0&&Date.now()>Number(order.expiresAt)){await redis('SET',[orderKey(orderId),JSON.stringify({...order,status:'expired',expiredAt:Date.now()})]);return new Response(page({error:'Срок оплаты заказа истёк. Вернитесь в игру и создайте новый заказ.'}),{status:410,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}})}
    return new Response(page({order,origin:url.origin}),{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
  } catch(error){return reply({ok:false,error:'PAYMENT_PAGE_ERROR'},500);}
}
export default { GET };
