# Бот записи — админка в Telegram

Принимает заявки с сайта (`config.js` → `integrations.bookingEndpoint`) и присылает
владельцу сообщение с кнопками «Подтвердить» / «Отменить». Админка — сам Telegram:
без пароля, без отдельного сайта.

Три варианта, выбирайте по вкусу — код у всех рабочий:

| Вариант | Где | Сложность |
| --- | --- | --- |
| **[vercel/](vercel/README.md)** ← начните отсюда | GitHub → Vercel | только браузер, вход по GitHub, без предупреждений, ~10 минут |
| **[apps-script/](apps-script/README.md)** | Google Таблицы + Apps Script | только браузер, но с экраном «Google не проверил приложение» |
| **[src/](src/index.js)** | Cloudflare Workers + D1 | нужен терминал, `wrangler`, аккаунт Cloudflare |

Уведомления с кнопками «Подтвердить/Отменить» — везде одинаково. `apps-script/` и `src/`
дополнительно хранят заявки в таблице/базе (команды `/today`, `/upcoming`); в `vercel/`
истории команд нет — сам чат с ботом и есть история. Cloudflare-вариант имеет смысл позже,
если понадобится общая инфраструктура для нескольких барбершопов сразу.

## Продажа шаблона другим барбершопам

Каждому клиенту — свой бот у BotFather и своя копия (таблица+скрипт, или воркер).
Отдать клиенту права администратора — значит добавить его `chat_id` в `ADMIN_CHAT_IDS`;
можно перечислить несколько id через запятую, если админов несколько. Инфраструктурой
может продолжать управлять разработчик — клиенту для работы нужен только Telegram.

## Важно про персональные данные (152-ФЗ)

Заявка содержит имя и телефон клиента. Google, Cloudflare и Telegram — зарубежные
сервисы, серверы вне России. Для демо и малого бизнеса на практике так делают часто,
но для клиента лучше явно проговорить этот риск (как и в `TEMPLATE.md` в корне
репозитория) и при необходимости обсудить с юристом или выбрать российский хостинг.

---

## Cloudflare-вариант: подробности

<details>
<summary>Развернуть инструкцию</summary>

1. **Бот в Telegram.** Напишите [@BotFather](https://t.me/BotFather) → `/newbot` → получите токен вида `123456:ABC-DEF...`.
2. **Аккаунт Cloudflare** (бесплатно, cloudflare.com) и установленный `wrangler`:
   ```
   cd bot
   npm install
   npx wrangler login
   ```
3. **База данных D1:**
   ```
   npx wrangler d1 create varg-barber-bot
   ```
   Скопируйте `database_id` из вывода команды в `wrangler.toml` (поле `database_id`).
4. **Секреты воркера:**
   ```
   npx wrangler secret put BOT_TOKEN        # токен из BotFather
   npx wrangler secret put ADMIN_CHAT_IDS   # chat_id владельца через запятую, см. ниже
   npx wrangler secret put BOOKING_SECRET   # любая случайная строка — защита /booking от спама
   ```
   Свой `chat_id` узнать просто: напишите боту `/start` (пока `ADMIN_CHAT_IDS` пуст, бот ответит
   вашим chat_id). Впишите его в секрет и переразверните — теперь вы админ.
5. **Создать таблицы и развернуть:**
   ```
   npm run db:init
   npm run deploy
   ```
   Wrangler выведет адрес воркера, например `https://varg-barber-bot.<ваш-домен>.workers.dev`.
6. **Подключить вебхук Telegram** (замените `<TOKEN>` и `<URL>`):
   ```
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<URL>/telegram"
   ```
7. **Подключить сайт.** В корневом `config.js` укажите:
   ```js
   bookingEndpoint: "https://varg-barber-bot.<ваш-домен>.workers.dev/booking?key=<BOOKING_SECRET>"
   ```

### Если меняете услуги или мастеров

Отредактируйте `bot/shop.config.js` (id и названия) в паре с `prices.services` и
`masters.list` в корневом `config.js` — бот не читает файлы сайта напрямую, это
отдельный сервис.

</details>
