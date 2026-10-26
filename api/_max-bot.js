import https from 'https';

const BOT_URL = 'https://max.ru/se13360501_bot';

export function supportUrl() {
  const value = String(process.env.MAX_SUPPORT_URL || BOT_URL).trim();
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : BOT_URL;
  } catch {
    return BOT_URL;
  }
}

export async function sendMaxMessage(userId, message) {
  const token = String(process.env.MAX_BOT_TOKEN || process.env.MAX_BOT_TOKEN_VALUE || '').trim();
  if (!token) throw new Error('MAX_BOT_TOKEN_NOT_CONFIGURED');
  if (!userId) throw new Error('MAX_USER_ID_REQUIRED');

  const path = '/messages?user_id=' + encodeURIComponent(String(userId));
  const body = JSON.stringify(message);
  const response = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'platform-api2.max.ru',
      path,
      method: 'POST',
      headers: {
        Authorization: token,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      // Match the established /posting transport, which currently works with MAX's certificate chain.
      rejectUnauthorized: false,
      timeout: 15000
    }, res => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => resolve({ status: res.statusCode || 0, raw }));
    });
    req.on('timeout', () => req.destroy(new Error('MAX API timeout')));
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  let data = null;
  try { data = response.raw ? JSON.parse(response.raw) : null; } catch {}
  if (response.status < 200 || response.status >= 300) {
    console.error('MAX message send failed', {
      status: response.status,
      body: String(response.raw || '').slice(0, 500)
    });
    throw new Error('MAX_MESSAGE_SEND_FAILED');
  }
  return data || {};
}

export function linkKeyboard(rows) {
  return {
    type: 'inline_keyboard',
    payload: {
      buttons: rows.map(row => row.map(button => button.type === 'open_app'
        ? {
            type: 'open_app',
            text: button.text,
            web_app: button.webApp || 'se13360501_bot'
          }
        : {
            type: 'link',
            text: button.text,
            url: button.url
          }))
    }
  };
}

export { BOT_URL };
