/* Имена услуг и мастеров для сообщений в Telegram.
   Держите id и названия в паре с config.js (prices.services и masters.list)
   в корне сайта — бот их не читает напрямую, это отдельный сервис. */
const MASTER_NAMES = {
  artem: "Артём",
  ildar: "Ильдар",
  maksim: "Максим",
  any: "Любой свободный"
};

const SERVICE_NAMES = {
  classic: "Классическая стрижка",
  fade: "Fade и машинка",
  nozzle: "Стрижка под насадку",
  kid: "Детская, до 12 лет",
  duo: "Отец + сын",
  beard: "Моделирование бороды",
  royal: "Королевское бритьё",
  head: "Бритьё головы",
  edge: "Окантовка",
  combo: "Стрижка + борода",
  evening: "«Вечер»: стрижка, борода, бритьё",
  camo: "Камуфляж седины",
  style: "Укладка",
  mask: "Маска и скраб для лица"
};

module.exports = { MASTER_NAMES, SERVICE_NAMES };
