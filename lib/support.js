import https from "https";

const ADMIN_ID = String(process.env.MAX_ADMIN_USER_ID || process.env.MAX_OWNER_USER_ID || "163701646");
const TOKEN = process.env.MAX_BOT_TOKEN || process.env.MAX_BOT_TOKEN_VALUE;
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const stateKey = id => `maxigra:support:state:${String(id)}`;

async function redis(command, args = []) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error("Redis для поддержки не настроен.");
  const response = await fetch(REDIS_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${REDIS_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify([command, ...args])
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data.error || `Redis ${response.status}`);
  return data.result;
}
async function max(method, path, body) {
  if (!TOKEN) throw new Error("MAX_BOT_TOKEN не настроен.");
  const bodyText = body == null ? null : JSON.stringify(body);
  const response = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "platform-api2.max.ru", path, method,
      headers: { Authorization: TOKEN, Accept: "application/json", "Content-Type": "application/json",
        ...(bodyText ? { "Content-Length": Buffer.byteLength(bodyText) } : {}) },
      rejectUnauthorized: false, timeout: 15000
    }, res => {
      let raw = ""; res.setEncoding("utf8");
      res.on("data", chunk => raw += chunk);
      res.on("end", () => resolve({ status: res.statusCode || 0, raw }));
    });
    req.on("timeout", () => req.destroy(new Error("MAX API timeout")));
    req.on("error", reject);
    if (bodyText) req.write(bodyText);
    req.end();
  });
  let data = null; try { data = response.raw ? JSON.parse(response.raw) : null; } catch {}
  if (response.status < 200 || response.status >= 300) throw new Error(`MAX API HTTP ${response.status}: ${String(response.raw || "").slice(0, 300)}`);
  return data || {};
}
const send = (id, text, rows, attachments = []) => max("POST", "/messages?user_id=" + encodeURIComponent(String(id)), {
  text,
  attachments: [...attachments, ...(rows ? [{ type: "inline_keyboard", payload: { buttons: rows.map(row => row.map(b => ({ type: "callback", text: b.text, payload: b.payload }))) } }] : [])]
});
async function getState(id) {
  const raw = await redis("GET", [stateKey(id)]);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
async function setState(id, state) {
  await redis("SET", [stateKey(id), JSON.stringify(state), "EX", "3600"]);
}
async function clearState(id) { await redis("DEL", [stateKey(id)]); }
function userId(update) {
  return update?.callback?.user?.user_id ?? update?.callback?.user?.id ?? update?.user?.user_id ??
    update?.user?.id ?? update?.user_id ?? update?.message?.sender?.user_id ??
    update?.message?.sender?.id ?? update?.message?.from?.user_id ?? update?.message?.from?.id ?? null;
}
function userFrom(update) {
  return update?.message?.sender || update?.message?.from || update?.user || update?.callback?.user || {};
}
function messageAttachments(update) {
  const list = update?.message?.body?.attachments ?? update?.message?.attachments ?? update?.attachments ?? [];
  if (!Array.isArray(list)) return [];
  // Only relay images and only attachment payloads that the MAX API can accept back.
  return list.filter(a => a && (a.type === "image" || a.type === "photo") && a.payload &&
    (a.payload.token || a.payload.url)).slice(0, 3);
}
function profileLink(id) { return `max://user/${encodeURIComponent(String(id))}`; }
const cancelRows = [[{ text: "❌ Отмена", payload: "support:cancel" }]];
function replyRows(id) { return [[{ text: "💬 Ответить", payload: `support:reply:${String(id)}` }]]; }

export async function handleSupportBot(id, text, update) {
  const value = String(text || "").trim();
  const attachments = messageAttachments(update);
  const isCommand = /^(?:\/?support|\/?поддержка)(?:@\S+)?$/i.test(value);
  if (isCommand) {
    const sender = userFrom(update);
    const displayName = [sender.first_name, sender.last_name].filter(Boolean).join(" ").trim() || sender.name || sender.display_name || sender.username || "Игрок";
    await setState(id, { mode: "user", step: "message", name: String(displayName).slice(0, 100), startedAt: Date.now() });
    await send(id, "🛟 Поддержка «Шашек»\n\nНапиши, что случилось. Можно отправить текст и/или фотографию. Перед отправкой бот покажет обращение для подтверждения.", cancelRows);
    return true;
  }

  if (String(id) === ADMIN_ID) {
    const adminState = await getState(id);
    if (adminState?.mode === "reply" && adminState?.step === "reply_text") {
      if (!value && !attachments.length) {
        await send(id, "Пришли текст ответа или нажми «Отмена».", cancelRows);
        return true;
      }
      await send(adminState.targetId, "💬 Ответ службы поддержки «Шашек»\n\n" + (value || "Мы получили ваше сообщение. Если проблема сохраняется, уточните детали."));
      await clearState(id);
      await send(id, "✅ Ответ отправлен пользователю " + adminState.targetId + ".");
      return true;
    }
  }

  const state = await getState(id);
  if (!state) return false;
  if (state.mode === "user" && state.step === "message") {
    if (!value && !attachments.length) {
      await send(id, "Пришли текст сообщения или фотографию.", cancelRows);
      return true;
    }
    const safeAttachments = attachments.map(a => ({ type: a.type, payload: a.payload }));
    state.message = value.slice(0, 3500);
    state.attachments = safeAttachments;
    state.step = "confirm";
    await setState(id, state);
    await send(id, "👀 Проверь обращение перед отправкой:\n\n" + (state.message || "📷 Фотография без текста") +
      (safeAttachments.length ? `\n\n📎 Фотографий: ${safeAttachments.length}` : "") +
      "\n\nОтправить это сообщение в техническую поддержку?", [
        [{ text: "✅ Отправить", payload: "support:confirm" }],
        [{ text: "✏️ Изменить", payload: "support:edit" }],
        ...cancelRows
      ], safeAttachments);
    return true;
  }
  return false;
}

export async function handleSupportCallback(id, payload, callbackId) {
  const action = String(payload || "");
  if (!action.startsWith("support:")) return false;
  if (callbackId) {
    try { await max("POST", "/answers?callback_id=" + encodeURIComponent(String(callbackId)), { notification: "Готово" }); } catch {}
  }
  if (action.startsWith("support:reply:")) {
    if (String(id) !== ADMIN_ID) return true;
    const targetId = action.slice("support:reply:".length);
    if (!/^\d+$/.test(targetId)) { await send(id, "Не удалось определить пользователя."); return true; }
    await setState(id, { mode: "reply", step: "reply_text", targetId });
    await send(id, `✍️ Напиши ответ пользователю ${targetId}.\n\nОн получит сообщение от бота «Шашки».`, cancelRows);
    return true;
  }
  const state = await getState(id);
  if (action === "support:cancel") {
    await clearState(id);
    await send(id, "❌ Действие отменено.");
    return true;
  }
  if (!state || state.mode !== "user") { await send(id, "Сценарий поддержки завершён. Отправь /support, чтобы начать заново."); return true; }
  if (action === "support:edit") {
    state.step = "message";
    await setState(id, state);
    await send(id, "✏️ Пришли исправленный текст и/или фотографию.", cancelRows);
    return true;
  }
  if (action === "support:confirm" && state.step === "confirm") {
    const rawName = String(state.name || "");
    const attachments = Array.isArray(state.attachments) ? state.attachments : [];
    const header = `🛟 Новое обращение в поддержку «Шашек»\n\n👤 Пользователь: ${rawName || "Игрок"}\n🆔 MAX ID: ${id}\n🔗 Профиль: ${profileLink(id)}\n\n💬 Сообщение:\n`;
    try {
      await send(ADMIN_ID, header + (state.message || "📷 Фотография без текста"), replyRows(id), attachments);
      await clearState(id);
      await send(id, "✅ Обращение отправлено в техническую поддержку. Ответ придёт сюда, в этот бот.");
    } catch (error) {
      console.error("Support delivery failed", { userId: String(id), error: error.message });
      await send(id, "Не удалось отправить обращение из-за временной ошибки. Попробуй ещё раз через /support.");
    }
    return true;
  }
  return true;
}

export async function submitAppSupport(user, message) {
  const id = String(user?.id || "");
  const text = String(message || "").trim();
  if (!/^\d+$/.test(id)) throw new Error("MAX_USER_ID_REQUIRED");
  if (!text || text.length > 3500) throw new Error("MESSAGE_REQUIRED_OR_TOO_LONG");
  const header = `🛟 Обращение из мини-приложения «Шашки»\n\n👤 Пользователь: ${String(user.name || "Игрок").slice(0, 100)}\n🆔 MAX ID: ${id}\n🔗 Профиль: ${profileLink(id)}\n\n💬 Сообщение:\n${text}`;
  await send(ADMIN_ID, header, replyRows(id));
  return { ok: true };
}
