import { redis } from './_lib.js';
import { BOT_URL, linkKeyboard, sendMaxMessage } from './_max-bot.js';

const retentionKey = id => `checkers:retention:${String(id)}`;
const GAME_URL = String(process.env.MAXIGRA_GAME_URL || 'https://musicdom.github.io/maxigra/').trim();
const CHANNEL_URL = String(process.env.MAXIGRA_CHANNEL_URL || process.env.MAX_CHANNEL_URL || 'https://max.ru/channel_RusShashki').trim();

function validHttpUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : '';
  } catch { return ''; }
}

export async function handleBotStart(userId) {
  const id = String(userId || '');
  if (!id) return { ok: false, reason: 'USER_ID_REQUIRED' };

  const lock = await redis('SET', [`checkers:retention:start-lock:${id}`, '1', 'NX', 'EX', '20']);
  if (lock !== 'OK') return { ok: true, skipped: 'DUPLICATE_START' };

  const key = retentionKey(id);
  const [raw, profileRaw] = await Promise.all([
    redis('GET', [key]),
    redis('GET', [`checkers:user:${id}`])
  ]);
  let state = {};
  try { state = raw ? JSON.parse(raw) : {}; } catch {}
  const now = Date.now();
  const returning = Boolean(state.botStartedAt || profileRaw);
  state.userId = id;
  state.botStartedAt = Number(state.botStartedAt) || now;
  state.lastBotStartAt = now;
  delete state.disabled;
  delete state.disabledAt;
  state.reminderSentDays = Array.isArray(state.reminderSentDays) ? state.reminderSentDays : [];
  state.reminderAttempts = state.reminderAttempts && typeof state.reminderAttempts === 'object' ? state.reminderAttempts : {};
  await redis('SET', [key, JSON.stringify(state)]);

  const text = returning
    ? 'С возвращением! 👋\n\n♟️ Доска ждёт, соперники не дремлют. Самое время сыграть ещё партию и улучшить свой результат! 🏆'
    : 'Привет! 👋 Добро пожаловать в «Шашки»!\n\nИспытай свою тактику, обыгрывай соперников и поднимайся в рейтинге. Возможно, именно ты станешь лидером сезона! 🏆\n\nГотов сделать первый ход?';

  const rows = [[{ text: returning ? 'Продолжить игру' : 'Зайти в шашки', url: validHttpUrl(GAME_URL) || BOT_URL }]];
  const channel = validHttpUrl(CHANNEL_URL);
  if (channel) rows.push([{ text: 'Наш канал', url: channel }]);

  try {
    await sendMaxMessage(id, { text, attachments: [linkKeyboard(rows)] });
    return { ok: true, returning };
  } catch (error) {
    console.error('MAX bot start message failed', { userId: id, error: error.message });
    return { ok: false, error: error.message };
  }
}

export async function recordGameActivity(user) {
  const id = String(user?.id || '');
  if (!id) return;
  const key = retentionKey(id);
  const raw = await redis('GET', [key]);
  let state = {};
  try { state = raw ? JSON.parse(raw) : {}; } catch {}
  state.userId = id;
  state.lastGameActivityAt = Date.now();
  state.reminderSentDays = [];
  state.reminderAttempts = {};
  delete state.disabled;
  delete state.deliveryError;
  await redis('SET', [key, JSON.stringify(state)]);
}

export async function handleBotStop(userId) {
  const id = String(userId || '');
  if (!id) return { ok: false, reason: 'USER_ID_REQUIRED' };
  const key = retentionKey(id);
  const raw = await redis('GET', [key]);
  let state = {};
  try { state = raw ? JSON.parse(raw) : {}; } catch {}
  state.userId = id;
  state.disabled = true;
  state.disabledAt = Date.now();
  await redis('SET', [key, JSON.stringify(state)]);
  try {
    await sendMaxMessage(id, { text: 'Хорошо, отключил автоматические напоминания о «Шашках». Если захочешь вернуться, просто отправь /start.' });
  } catch (error) {
    console.error('MAX reminder opt-out confirmation failed', { userId: id, error: error.message });
  }
  return { ok: true, disabled: true };
}
