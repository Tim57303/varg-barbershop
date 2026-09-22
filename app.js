/* ═══════════════════════════════════════════════════════════════════
   app.js — собирает страницу из config.js и запускает поведение.
   Под нового клиента этот файл трогать не нужно.
   ═══════════════════════════════════════════════════════════════════ */
"use strict";
const SITE = window.SITE;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rub = n => n.toLocaleString("ru-RU") + " ₽";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const imgSrc = n => /[/.]/.test(n) ? n : `img/${n}.jpg`;
const img = (name, alt, extra = "") => `<img src="${imgSrc(name)}" data-img="${esc(name)}" alt="${esc(alt)}" ${extra}>`;
const ARROW = `<svg class="arrow" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M2 9h13M10 3.5 15.5 9 10 14.5"/></svg>`;
const go = (id, cls, label, extra = "") => `<a class="${cls}" role="link" tabindex="0" data-go="${id}" ${extra}>${label}</a>`;

/* ── Производные данные из настроек ── */
const C = SITE.contacts;
const SERVICES = SITE.prices.services;
const FLAT = SERVICES.flatMap(g => g.items);
const GLOSS = SITE.gloss;
const MASTERS = [{ id: "any", n: SITE.masters.anyLabel }, ...SITE.masters.list.map(m => ({ id: m.id, n: m.name }))];
const HOURS = { from: SITE.booking.firstHour, to: SITE.booking.lastHour };
const BOOKING_ENDPOINT = SITE.integrations.bookingEndpoint || "";
const PAYMENT_URL = SITE.integrations.paymentUrl || "";
const PREPAY = SITE.booking.prepayPercent || 30;
const WD = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MON = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

/* ── Внутренние переходы: у таких кнопок нет href, только data-go="раздел".
   Обычная ссылка-якорь во встроенном окне Claude превращается в «внешнюю» (Open External Link). ── */
function goTo(id) {
  if (id === "top") return scrollTo({ top: 0, behavior: "smooth" });
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
document.addEventListener("click", e => {
  const a = e.target.closest("[data-go]");
  if (a && a.dataset.go) goTo(a.dataset.go);
});
document.addEventListener("keydown", e => {
  const a = e.target.closest?.("[data-go]");
  if (a && a.dataset.go && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); goTo(a.dataset.go); }
});

/* ── Мобильное меню: гамбургер в шапке открывает список разделов ── */
(() => {
  const btn = $("#burgerBtn"), panel = $("#mnav");
  if (!btn || !panel) return;
  const setOpen = open => { btn.setAttribute("aria-expanded", String(open)); panel.hidden = !open; };
  btn.addEventListener("click", () => setOpen(panel.hidden));
  panel.addEventListener("click", e => { if (e.target.closest("[data-go]")) setOpen(false); });
  addEventListener("keydown", e => { if (e.key === "Escape" && !panel.hidden) { setOpen(false); btn.focus(); } });
  addEventListener("resize", () => { if (innerWidth > 920) setOpen(false); });
})();

/* ═══ Сборка страницы ═══ */
(function render() {
  const B = SITE.brand, M = C.metro;

  // цвета
  for (const [k, v] of Object.entries(SITE.theme || {})) document.documentElement.style.setProperty("--" + k, v);

  // шапка
  $(".logo").setAttribute("aria-label", `${B.name} — ${B.type.toLowerCase()}, на главную`);
  $(".logo__name").textContent = B.short;
  $(".logo__sub").textContent = `${B.type} · ${B.city}`;

  // главный экран
  const H = SITE.hero;
  $("#hero").innerHTML = `
  <div class="wrap hero__grid">
    <div>
      <p class="eyebrow mono">${H.eyebrow}</p>
      <h1 class="display rough">${H.title}</h1>
      <p class="hero__lead">${H.lead}</p>
      <div class="hero__cta">${go("zapis", "btn", H.cta + ARROW)}${go("uslugi", "btn btn--line", H.cta2)}</div>
      <dl class="facts">
        <div><dt class="mono">Метро</dt><dd>${M.name},<br>${M.walkShort}</dd></div>
        <div><dt class="mono">Часы</dt><dd>${C.hoursShort}</dd></div>
        <div><dt class="mono">Телефон</dt><dd><a href="tel:${C.phone}">${C.phoneText}</a></dd></div>
      </dl>
    </div>
    <div class="hero__photo">
      <div class="hero__ruler" aria-hidden="true"></div>
      <div class="hero__frame">${img(H.img, H.alt, 'width="1000" height="1250" fetchpriority="high"')}</div>
      <div class="hero__pole" aria-hidden="true"></div>
      <div class="stamp" aria-hidden="true">
        <svg viewBox="0 0 150 150">
          <defs><path id="circ" d="M75 75 m-56 0 a56 56 0 1 1 112 0 a56 56 0 1 1 -112 0"/></defs>
          <circle class="disc" cx="75" cy="75" r="72"/>
          <circle cx="75" cy="75" r="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
          <text><textPath href="#circ" startOffset="0">${esc(B.stamp)}</textPath></text>
          <text class="core" x="75" y="86" text-anchor="middle">${esc(B.name)}</text>
        </svg>
      </div>
    </div>
  </div>`;

  // бегущая строка
  const mq = SITE.marquee.map(t => `<span>${esc(t)}</span>`).join("");
  $(".marquee__track").innerHTML = mq + mq;

  // экран «Услуги»
  const S = SITE.stage, items = S.items.map(it => ({ ...it, s: FLAT.find(x => x.id === it.svc) }));
  const stage = $("#uslugi");
  stage.style.setProperty("--n", items.length);
  stage.innerHTML = `<div class="stage__pin">
    <div class="stage__photos">
      ${items.map((it, i) => `<figure class="ph${i === 0 ? " on" : ""}" data-i="${i}">${img(it.photo, it.alt, `loading="${i === 0 ? "eager" : "lazy"}"`)}<figcaption class="mono">${it.caption}</figcaption></figure>`).join("")}
      <div class="stage__intro dark" style="background:none">
        <p class="eyebrow mono" style="color:var(--chalk)">${S.eyebrow}</p>
        <h2 class="display">${S.title}</h2>
        <p class="stage__hint mono"><svg viewBox="0 0 16 22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 1v18M2 13l6 6 6-6"/></svg>${S.hint}</p>
      </div>
    </div>
    <div class="stage__panel dark">
      <h2 class="display">${S.panelTitle}</h2>
      <div class="svcs" id="svcs">
        ${items.map((it, i) => `<article class="svc${i === 0 ? " on" : ""}" data-i="${i}">
          <div class="svc__head"><h3 class="svc__name">${it.s.n}</h3><span class="svc__price">${rub(it.s.p)}</span></div>
          <div class="svc__body"><div><p>${it.desc}</p>
            <div class="svc__meta"><span class="mono">${it.s.m} мин</span>${go("zapis", "btn btn--line btn--sm", "Записаться", `data-svc="${it.s.id}"`)}</div></div></div>
        </article>`).join("")}
      </div>
      <div class="stage__bar" aria-hidden="true">${items.map((_, i) => `<i${i === 0 ? ' class="on"' : ""}></i>`).join("")}</div>
    </div>
    <div class="stage__edge" aria-hidden="true"></div>
  </div>`;

  // прайс
  const P = SITE.prices, G = P.guide;
  $("#pricesHead").innerHTML = `<div><p class="eyebrow mono">${P.eyebrow}</p><h2 class="display rough" style="margin-top:18px">${P.title}</h2></div><p>${P.lead}</p>`;
  $("#priceGrid").innerHTML = SERVICES.map(g => `
    <section class="pg"><h3>${g.g}</h3><ul>${g.items.map(i =>
      `<li><span class="n">${i.n}</span>${GLOSS[i.id] ? `<button class="q" type="button" data-term="${i.id}" aria-haspopup="dialog" aria-expanded="false" aria-label="Что такое: ${esc(i.n)}">?</button>` : ""}<i class="lead"></i><span class="t">${i.m} мин</span><span class="p">${rub(i.p)}</span></li>`).join("")}
    </ul></section>`).join("");
  const guide = $("#guide");
  if (G.mm?.length) {
    guide.innerHTML = `<div><p class="eyebrow mono">${G.eyebrow}</p><h3>${G.title}</h3><p>${G.text}</p></div>
      <div role="img" aria-label="Шкала длины волос под насадку в миллиметрах">
        <div class="bars">${G.mm.map(mm => `<div><i style="height:${Math.round(6 + mm * 6.6)}px"></i></div>`).join("")}</div>
        <div class="guide__scale">${G.mm.map(mm => `<span>${String(mm).replace(".", ",")} мм</span>`).join("")}</div>
      </div>`;
  } else guide.remove();

  // мастера
  const MS = SITE.masters;
  $("#mastersHead").innerHTML = `<p class="eyebrow mono">${MS.eyebrow}</p><h2 class="display rough" style="margin-top:18px">${MS.title}</h2><p>${MS.lead}</p>`;
  $("#mgrid").innerHTML = MS.list.map(m => `
    <article class="mcard">
      <span class="mcard__letter" aria-hidden="true">${esc(m.name[0])}</span>
      <p class="mono mcard__role">${m.role}</p>
      <h3>${m.name}</h3>
      <div class="mcard__spec">${m.stats.map(s => `<div><b>${s.v}</b><span class="mono">${s.l}</span></div>`).join("")}</div>
      <p>${m.about}</p>
      <ul class="tags">${m.tags.map(([id, label]) => `<li><button class="term" type="button" data-term="${id}" aria-haspopup="dialog" aria-expanded="false">${label}</button></li>`).join("")}</ul>
      ${go("zapis", "btn btn--line btn--sm", `Записаться${m.to ? " к " + m.to : ""}`, `data-master="${m.id}"`)}
    </article>`).join("");

  // работы
  const W = SITE.works;
  $("#worksHead").innerHTML = `<div><p class="eyebrow mono">${W.eyebrow}</p><h2 class="display rough" style="margin-top:18px">${W.title}</h2></div><p>${W.lead}</p>`;
  $("#mosaic").innerHTML = W.items.map((w, i) => `
    <figure class="work work--${"abcdef"[i]}${w.mono ? " work--mono" : ""}">${img(w.img, w.alt, `loading="lazy"${w.pos ? ` style="object-position:${w.pos}"` : ""}`)}<figcaption class="mono">${w.cap.map(c => `<span>${c}</span>`).join("")}</figcaption></figure>`).join("");

  // место
  const PL = SITE.place;
  $("#placeText").innerHTML = `<p class="eyebrow mono">${PL.eyebrow}</p><h2 class="display rough">${PL.title}</h2><p class="place__lead">${PL.lead}</p>
    <ul class="principles">${PL.principles.map(p => `<li><b>${p.t}</b><span>${p.d}</span></li>`).join("")}</ul>`;
  $("#placePhotos").innerHTML = `<div class="big">${img(PL.big.img, PL.big.alt, 'loading="lazy"')}</div><div class="pole" aria-hidden="true"></div><div class="small">${img(PL.small.img, PL.small.alt, 'loading="lazy"')}</div>`;

  // запись
  const BK = SITE.booking;
  $("#bkEyebrow").textContent = BK.eyebrow;
  $("#bkTitle").innerHTML = BK.title;
  $("#bkLead").textContent = BK.lead;
  $("#bkLeather").innerHTML = `${img(BK.leatherImg, "", 'loading="lazy"')}<span class="mono">${esc(BK.leatherCaption)}</span>`;
  $$("[data-tel]").forEach(a => { a.href = "tel:" + C.phone; if (a.dataset.tel === "text") a.textContent = C.phoneText; });

  // контакты
  $("#cTitle").textContent = SITE.map.title;
  const dow = C.hours;
  $("#cfacts").innerHTML = `
    <li><i class="ic ic--metro" aria-hidden="true" style="background:${M.color}">М</i><div><b>${M.name}</b><span>${M.line} · ${M.walk}</span></div></li>
    <li><i class="ic" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 18s6-5.2 6-10a6 6 0 0 0-12 0c0 4.8 6 10 6 10Z"/><circle cx="10" cy="8" r="2.2"/></svg></i><div><b>${C.address}</b><span>${C.district} · ${C.addressNote}</span></div></li>
    <li><i class="ic" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="10" r="7.5"/><path d="M10 5.5V10l3 2"/></svg></i><div><b>${dow[0].days} ${dow[0].time}</b><span>${dow.slice(1).map(h => `${h.days} ${h.time}`).join(" · ")}</span></div></li>`;
  $("#mapLink").href = SITE.map.link;
  if (SITE.map.mode === "yandex" && SITE.map.widget) {
    $("#map").classList.add("map--live");
    $("#map").innerHTML = `<iframe src="${esc(SITE.map.widget)}" title="Карта: ${esc(C.address)}" loading="lazy" allowfullscreen></iframe>`;
  }

  // подвал
  const L = SITE.legal, soc = C.social.filter(s => s.url);
  $("#footEyebrow").textContent = `${B.type} · ${C.metro.name === "" ? B.city : "м. " + M.name}`;
  $("#footCols").innerHTML = `
    <div><h4 class="mono">Разделы</h4>${go("uslugi", "", "Услуги")}${go("ceny", "", "Цены")}${go("mastera", "", "Мастера")}${go("zapis", "", "Запись")}</div>
    <div><h4 class="mono">Связь</h4><a href="tel:${C.phone}">${C.phoneText}</a><a href="mailto:${C.email}">${C.email}</a>${go("kontakty", "", C.address)}</div>
    ${soc.length ? `<div><h4 class="mono">Мы в сети</h4>${soc.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join("")}</div>` : ""}`;
  $("#footBrand").textContent = B.short;
  $("#footBottom").innerHTML = `<span>© ${new Date().getFullYear()} ${esc(B.name)} ${esc(B.type)}, ${esc(B.city)}</span>
    <span>${esc(L.owner)} · ИНН ${esc(L.inn)}${L.ogrn ? " · ОГРН " + esc(L.ogrn) : ""}</span>
    <a href="privacy.html" target="_blank" rel="noopener">Политика конфиденциальности</a>`;

  // структурированные данные для поисковиков (Google, Яндекс)
  const ld = {
    "@context": "https://schema.org", "@type": "BarberShop", name: B.name, url: SITE.seo.url,
    telephone: C.phone, email: C.email, priceRange: SITE.seo.priceRange,
    image: SITE.seo.url + "og.jpg",
    address: { "@type": "PostalAddress", streetAddress: C.address, addressLocality: B.city, addressCountry: "RU" },
    openingHoursSpecification: C.hours.map(h => ({ "@type": "OpeningHoursSpecification", dayOfWeek: h.dow, opens: h.open, closes: h.close })),
    sameAs: soc.map(s => s.url),
    hasOfferCatalog: { "@type": "OfferCatalog", name: "Услуги и цены", itemListElement: FLAT.map(i => ({ "@type": "Offer", price: i.p, priceCurrency: "RUB", itemOffered: { "@type": "Service", name: i.n } })) }
  };
  const tag = document.createElement("script"); tag.type = "application/ld+json"; tag.textContent = JSON.stringify(ld);
  document.head.append(tag);

  // Яндекс.Метрика (если указан счётчик)
  const ym = SITE.integrations.yandexMetrika;
  if (ym) {
    window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); }; window.ym.l = +new Date();
    const s = document.createElement("script"); s.async = true; s.src = "https://mc.yandex.ru/metrika/tag.js"; document.head.append(s);
    window.ym(+ym, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true });
  }
})();

/* Встроенные фото (в сборке «одним файлом»): подменяют файлы из img/ */
if (window.IMG) $$("img[data-img]").forEach(i => { const u = IMG[i.dataset.img]; if (u) i.src = u; });

/* ═══ Схема проезда: плавно прочерчиваем маршрут, когда блок виден ═══ */
(() => {
  const map = $(".map");
  if (!map || !("IntersectionObserver" in window)) return;
  map.classList.add("pre");
  new IntersectionObserver((entries, io) => {
    if (entries.some(e => e.isIntersecting)) { map.classList.remove("pre"); io.disconnect(); }
  }, { threshold: .35 }).observe(map);
})();

/* ═══ Сцена «фото → услуги» ═══ */
(() => {
  const stage = $("#uslugi"), photos = $$(".ph", stage), svcs = $$(".svc", stage), bars = $$(".stage__bar i", stage);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const N = svcs.length;
  let idx = -1, ticking = false;

  function setActive(i) {
    if (i === idx) return;
    idx = i;
    photos.forEach((p, j) => {                                    // накопительно: обратный ход «стирает» кадры
      const on = j <= i;
      if (p.classList.contains("on") !== on) {                     // кадр меняется — пускаем линию лезвия
        p.classList.add("anim"); clearTimeout(p._blade);
        p._blade = setTimeout(() => p.classList.remove("anim"), 1100);
      }
      p.classList.toggle("on", on);
    });
    svcs.forEach((s, j) => s.classList.toggle("on", j === i));
    bars.forEach((b, j) => b.classList.toggle("on", j <= i));
  }
  function update() {
    ticking = false;
    const total = stage.offsetHeight - innerHeight;
    const s = clamp(-stage.getBoundingClientRect().top / total, 0, 1);
    const t = clamp(s / 0.18, 0, 1);
    stage.style.setProperty("--k", (t * t * (3 - 2 * t)).toFixed(4));
    const rest = clamp((s - 0.18) / 0.82, 0, 0.9999);
    setActive(Math.floor(rest * N));
  }
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener("scroll", req, { passive: true });
  addEventListener("resize", req);
  update();

  svcs.forEach((s, j) => s.addEventListener("click", e => {
    if (e.target.closest("a")) return;
    const total = stage.offsetHeight - innerHeight;
    const top = stage.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + total * (0.18 + 0.82 * (j + 0.5) / N), behavior: "smooth" });
  }));
})();

/* ═══ Пояснения к терминам (нажатие на «?» или на тег мастера) ═══ */
(() => {
  const pop = document.createElement("div");
  pop.className = "pop"; pop.hidden = true; pop.setAttribute("role", "dialog");
  document.body.append(pop);
  let anchor = null;

  function place() {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return close();
    const w = pop.offsetWidth, h = pop.offsetHeight;
    const x = Math.min(Math.max(12, r.left), innerWidth - w - 12);
    let y = r.bottom + 8;
    if (y + h > innerHeight - 12) y = Math.max(12, r.top - h - 8);
    pop.style.left = x + "px"; pop.style.top = y + "px";
  }
  function close() {
    anchor?.setAttribute("aria-expanded", "false");
    anchor = null; pop.hidden = true;
  }
  function open(btn) {
    const id = btn.dataset.term, g = GLOSS[id], s = FLAT.find(x => x.id === id);
    if (!g || !s) return;
    close();
    pop.innerHTML = `<h4>${esc(g.t)}</h4><p>${esc(g.d)}</p>
      <div class="pop__foot"><span class="mono">${s.m} мин · ${rub(s.p)}</span>
      <button class="btn btn--line btn--sm" type="button" data-svc="${id}" data-go="zapis">Записаться</button></div>`;
    anchor = btn; btn.setAttribute("aria-expanded", "true");
    pop.hidden = false; place();
  }
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-term]");
    if (t) { anchor === t ? close() : open(t); return; }
    if (!e.target.closest(".pop") || e.target.closest(".pop [data-svc]")) close();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  addEventListener("scroll", () => requestAnimationFrame(place), { passive: true });
  addEventListener("resize", place);
})();

/* ═══ Галерея: нажатие на фото включает цвет (на телефоне нет наведения) ═══ */
$$(".work").forEach(w => {
  w.tabIndex = 0;
  const flip = () => w.classList.toggle("on");
  w.addEventListener("click", flip);
  w.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
});

/* ═══ Запись ═══ */
(() => {
  const form = $("#bookForm"), done = $("#bookDone"), submitBtn = $("#submitBtn");
  const svcBox = $("#svcChips"), masterBox = $("#masterChips"), daysEl = $("#days"), slotsEl = $("#slots"), paysEl = $("#pays");
  const nameEl = $("#name"), phoneEl = $("#phone"), err = $("#err");
  const MASTER_IDS = MASTERS.slice(1).map(m => m.id);
  const KEY = "varg_bookings";
  let state = { time: null }, lastBooking = null;

  const pad = h => String(h).padStart(2, "0");
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const keyOf = (date, hour, master) => `${date}_${hour}_${master}`;
  const whenText = (d, h) => `${WD[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}, ${pad(h)}:00`;

  /* ── Способы оплаты ── */
  const PAY = [
    { id: "salon",   n: "В салоне",        d: "Картой или наличными после услуги",       amt: () => 0 },
    { id: "prepay",  n: `Предоплата ${PREPAY}%`,  d: "Закрепляет время, остальное на месте",     amt: s => Math.round(s.p * PREPAY / 100 / 10) * 10 },
    { id: "full",    n: "Оплатить сразу",  d: "Картой или через СБП, без кассы после",    amt: s => s.p }
  ];

  /* ── Хранилище записей ──────────────────────────────────────────
     Общий интерфейс:  busy(key) → занят ли слот;  claim(booking) → {ok};
                       onChange(fn) → подписка на изменения занятости.
     • db    — общая база платформы: занятость видна всем посетителям сразу,
               личные данные клиентов читает только администратор;
     • local — запасной вариант: браузер посетителя (+ BOOKING_ENDPOINT, если задан). */
  function localStore() {
    const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
    const save = l => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch {} };
    return {
      kind: "local",
      busy: key => load().some(b => b.status !== "canceled" && keyOf(b.date, b.hour, b.master) === key),
      onChange() {},
      async claim(b) {
        if (this.busy(keyOf(b.date, b.hour, b.master))) return { ok: false };
        save([...load(), b]);
        if (BOOKING_ENDPOINT) {
          try { await fetch(BOOKING_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }); } catch {}
        }
        return { ok: true };
      },
      admin: null
    };
  }

  function dbStore(db, uid, canEdit) {
    const taken = new Set(), subs = new Set();
    db.collection("busy").onSnapshot(snap => {
      taken.clear();
      snap.docs.forEach(d => { if (d.data()?.no) taken.add(d.id); });
      subs.forEach(f => f());
    }, e => console.warn("busy:", e));
    const patch = async (b, fn) => {
      const ref = db.doc("bookings/" + b.uid), s = await ref.get(), it = s.exists && s.data().items?.[b.no];
      if (it) await ref.set({ items: { ...s.data().items, [b.no]: fn(it) } });
    };
    return {
      kind: "db",
      busy: key => taken.has(key),
      onChange: f => subs.add(f),
      async claim(b) {
        // «занять слот»: короткая аренда документа, потом проверка и запись — так двое не запишутся на одно время
        const slot = db.doc("busy/" + keyOf(b.date, b.hour, b.master));
        const lease = await slot.acquire({ holder: uid, ttlMs: 8000 });
        if (!lease.acquired) return { ok: false };
        const cur = await slot.get();
        if (cur.exists && cur.data()?.no) return { ok: false };
        await slot.set({ date: b.date, hour: b.hour, master: b.master, no: b.no });
        try {
          const mine = db.doc("bookings/" + uid), s = await mine.get();
          const items = { ...(s.exists ? s.data().items : {}) };
          items[b.no] = b;
          await mine.set({ items });
        } catch (e) { await slot.delete().catch(() => {}); throw e; }
        return { ok: true };
      },
      admin: canEdit ? {
        watch(fn) {
          return db.collection("bookings").onSnapshot(snap => {
            const all = [];
            snap.docs.forEach(d => Object.values(d.data()?.items || {}).forEach(b => all.push({ ...b, uid: d.id })));
            fn(all);
          }, e => console.warn("bookings:", e));
        },
        async cancel(b) {
          await db.doc("busy/" + keyOf(b.date, b.hour, b.master)).delete();
          await patch(b, it => ({ ...it, status: "canceled" }));
        },
        setPaid: b => patch(b, it => ({ ...it, pay: { ...(it.pay || {}), status: "paid" } }))
      } : null
    };
  }

  let store = localStore();
  const isBusy = (date, hour, master) => master === "any"
    ? MASTER_IDS.every(m => store.busy(keyOf(date, hour, m)))
    : store.busy(keyOf(date, hour, master));

  /* ── Форма ── */
  svcBox.innerHTML = SERVICES.map(g => `<p class="grp mono">${g.g}</p><div class="chips">${g.items.map(i =>
    `<label class="chip"><input type="radio" name="svc" value="${i.id}"><span>${i.n}<em>${rub(i.p)}</em></span></label>`).join("")}</div>`).join("");
  masterBox.innerHTML = MASTERS.map((m, i) =>
    `<label class="chip"><input type="radio" name="master" value="${m.id}" ${i === 0 ? "checked" : ""}><span>${m.n}</span></label>`).join("");
  const getSvc = () => FLAT.find(x => x.id === $("input[name=svc]:checked", svcBox)?.value);
  const setSvc = id => { const el = $(`input[name=svc][value="${id}"]`, svcBox); if (el) el.checked = true; };
  const getMaster = () => $("input[name=master]:checked", masterBox)?.value || "any";
  const setMaster = id => { const el = $(`input[name=master][value="${id}"]`, masterBox); if (el) el.checked = true; };
  const getPay = () => $("input[name=pay]:checked", paysEl)?.value || "salon";
  setSvc("combo");

  /* Чипы «Услуга» и «Мастер» — обычные radio, а их штатно нельзя снять повторным
     кликом. Здесь — можно: щёлкнули по уже выбранному чипу (мышью или тапом) —
     он снимается, оставляя «не выбрано».
     Клик по подписи (input скрыт через pointer-events:none) браузер обрабатывает
     в два шага: сначала событие click с target = подпись, затем — как часть
     штатного поведения label — второе, синтетическое click с target = сам input.
     pointerdown запоминает, был ли input отмечен ДО этого нажатия; если да —
     снимаем отметку самостоятельно. Делаем это НЕ через preventDefault: у
     radio/checkbox отмена клика откатывает checked к состоянию ДО клика, то
     есть обратно в «отмечено» — ровно туда, откуда мы хотим уйти. Поэтому просто
     ждём, пока браузер закончит своё стандартное действие, и снимаем отметку
     следующим тиком. */
  function makeDeselectable(container) {
    let pending = null;
    container.addEventListener("pointerdown", e => {
      const chip = e.target.closest(".chip");
      const input = chip?.querySelector("input[type=radio]");
      pending = input?.checked ? input : null;
    });
    container.addEventListener("click", e => {
      if (e.target.tagName !== "INPUT") return;           // ждём именно второй, синтетический клик — по самому input
      const was = pending; pending = null;                // разово: годится только для клика сразу после pointerdown
      if (e.target !== was) return;
      const input = e.target;
      setTimeout(() => { input.checked = false; input.dispatchEvent(new Event("change", { bubbles: true })); }, 0);
    });
  }
  makeDeselectable(svcBox);
  makeDeselectable(masterBox);

  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
  daysEl.innerHTML = days.map((d, i) => `
    <label class="day"><input type="radio" name="day" value="${i}" ${i === 0 ? "checked" : ""}>
      <span><b>${WD[d.getDay()]}</b><em>${d.getDate()}</em><small>${MON[d.getMonth()]}</small></span></label>`).join("");
  const dayIdx = () => +($("input[name=day]:checked", daysEl)?.value ?? 0);

  function renderPays() {
    const s = getSvc(), cur = getPay();
    if (!s) { paysEl.innerHTML = `<p class="fine" style="grid-column:1/-1">Выберите услугу — тогда появятся способы оплаты.</p>`; return; }
    paysEl.innerHTML = PAY.map(p => `<label class="pay"><input type="radio" name="pay" value="${p.id}" ${p.id === cur ? "checked" : ""}>
      <span class="pay__c"><b>${p.n}</b><small>${p.d}</small><em>${p.amt(s) ? rub(p.amt(s)) : "0 ₽ сейчас"}</em></span></label>`).join("");
  }
  function renderSlots() {
    const date = iso(days[dayIdx()]), now = new Date(), master = getMaster(), html = [];
    for (let h = HOURS.from; h <= HOURS.to; h++) {
      const past = date === iso(now) && h * 60 <= now.getHours() * 60 + now.getMinutes() + 30;
      const off = past || isBusy(date, h, master);
      if (off && state.time === h) state.time = null;
      html.push(`<label class="slot"><input type="radio" name="time" value="${h}" ${off ? "disabled" : ""} ${state.time === h ? "checked" : ""}><span>${pad(h)}:00</span></label>`);
    }
    slotsEl.innerHTML = html.join("");
    summary();
  }
  function summary() {
    const s = getSvc(), d = days[dayIdx()], m = MASTERS.find(x => x.id === getMaster());
    if (!s) {
      $("#sumTxt").textContent = "Сначала выберите услугу";
      $("#sumMaster").textContent = `${m.n} · ${state.time == null ? "выберите время" : whenText(d, state.time)}`;
      $("#sumNow").textContent = ""; $("#sumPrice").textContent = "—"; $("#submitLbl").textContent = "Записаться";
      return;
    }
    const pay = PAY.find(p => p.id === getPay()), now = pay.amt(s);
    $("#sumTxt").textContent = `${s.n} · ${s.m} мин`;
    $("#sumMaster").textContent = `${m.n} · ${state.time == null ? "выберите время" : whenText(d, state.time)}`;
    $("#sumNow").textContent = now ? "К оплате сейчас" : "Итого, оплата в салоне";
    $("#sumPrice").textContent = rub(now || s.p);
    $("#submitLbl").textContent = now ? "Записаться и оплатить" : "Записаться";
  }

  daysEl.addEventListener("change", () => { state.time = null; renderSlots(); });
  slotsEl.addEventListener("change", e => { state.time = +e.target.value; summary(); });
  svcBox.addEventListener("change", () => { renderPays(); summary(); });
  masterBox.addEventListener("change", renderSlots);
  paysEl.addEventListener("change", summary);

  phoneEl.addEventListener("input", () => {
    let d = phoneEl.value.replace(/\D/g, "");
    if (d.startsWith("8")) d = "7" + d.slice(1);
    if (d && !d.startsWith("7")) d = "7" + d;
    d = d.slice(0, 11);
    phoneEl.value = d ? ["+7", d.length > 1 ? ` (${d.slice(1, 4)}` : "", d.length > 4 ? `) ${d.slice(4, 7)}` : "", d.length > 7 ? `-${d.slice(7, 9)}` : "", d.length > 9 ? `-${d.slice(9, 11)}` : ""].join("") : "";
  });

  function fail(msg, el) { err.textContent = msg; el?.focus?.(); }
  const busyBtn = on => {
    submitBtn.disabled = on;
    const svcNow = getSvc(), willPay = svcNow && PAY.find(p => p.id === getPay()).amt(svcNow);
    $("#submitLbl").textContent = on ? "Записываем…" : (willPay ? "Записаться и оплатить" : "Записаться");
  };

  /* Переход к оплате: PAYMENT_URL — шаблон ссылки платёжного сервиса */
  function openPayment(b) {
    if (!PAYMENT_URL) { $("#payNote").hidden = false; return; }
    const url = PAYMENT_URL.replace("{amount}", b.pay.amount).replace("{order}", encodeURIComponent(b.no)).replace("{desc}", encodeURIComponent(`Запись В-${b.no}`));
    window.open(url, "_blank", "noopener");
  }
  $("#payGo").addEventListener("click", () => lastBooking && openPayment(lastBooking));

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const digits = phoneEl.value.replace(/\D/g, ""), svc = getSvc();
    if (!svc) return fail("Выберите услугу.", svcBox.querySelector("input"));
    if (state.time == null) return fail("Выберите день и свободное время.", slotsEl.querySelector("input:not(:disabled)"));
    if (!nameEl.value.trim()) return fail("Напишите, как к вам обращаться.", nameEl);
    if (digits.length < 11) return fail(`Проверьте телефон: нужно 11 цифр, например ${C.phoneText}.`, phoneEl);
    if (!$("#consent").checked) return fail("Отметьте согласие на обработку персональных данных.", $("#consent"));
    err.textContent = "";

    const d = days[dayIdx()], date = iso(d), hour = state.time, sel = getMaster();
    const payDef = PAY.find(p => p.id === getPay()), amount = payDef.amt(svc);
    const candidates = sel === "any" ? MASTER_IDS.filter(m => !store.busy(keyOf(date, hour, m))) : [sel];
    let booking = null;

    busyBtn(true);
    try {
      for (const m of candidates) {
        const b = { no: String(Math.floor(1000 + Math.random() * 9000)), date, hour, master: m, service: svc.id,
                    name: nameEl.value.trim().slice(0, 60), phone: phoneEl.value, price: svc.p, status: "new",
                    pay: { method: payDef.id, amount, status: amount ? "pending" : "none" }, created: new Date().toISOString() };
        if ((await store.claim(b)).ok) { booking = b; break; }
      }
    } catch (ex) {
      console.warn(ex); busyBtn(false);
      return fail("Не удалось сохранить запись. Попробуйте ещё раз или позвоните нам.");
    }
    busyBtn(false);
    if (!booking) { state.time = null; renderSlots(); return fail("Это время только что заняли. Выберите другое."); }

    lastBooking = booking;
    $("#dName").textContent = booking.name;
    $("#dSvc").textContent = `${svc.n} · ${svc.m} мин`;
    $("#dMaster").textContent = MASTERS.find(m => m.id === booking.master).n;
    $("#dWhen").textContent = whenText(d, hour);
    $("#dPay").textContent = amount ? `${payDef.n} · ${rub(amount)}` : `В салоне · ${rub(svc.p)}`;
    $("#dNo").textContent = "В-" + booking.no;
    $("#payBox").hidden = !amount;
    $("#dPayNow").textContent = rub(amount);
    $("#payNote").hidden = true;
    $("#dLead").textContent = amount ? "Время закреплено за вами. Осталось оплатить, и всё готово." : "Мы перезвоним для подтверждения. Если нужно перенести, позвоните по номеру ниже.";
    $("#demoNote").hidden = !(store.kind === "local" && !BOOKING_ENDPOINT);
    form.hidden = true; done.hidden = false;
    done.scrollIntoView({ block: "center", behavior: "smooth" });
  });

  $("#again").addEventListener("click", () => {
    done.hidden = true; form.hidden = false; state.time = null; nameEl.value = ""; phoneEl.value = "";
    renderSlots(); form.scrollIntoView({ block: "center", behavior: "smooth" });
  });

  /* Предвыбор из карточек услуг, подсказок и мастеров */
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-svc],[data-master]");
    if (!a) return;
    if (a.dataset.svc) { setSvc(a.dataset.svc); renderPays(); }
    if (a.dataset.master) setMaster(a.dataset.master);
    if (!done.hidden) { done.hidden = true; form.hidden = false; }
    state.time = null; renderSlots();
  });

  /* ── Журнал записей: скрытая панель, только для администратора ── */
  function mountAdmin(admin) {
    const drawer = $("#admin"), btn = $("#adminBtn"), list = $("#adminList");
    drawer.hidden = false; btn.hidden = false;
    const toggle = open => { drawer.classList.toggle("open", open); btn.setAttribute("aria-expanded", open); if (open) $("#adminX").focus(); };
    btn.addEventListener("click", () => toggle(!drawer.classList.contains("open")));
    $("#adminX").addEventListener("click", () => toggle(false));
    addEventListener("keydown", e => { if (e.key === "Escape") toggle(false); });

    let armed = null, rows = [];
    admin.watch(all => {
      const today = iso(new Date());
      rows = all.filter(b => b.date >= today).sort((a, b) => (a.date + pad(a.hour)).localeCompare(b.date + pad(b.hour)));
      $("#adminN").textContent = rows.filter(b => b.status !== "canceled").length;
      $("#adminEmpty").hidden = rows.length > 0;
      list.innerHTML = rows.map(b => {
        const [y, m, dd] = b.date.split("-").map(Number), dt = new Date(y, m - 1, dd);
        const svc = FLAT.find(x => x.id === b.service), master = MASTERS.find(x => x.id === b.master);
        const pay = b.pay || { method: "salon", amount: 0, status: "none" }, off = b.status === "canceled", id = `${esc(b.uid)}|${esc(b.no)}`;
        const payPill = pay.method === "salon" ? `<span class="pill">Оплата в салоне</span>`
          : pay.status === "paid" ? `<span class="pill pill--ok">Оплачено ${rub(+pay.amount || 0)}</span>`
          : `<span class="pill pill--wait">Ждёт оплаты ${rub(+pay.amount || 0)}</span>`;
        return `<li class="arow ${off ? "canceled" : ""}">
          <div class="t"><b>${WD[dt.getDay()]}, ${dt.getDate()} ${MON[dt.getMonth()]}</b><span>${pad(b.hour)}:00</span></div>
          <div><strong>${esc(b.name)}</strong><a href="tel:+${esc(String(b.phone).replace(/\D/g, ""))}">${esc(b.phone)}</a></div>
          <div class="s">${esc(svc?.n || b.service)} · ${esc(master?.n || b.master)} · ${rub(+b.price || 0)}</div>
          <div class="m"><div class="pills">${payPill}${off ? `<span class="pill pill--off">Отменена</span>` : ""}</div>
            <div class="acts">${pay.method !== "salon" && pay.status !== "paid" ? `<button type="button" data-paid="${id}">Оплачено</button>` : ""}<button type="button" data-cancel="${id}">Отменить</button></div></div></li>`;
      }).join("");
    });
    list.addEventListener("click", async e => {
      const paid = e.target.closest("[data-paid]"), cancel = e.target.closest("[data-cancel]"), el = paid || cancel;
      if (!el) return;
      const [uid, no] = (paid ? el.dataset.paid : el.dataset.cancel).split("|"), b = rows.find(r => r.uid === uid && r.no === no);
      if (!b) return;
      if (cancel && armed !== el.dataset.cancel) {                 // отмена — с подтверждением вторым нажатием
        armed = el.dataset.cancel; el.textContent = "Точно отменить?";
        setTimeout(() => { if (armed === cancel?.dataset.cancel) { armed = null; el.textContent = "Отменить"; } }, 4000);
        return;
      }
      armed = null; el.disabled = true;
      try { await (paid ? admin.setPaid(b) : admin.cancel(b)); } catch (ex) { console.warn(ex); el.disabled = false; el.textContent = "Не вышло, ещё раз"; }
    });
  }

  renderPays();
  renderSlots();

  /* Подключаем общую базу, если страница запущена там, где она есть.
     Пока ответа нет, форма уже работает в локальном режиме. */
  (async () => {
    try {
      if (!window.claude?.use) return;
      const [db, user] = await Promise.all([claude.use("db"), claude.use("user")]);
      if (!db || !user) return;
      const uid = await user.id();
      if (!uid) return;
      const canEdit = !!(await user.canEdit());
      store = dbStore(db, uid, canEdit);
      store.onChange(renderSlots);
      renderSlots();
      if (store.admin) mountAdmin(store.admin);
    } catch (ex) { console.warn("db недоступна, остаёмся в локальном режиме:", ex); }
  })();
})();
