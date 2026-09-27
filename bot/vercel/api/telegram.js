const { tg, adminIds } = require("../lib/telegram");

async function handleCallback(cq) {
  const data = cq.data || "";
  const isConfirm = data.startsWith("confirm:");
  const isCancel = data.startsWith("cancel:");
  if (!isConfirm && !isCancel) return tg("answerCallbackQuery", { callback_query_id: cq.id });

  if (!adminIds().includes(String(cq.from.id))) {
    return tg("answerCallbackQuery", { callback_query_id: cq.id, text: "Нет прав", show_alert: true });
  }

  const suffix = isConfirm ? "\n\n✅ Подтверждена" : "\n\n❌ Отменена";
  const baseText = (cq.message && cq.message.text) || "";

  await tg("editMessageText", {
    chat_id: cq.message.chat.id,
    message_id: cq.message.message_id,
    text: baseText + suffix,
    reply_markup: { inline_keyboard: [] }
  });
  return tg("answerCallbackQuery", { callback_query_id: cq.id, text: isConfirm ? "Подтверждено" : "Отменено" });
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  const isAdmin = adminIds().includes(String(chatId));

  if (text === "/start" || text === "/id") {
    return tg("sendMessage", {
      chat_id: chatId,
      text: isAdmin
        ? "Бот администратора барбершопа. Уведомления о новых заявках приходят сюда автоматически, с кнопками «Подтвердить/Отменить»."
        : `Это бот записи барбершопа. Ваш chat_id: ${chatId}\nПередайте его владельцу, чтобы получить права администратора.`
    });
  }

  return tg("sendMessage", {
    chat_id: chatId,
    text: isAdmin ? "История заявок — сообщения выше в этом чате." : `Доступ только для администратора. Ваш chat_id: ${chatId}`
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  let update;
  try {
    update = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).end();
  }

  if (update.callback_query) await handleCallback(update.callback_query);
  else if (update.message) await handleMessage(update.message);

  return res.status(200).send("ok");
};
