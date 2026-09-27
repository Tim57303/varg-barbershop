import { SHOP } from "../shop.config.js";

const MASTER_NAMES = Object.fromEntries(SHOP.masters.map(m => [m.id, m.name]));
const SERVICE_NAMES = Object.fromEntries(SHOP.services.map(s => [s.id, s.name]));

function cors(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

function json(data, status = 200) {
  return cors(new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } }));
}

async function tg(env, method, payload) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return r.json();
}

function adminIds(env) {
  return (env.ADMIN_CHAT_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
}

function fmtDate(d) {
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

function bookingText(b) {
  const master = MASTER_NAMES[b.master] || b.master;
  const service = SERVICE_NAMES[b.service] || b.service;
  const pay = b.pay_method === "prepay" ? `предоплата ${b.pay_amount} ₽`
            : b.pay_method === "full" ? `оплата онлайн ${b.pay_amount} ₽`
            : "оплата в салоне";
  return `📋 Заявка №${b.no}\n`
       + `${fmtDate(b.date)} в ${String(b.hour).padStart(2, "0")}:00\n`
       + `${service} · ${master}\n`
       + `${b.name}, ${b.phone}\n`
       + `${b.price} ₽ · ${pay}`;
}

function statusSuffix(status) {
  if (status === "confirmed") return "\n\n✅ Подтверждена";
  if (status === "canceled") return "\n\n❌ Отменена";
  return "";
}

function keyboard(id, status) {
  if (status !== "new") return { inline_keyboard: [] };
  return {
    inline_keyboard: [[
      { text: "✅ Подтвердить", callback_data: `confirm:${id}` },
      { text: "❌ Отменить", callback_data: `cancel:${id}` }
    ]]
  };
}

async function handleBooking(request, env) {
  const url = new URL(request.url);
  if (!env.BOOKING_SECRET || url.searchParams.get("key") !== env.BOOKING_SECRET) {
    return json({ ok: false, error: "unauthorized" }, 403);
  }

  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }
  if (!b.no || !b.date || b.hour == null || !b.master || !b.service || !b.name || !b.phone) {
    return json({ ok: false, error: "missing fields" }, 400);
  }

  const pay = b.pay || {};
  let insertId;
  try {
    const res = await env.DB.prepare(
      `INSERT INTO bookings (no, date, hour, master, service, name, phone, price, status, pay_method, pay_amount, pay_status, created)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)`
    ).bind(
      b.no, b.date, b.hour, b.master, b.service, b.name, b.phone, b.price || 0,
      b.status || "new", pay.method || "salon", pay.amount || 0, pay.status || "none",
      b.created || new Date().toISOString()
    ).run();
    insertId = res.meta.last_row_id;
  } catch {
    // Слот (дата+час+мастер) уже занят другой заявкой — не дублируем уведомление.
    return json({ ok: true, duplicate: true });
  }

  const text = bookingText({ ...b, pay_method: pay.method, pay_amount: pay.amount });
  const kb = keyboard(insertId, "new");
  for (const chatId of adminIds(env)) {
    const sent = await tg(env, "sendMessage", { chat_id: chatId, text, reply_markup: kb });
    if (sent.ok) {
      await env.DB.prepare(`INSERT INTO booking_messages (booking_id, chat_id, message_id) VALUES (?1,?2,?3)`)
        .bind(insertId, String(chatId), sent.result.message_id).run();
    }
  }
  return json({ ok: true, id: insertId });
}

async function editAllMessages(env, id, text, kb) {
  const rows = await env.DB.prepare(`SELECT chat_id, message_id FROM booking_messages WHERE booking_id = ?1`).bind(id).all();
  for (const row of rows.results) {
    await tg(env, "editMessageText", { chat_id: row.chat_id, message_id: row.message_id, text, reply_markup: kb });
  }
}

async function handleCallback(env, cq) {
  const [action, idStr] = (cq.data || "").split(":");
  const id = Number(idStr);
  if (!["confirm", "cancel"].includes(action) || !id) {
    return tg(env, "answerCallbackQuery", { callback_query_id: cq.id });
  }
  if (!adminIds(env).includes(String(cq.from.id))) {
    return tg(env, "answerCallbackQuery", { callback_query_id: cq.id, text: "Нет прав", show_alert: true });
  }

  const row = await env.DB.prepare(`SELECT * FROM bookings WHERE id = ?1`).bind(id).first();
  if (!row) return tg(env, "answerCallbackQuery", { callback_query_id: cq.id, text: "Заявка не найдена" });

  const status = action === "confirm" ? "confirmed" : "canceled";
  await env.DB.prepare(`UPDATE bookings SET status = ?1 WHERE id = ?2`).bind(status, id).run();

  const text = bookingText(row) + statusSuffix(status);
  await editAllMessages(env, id, text, keyboard(id, status));
  return tg(env, "answerCallbackQuery", { callback_query_id: cq.id, text: status === "confirmed" ? "Подтверждено" : "Отменено" });
}

function todayMoscow() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow" }).format(new Date());
}

async function sendList(env, chatId, rows, title) {
  if (!rows.length) return tg(env, "sendMessage", { chat_id: chatId, text: `${title}: пусто` });
  const text = `${title}:\n\n` + rows.map(bookingText).join("\n\n");
  return tg(env, "sendMessage", { chat_id: chatId, text });
}

async function handleCommand(env, msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  const isAdmin = adminIds(env).includes(String(chatId));

  if (text === "/start" || text === "/id") {
    return tg(env, "sendMessage", {
      chat_id: chatId,
      text: isAdmin
        ? "Бот администратора барбершопа.\n\nКоманды:\n/today — заявки на сегодня\n/upcoming — ближайшие заявки"
        : `Это бот записи барбершопа. Ваш chat_id: ${chatId}\nПередайте его владельцу, чтобы получить права администратора.`
    });
  }

  if (!isAdmin) {
    return tg(env, "sendMessage", { chat_id: chatId, text: `Доступ только для администратора. Ваш chat_id: ${chatId}` });
  }

  if (text === "/today") {
    const day = todayMoscow();
    const rows = await env.DB.prepare(`SELECT * FROM bookings WHERE date = ?1 AND status != 'canceled' ORDER BY hour`).bind(day).all();
    return sendList(env, chatId, rows.results, `Заявки на ${fmtDate(day)}`);
  }

  if (text === "/upcoming") {
    const day = todayMoscow();
    const rows = await env.DB.prepare(`SELECT * FROM bookings WHERE date >= ?1 AND status != 'canceled' ORDER BY date, hour LIMIT 20`).bind(day).all();
    return sendList(env, chatId, rows.results, "Ближайшие заявки");
  }

  return tg(env, "sendMessage", { chat_id: chatId, text: "Команды: /today, /upcoming" });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));

    if (url.pathname === "/booking" && request.method === "POST") {
      return handleBooking(request, env);
    }

    if (url.pathname === "/telegram" && request.method === "POST") {
      const update = await request.json();
      if (update.callback_query) await handleCallback(env, update.callback_query);
      else if (update.message) await handleCommand(env, update.message);
      return new Response("ok");
    }

    return new Response("varg-barber-bot", { status: 200 });
  }
};
