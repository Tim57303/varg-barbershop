const { tg, adminIds } = require("../lib/telegram");
const { MASTER_NAMES, SERVICE_NAMES } = require("../lib/shop");

function fmtDate(d) {
  const p = String(d).split("-");
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : d;
}

function payText(b) {
  const pay = b.pay || {};
  if (pay.method === "prepay") return `предоплата ${pay.amount} ₽`;
  if (pay.method === "full") return `оплата онлайн ${pay.amount} ₽`;
  return "оплата в салоне";
}

function bookingText(b) {
  const master = MASTER_NAMES[b.master] || b.master;
  const service = SERVICE_NAMES[b.service] || b.service;
  return `📋 Заявка №${b.no}\n${fmtDate(b.date)} в ${String(b.hour).padStart(2, "0")}:00\n${service} · ${master}\n${b.name}, ${b.phone}\n${b.price} ₽ · ${payText(b)}`;
}

function keyboard(b) {
  const id = `${b.date}|${b.hour}|${b.master}|${b.no}`.slice(0, 55);
  return {
    inline_keyboard: [[
      { text: "✅ Подтвердить", callback_data: `confirm:${id}` },
      { text: "❌ Отменить", callback_data: `cancel:${id}` }
    ]]
  };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  if (!process.env.BOOKING_SECRET || req.query.key !== process.env.BOOKING_SECRET) {
    return res.status(403).json({ ok: false, error: "unauthorized" });
  }

  let b;
  try {
    b = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ ok: false, error: "bad json" });
  }
  if (!b || !b.no || !b.date || b.hour == null || !b.master || !b.service || !b.name || !b.phone) {
    return res.status(400).json({ ok: false, error: "missing fields" });
  }

  const text = bookingText(b);
  const kb = keyboard(b);
  for (const chatId of adminIds()) {
    await tg("sendMessage", { chat_id: chatId, text, reply_markup: kb });
  }
  return res.status(200).json({ ok: true });
};
