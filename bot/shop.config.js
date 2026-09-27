/* Имена услуг и мастеров для сообщений в Telegram.
   Держите id и названия в паре с config.js (prices.services и masters.list)
   в корне сайта — бот их не читает напрямую, он отдельный сервис. */
export const SHOP = {
  masters: [
    { id: "artem", name: "Артём" },
    { id: "ildar", name: "Ильдар" },
    { id: "maksim", name: "Максим" },
    { id: "any", name: "Любой свободный" }
  ],
  services: [
    { id: "classic", name: "Классическая стрижка" },
    { id: "fade", name: "Fade и машинка" },
    { id: "nozzle", name: "Стрижка под насадку" },
    { id: "kid", name: "Детская, до 12 лет" },
    { id: "duo", name: "Отец + сын" },
    { id: "beard", name: "Моделирование бороды" },
    { id: "royal", name: "Королевское бритьё" },
    { id: "head", name: "Бритьё головы" },
    { id: "edge", name: "Окантовка" },
    { id: "combo", name: "Стрижка + борода" },
    { id: "evening", name: "«Вечер»: стрижка, борода, бритьё" },
    { id: "camo", name: "Камуфляж седины" },
    { id: "style", name: "Укладка" },
    { id: "mask", name: "Маска и скраб для лица" }
  ]
};
