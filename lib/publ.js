import https from "https";

const ADMIN_ID = String(process.env.MAX_ADMIN_USER_ID || process.env.MAX_OWNER_USER_ID || "163701646");
const TOKEN = process.env.MAX_BOT_TOKEN || process.env.MAX_BOT_TOKEN_VALUE;
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const USERS_KEY = "maxigra:bot-users";
const stateKey = id => `maxigra:publ:${String(id)}`;

async function redis(command, args = []) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error("Redis для /publ не настроен.");
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
  let data = null;
  try { data = response.raw ? JSON.parse(response.raw) : null; } catch {}
  if (response.status < 200 || response.status >= 300)
    throw new Error(`MAX API HTTP ${response.status}: ${String(response.raw || "").slice(0, 300)}`);
  return data || {};
}

export async function rememberBotUser(id) {
  if (!id) return;
  try { await redis("SADD", [USERS_KEY, String(id)]); }
  catch (error) { console.error("MAX bot user index failed", { id: String(id), error: error.message }); }
}

async function getState(id) {
  const raw = await redis("GET", [stateKey(id)]);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
async function setState(id, state) {
  await redis("SET", [stateKey(id), JSON.stringify(state), "EX", "3600"]);
}
async function clearState(id) { await redis("DEL", [stateKey(id)]); }
function validUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return ["https:", "http:"].includes(url.protocol) && url.hostname ? url.toString() : "";
  } catch { return ""; }
}
const cancelRows = [[{ text: "❌ Отмена", payload: "publ:cancel" }]];
function callbackKeyboard(rows) {
  return { type: "inline_keyboard", payload: { buttons: rows.map(row => row.map(button => ({
    type: "callback", text: button.text, payload: button.payload
  }))) } };
}
async function sendAdmin(id, text, rows) {
  return max("POST", "/messages?user_id=" + encodeURIComponent(String(id)), {
    text, ...(rows ? { attachments: [callbackKeyboard(rows)] } : {})
  });
}
function actionRows(state) {
  const rows = [];
  if (state.buttons.length < 6) rows.push([{ text: "➕ Добавить кнопку", payload: "publ:add_button" }]);
  rows.push([{ text: "📣 Отправить всем", payload: "publ:send" }]);
  rows.push([{ text: "❌ Отмена", payload: "publ:cancel" }]);
  return rows;
}
function previewText(state) {
  const buttons = state.buttons.length
    ? "\n\nКнопки:\n" + state.buttons.map((b, i) => b.type === "open_app"
      ? `${i + 1}. ${b.text} — открывает мини-приложение «Шашки»`
      : `${i + 1}. ${b.text} — ${b.url}`).join("\n")
    : "\n\nКнопок нет."; 
  return `👀 Предпросмотр рассылки\n\n${state.text}${buttons}\n\nПолучатели: сохранённые пользователи бота и игроки, чьи профили или статистика есть в базе «Шашек».`;
}
async function showPreview(id, state) { await sendAdmin(id, previewText(state), actionRows(state)); }
async function sendToUser(id, state) {
  const attachments = state.buttons.length ? [{
    type: "inline_keyboard",
    payload: { buttons: state.buttons.map(button => [button.type === "open_app"
      ? { type: "open_app", text: button.text, web_app: "se13360501_bot" }
      : { type: "link", text: button.text, url: button.url }]) }
  }] : [];
  return max("POST", "/messages?user_id=" + encodeURIComponent(String(id)), {
    text: state.text, ...(attachments.length ? { attachments } : {})
  });
}
async function importRedisIds(pattern, extractId) {
  let cursor = "0";
  const found = new Set();
  do {
    const result = await redis("SCAN", [cursor, "MATCH", pattern, "COUNT", "500"]);
    if (!Array.isArray(result) || result.length < 2) break;
    cursor = String(result[0] ?? "0");
    const keys = Array.isArray(result[1]) ? result[1] : [];
    for (const rawKey of keys) {
      const id = extractId(String(rawKey));
      if (id && /^\d+$/.test(String(id))) found.add(String(id));
    }
  } while (cursor !== "0");
  if (found.size) {
    const ids = [...found];
    for (let i = 0; i < ids.length; i += 400) {
      await redis("SADD", [USERS_KEY, ...ids.slice(i, i + 400)]);
    }
  }
  return found.size;
}

async function syncExistingBotUsers() {
  // Build the broadcast audience from all durable game profiles, player stats,
  // and legacy bot-retention records — not only users who interacted with the bot.
  const [profiles, offlineStats, onlineStats, retention] = await Promise.all([
    importRedisIds("checkers:user:*", key => key.slice("checkers:user:".length)),
    importRedisIds("checkers:stats:offline:*", key => key.slice("checkers:stats:offline:".length)),
    importRedisIds("checkers:stats:online:*", key => key.slice("checkers:stats:online:".length)),
    importRedisIds("checkers:retention:*", key =>
      key.startsWith("checkers:retention:start-lock:") ? "" : key.slice("checkers:retention:".length))
  ]);
  return { profiles, stats: offlineStats + onlineStats, retention };
}

async function broadcast(state) {
  const imported = await syncExistingBotUsers();
  const raw = await redis("SMEMBERS", [USERS_KEY]);
  const ids = Array.isArray(raw) ? [...new Set(raw.map(String).filter(Boolean))] : [];
  let sent = 0, failed = 0;
  const errors = [];
  for (let i = 0; i < ids.length; i += 8) {
    const batch = ids.slice(i, i + 8);
    const results = await Promise.allSettled(batch.map(id => sendToUser(id, state)));
    results.forEach((result, index) => {
      if (result.status === "fulfilled") sent++;
      else {
        failed++;
        if (errors.length < 5) errors.push(`${batch[index]}: ${result.reason?.message || "ошибка"}`);
      }
    });
  }
  return { total: ids.length, sent, failed, errors, imported };
}

export async function handlePubl(id, text) {
  if (String(id) !== ADMIN_ID) return false;
  const value = String(text || "").trim();
  if (/^(?:\/?publ(?:@\S+)?|\/?публ(?:@\S+)?)(?:\s|$)/i.test(value)) {
    await setState(id, { step: "text", text: "", buttons: [] });
    await sendAdmin(id, "📣 Рассылка пользователям\n\nПришли текст сообщения для пользователей бота и игроков, сохранённых в базе «Шашек».", cancelRows);
    return true;
  }
  const state = await getState(id);
  if (!state) return false;
  if (state.step === "text") {
    if (!value) {
      await sendAdmin(id, "❗ Сообщение не может быть пустым. Пришли текст или нажми «Отмена».", cancelRows);
      return true;
    }
    state.text = value;
    state.step = "buttons_choice";
    await setState(id, state);
    await sendAdmin(id, "✅ Текст принят. Можно добавить кнопку со ссылкой или кнопку открытия мини-приложения «Шашки».", [
      [{ text: "🔗 Кнопка-ссылка", payload: "publ:add_link_button" }],
      [{ text: "🎮 Открыть мини-приложение", payload: "publ:add_app_button" }],
      [{ text: "➡️ Без кнопок", payload: "publ:no_buttons" }],
      ...cancelRows
    ]);
    return true;
  }
  if (state.step === "button_text" || state.step === "app_button_text") {
    if (!value) {
      await sendAdmin(id, "❗ Текст кнопки не может быть пустым.", cancelRows);
      return true;
    }
    if (state.step === "app_button_text") {
      state.buttons.push({ type: "open_app", text: value.slice(0, 64) });
      state.step = "preview";
      await setState(id, state);
      await showPreview(id, state);
      return true;
    }
    state.pendingButtonText = value.slice(0, 64);
    state.step = "button_url";
    await setState(id, state);
    await sendAdmin(id, "🔗 Теперь пришли ссылку для кнопки (http:// или https://).", cancelRows);
    return true;
  }
  if (state.step === "button_url") {
    const url = validUrl(value);
    if (!url) {
      await sendAdmin(id, "❗ Ссылка некорректна. Пришли полный адрес, начинающийся с https:// или http://.", cancelRows);
      return true;
    }
    state.buttons.push({ type: "link", text: state.pendingButtonText, url });
    delete state.pendingButtonText;
    state.step = "preview";
    await setState(id, state);
    await showPreview(id, state);
    return true;
  }
  return false;
}

export async function handlePublCallback(id, payload, callbackId) {
  if (String(id) !== ADMIN_ID) return false;
  const action = String(payload || "");
  if (!action.startsWith("publ:")) return false;
  if (callbackId) {
    try { await max("POST", "/answers?callback_id=" + encodeURIComponent(String(callbackId)), { notification: "Готово" }); }
    catch (error) { console.error("publ callback ack failed", error.message); }
  }
  const state = await getState(id);
  if (action === "publ:cancel") {
    await clearState(id);
    await sendAdmin(id, "❌ Рассылка отменена.");
    return true;
  }
  if (!state) {
    await sendAdmin(id, "Сценарий рассылки истёк. Отправь /publ, чтобы начать заново.");
    return true;
  }
  if (action === "publ:add_button" || action === "publ:add_link_button" || action === "publ:add_app_button") {
    if (state.buttons.length >= 6) {
      await sendAdmin(id, "Можно добавить не более 6 кнопок.");
      return true;
    }
    if (action === "publ:add_button") {
      await sendAdmin(id, "Какую кнопку добавить?", [
        [{ text: "🔗 Кнопка-ссылка", payload: "publ:add_link_button" }],
        [{ text: "🎮 Открыть мини-приложение", payload: "publ:add_app_button" }],
        ...cancelRows
      ]);
      return true;
    }
    state.step = action === "publ:add_app_button" ? "app_button_text" : "button_text";
    await setState(id, state);
    await sendAdmin(id, action === "publ:add_app_button"
      ? `🎮 Напиши текст кнопки №${state.buttons.length + 1}. Она будет открывать мини-приложение «Шашки».`
      : `🔘 Напиши название кнопки-ссылки №${state.buttons.length + 1}.`, cancelRows);
    return true;
  }
  if (action === "publ:no_buttons") {
    state.buttons = [];
    state.step = "preview";
    await setState(id, state);
    await showPreview(id, state);
    return true;
  }
  if (action === "publ:send" && state.step === "preview") {
    await sendAdmin(id, "⏳ Рассылка запущена. Отправляю сообщения пользователям…");
    try {
      const result = await broadcast(state);
      await clearState(id);
      await sendAdmin(id, `✅ Рассылка завершена.\n\nВсего пользователей: ${result.total}\nДоставлено: ${result.sent}\nОшибок отправки: ${result.failed}\n\nНайдено в базе игры: ${Number(result.imported?.profiles||0)} профилей, статистика: ${Number(result.imported?.stats||0)} записей, старые записи бота: ${Number(result.imported?.retention||0)}.${result.errors?.length ? "\n\nПервые ошибки:\n" + result.errors.join("\n") : ""}`);
    } catch (error) {
      await sendAdmin(id, "❗ Не удалось выполнить рассылку.\n\n" + error.message);
    }
    return true;
  }
  return true;
}
