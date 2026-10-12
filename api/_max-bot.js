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

  const response = await fetch(
    'https://platform-api2.max.ru/messages?user_id=' + encodeURIComponent(String(userId)),
    {
      method: 'POST',
      headers: {
        Authorization: token,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message),
      cache: 'no-store'
    }
  );
  const raw = await response.text();
  if (!response.ok) {
    console.error('MAX message send failed', { status: response.status, body: raw.slice(0, 500) });
    throw new Error('MAX_MESSAGE_SEND_FAILED');
  }
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export function linkKeyboard(rows) {
  return {
    type: 'inline_keyboard',
    payload: {
      buttons: rows.map(row => row.map(button => ({
        type: 'link',
        text: button.text,
        url: button.url
      })))
    }
  };
}

export { BOT_URL };
