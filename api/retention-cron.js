import { redis, reply } from './_lib.js';
import { linkKeyboard, sendMaxMessage } from './_max-bot.js';

const CRON_SECRET = String(process.env.CRON_SECRET || '').trim();
const GAME_URL = String(process.env.MAXIGRA_GAME_URL || 'https://musicdom.github.io/maxigra/').trim();
const KEY_PREFIX = 'checkers:retention:';
const DAY = 24 * 60 * 60 * 1000;

const messages = {
  3: 'Привет! 👋 Давно не было партий!\n\n♟️ Самое время вернуться за доску и проверить свою тактику. Сыграем?',
  7: '♟️ Пора снова за доску!\n\nКаждая партия — возможность сыграть лучше и подняться в рейтинге. Не откладывай следующий ход! 🏆',
  30: 'Мы давно не виделись! 👋\n\nВ «Шашках» тебя ждут новые партии и борьба за место в рейтинге. Возвращайся, пора сделать следующий ход! ♟️'
};

function validGameUrl() {
  try {
    const url = new URL(GAME_URL);
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : 'https://musicdom.github.io/maxigra/';
  } catch {
    return 'https://musicdom.github.io/maxigra/';
  }
}

function dueDay(daysInactive) {
  if (daysInactive >= 30) return 30;
  if (daysInactive >= 7) return 7;
  if (daysInactive >= 3) return 3;
  return 0;
}

export async function GET(request) {
  if (!CRON_SECRET) return reply({ ok: false, error: 'CRON_SECRET_NOT_CONFIGURED' }, 503);
  if (request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return reply({ ok: false, error: 'UNAUTHORIZED' }, 401);
  }

  try {
    const keys = await redis('KEYS', [`${KEY_PREFIX}*`]);
    const now = Date.now();
    const result = { ok: true, scanned: 0, sent: 0, skipped: 0, failed: 0 };
    for (const key of (Array.isArray(keys) ? keys : [])) {
      if (!/^checkers:retention:\d+$/.test(String(key))) continue;
      result.scanned++;
      const lockKey = `${key}:cron-lock`;
      const lock = await redis('SET', [lockKey, '1', 'NX', 'EX', '120']);
      if (lock !== 'OK') { result.skipped++; continue; }

      try {
        const raw = await redis('GET', [key]);
        if (!raw) { result.skipped++; continue; }
        let state;
        try { state = JSON.parse(raw); } catch { result.skipped++; continue; }
        const lastActivity = Number(state.lastGameActivityAt || 0);
        if (!state.botStartedAt || !lastActivity || state.disabled) { result.skipped++; continue; }

        const daysInactive = Math.floor((now - lastActivity) / DAY);
        const day = dueDay(daysInactive);
        if (!day) { result.skipped++; continue; }

        const sentDays = Array.isArray(state.reminderSentDays) ? state.reminderSentDays : [];
        if (sentDays.includes(day)) { result.skipped++; continue; }

        const attempts = state.reminderAttempts && typeof state.reminderAttempts === 'object' ? state.reminderAttempts : {};
        if (Number(attempts[day] || 0) >= 3) { result.skipped++; continue; }

        try {
          await sendMaxMessage(state.userId || String(key).slice(KEY_PREFIX.length), {
            text: messages[day],
            attachments: [linkKeyboard([[{ text: 'Вернуться в шашки', url: validGameUrl() }]])]
          });
          state.reminderSentDays = [...new Set([...sentDays, day])].sort((a, b) => a - b);
          state.reminderAttempts = attempts;
          state.lastReminderSentAt = now;
          state.lastReminderDay = day;
          delete state.deliveryError;
          await redis('SET', [key, JSON.stringify(state)]);
          result.sent++;
        } catch (error) {
          attempts[day] = Number(attempts[day] || 0) + 1;
          state.reminderAttempts = attempts;
          state.deliveryError = String(error?.message || 'MESSAGE_SEND_FAILED').slice(0, 180);
          state.lastReminderAttemptAt = now;
          if (attempts[day] >= 3) {
            state.reminderSentDays = [...new Set([...sentDays, day])].sort((a, b) => a - b);
          }
          await redis('SET', [key, JSON.stringify(state)]);
          result.failed++;
          console.error('Retention reminder failed', { userId: state.userId || String(key).slice(KEY_PREFIX.length), day, attempt: attempts[day], error: state.deliveryError });
        }
      } finally {
        await redis('DEL', [lockKey]).catch(() => {});
      }
    }
    return reply(result);
  } catch (error) {
    console.error('Retention cron failed', error);
    return reply({ ok: false, error: String(error?.message || 'RETENTION_CRON_FAILED') }, 500);
  }
}

export default { GET };
