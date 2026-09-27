/* ═══════════════════════════════════════════════════════════════════
   БОТ ЗАПИСИ — простой вариант без терминала и Cloudflare.
   Инструкция по установке: apps-script/README.md
   Впишите три значения ниже и разверните как веб-приложение.
   ═══════════════════════════════════════════════════════════════════ */
const BOT_TOKEN = "ВАШ_ТОКЕН_ОТ_BOTFATHER";       // получить у @BotFather в Telegram
const ADMIN_CHAT_IDS = "СЮДА_ВАШ_CHAT_ID";        // напишите боту /start, он подскажет ваш id; несколько — через запятую
const BOOKING_SECRET = "придумайте-случайную-строку"; // защита от чужих заявок, любая строка

const SHEET_NAME = "Заявки";
const HEADERS = ["No", "Дата", "Час", "Мастер", "Услуга", "Имя", "Телефон", "Цена", "Статус", "Оплата", "Сумма", "СтатусОплаты", "Создано", "MsgIds"];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function tg_(method, payload) {
  const res = UrlFetchApp.fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  return JSON.parse(res.getContentText());
}

function adminIds_() {
  return ADMIN_CHAT_IDS.split(",").map(s => s.trim()).filter(Boolean);
}

function fmtDate_(d) {
  const p = String(d).split("-");
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : d;
}

function bookingText_(row) {
  const [no, date, hour, master, service, name, phone, price, status, payMethod, payAmount] = row;
  const pay = payMethod === "prepay" ? `предоплата ${payAmount} ₽`
            : payMethod === "full" ? `оплата онлайн ${payAmount} ₽`
            : "оплата в салоне";
  let text = `📋 Заявка №${no}\n${fmtDate_(date)} в ${String(hour).padStart(2, "0")}:00\n${service} · ${master}\n${name}, ${phone}\n${price} ₽ · ${pay}`;
  if (status === "confirmed") text += "\n\n✅ Подтверждена";
  if (status === "canceled") text += "\n\n❌ Отменена";
  return text;
}

function keyboard_(rowIndex, status) {
  if (status && status !== "new") return { inline_keyboard: [] };
  return {
    inline_keyboard: [[
      { text: "✅ Подтвердить", callback_data: `confirm:${rowIndex}` },
      { text: "❌ Отменить", callback_data: `cancel:${rowIndex}` }
    ]]
  };
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  if (data.update_id) {
    handleTelegramUpdate_(data);
  } else {
    handleBooking_(e, data);
  }
  return ContentService.createTextOutput("ok");
}

function doGet() {
  return ContentService.createTextOutput("varg-barber-bot (apps script)");
}

function handleBooking_(e, b) {
  const key = (e.parameter && e.parameter.key) || "";
  if (key !== BOOKING_SECRET) return;
  if (!b.no || !b.date || b.hour == null || !b.master || !b.service || !b.name || !b.phone) return;

  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][1] === b.date && Number(values[i][2]) === Number(b.hour) && values[i][3] === b.master && values[i][8] !== "canceled") {
      return; // слот уже занят — не дублируем уведомление
    }
  }

  const pay = b.pay || {};
  sheet.appendRow([
    b.no, b.date, b.hour, b.master, b.service, b.name, b.phone, b.price || 0,
    b.status || "new", pay.method || "salon", pay.amount || 0, pay.status || "none",
    b.created || new Date().toISOString(), ""
  ]);
  const rowIndex = sheet.getLastRow();
  const row = sheet.getRange(rowIndex, 1, 1, HEADERS.length).getValues()[0];
  const text = bookingText_(row);
  const kb = keyboard_(rowIndex, "new");

  const msgIds = [];
  adminIds_().forEach(chatId => {
    const res = tg_("sendMessage", { chat_id: chatId, text, reply_markup: kb });
    if (res.ok) msgIds.push({ chatId, messageId: res.result.message_id });
  });
  sheet.getRange(rowIndex, 14).setValue(JSON.stringify(msgIds));
}

function handleTelegramUpdate_(update) {
  if (update.callback_query) return handleCallback_(update.callback_query);
  if (update.message) return handleMessage_(update.message);
}

function handleCallback_(cq) {
  const [action, idxStr] = (cq.data || "").split(":");
  const rowIndex = Number(idxStr);
  if (!["confirm", "cancel"].includes(action) || !rowIndex) {
    return tg_("answerCallbackQuery", { callback_query_id: cq.id });
  }
  if (!adminIds_().includes(String(cq.from.id))) {
    return tg_("answerCallbackQuery", { callback_query_id: cq.id, text: "Нет прав", show_alert: true });
  }
  const sheet = getSheet_();
  const row = sheet.getRange(rowIndex, 1, 1, HEADERS.length).getValues()[0];
  if (!row[0]) return tg_("answerCallbackQuery", { callback_query_id: cq.id, text: "Заявка не найдена" });

  const status = action === "confirm" ? "confirmed" : "canceled";
  sheet.getRange(rowIndex, 9).setValue(status);
  row[8] = status;

  const text = bookingText_(row);
  const kb = keyboard_(rowIndex, status);
  const msgIds = JSON.parse(row[13] || "[]");
  msgIds.forEach(m => tg_("editMessageText", { chat_id: m.chatId, message_id: m.messageId, text, reply_markup: kb }));

  return tg_("answerCallbackQuery", { callback_query_id: cq.id, text: status === "confirmed" ? "Подтверждено" : "Отменено" });
}

function handleMessage_(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  const isAdmin = adminIds_().includes(String(chatId));

  if (text === "/start" || text === "/id") {
    return tg_("sendMessage", {
      chat_id: chatId,
      text: isAdmin
        ? "Бот администратора барбершопа.\n\nКоманды:\n/today — заявки на сегодня\n/upcoming — ближайшие заявки"
        : `Это бот записи барбершопа. Ваш chat_id: ${chatId}\nВпишите его в ADMIN_CHAT_IDS в коде скрипта (строка сверху) и сохраните.`
    });
  }
  if (!isAdmin) {
    return tg_("sendMessage", { chat_id: chatId, text: `Доступ только для администратора. Ваш chat_id: ${chatId}` });
  }
  if (text === "/today" || text === "/upcoming") {
    const sheet = getSheet_();
    const values = sheet.getDataRange().getValues();
    const today = Utilities.formatDate(new Date(), "Europe/Moscow", "yyyy-MM-dd");
    const rows = values.slice(1).filter(r => r[8] !== "canceled" && (text === "/today" ? r[1] === today : r[1] >= today));
    if (!rows.length) return tg_("sendMessage", { chat_id: chatId, text: "Заявок нет" });
    const list = rows.slice(0, 20).map(bookingText_).join("\n\n");
    return tg_("sendMessage", { chat_id: chatId, text: list });
  }
  return tg_("sendMessage", { chat_id: chatId, text: "Команды: /today, /upcoming" });
}
