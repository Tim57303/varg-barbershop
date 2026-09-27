async function tg(method, payload) {
  const r = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return r.json();
}

function adminIds() {
  return (process.env.ADMIN_CHAT_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
}

module.exports = { tg, adminIds };
