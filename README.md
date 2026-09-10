# Zolotoy Barber — Sartaroshxona sayti

Premium sartaroshxona uchun to‘liq funksional web-sayt: mijozlar uchun ochiq sayt (xizmatlar, ustalar, onlayn navbat,
profil) va sartaroshxona egasi/xodimi uchun boshqaruv paneli (Zentro uslubidagi admin dashboard).

## Texnologiyalar

- **React 19** + **Vite** — frontend
- **React Router DOM** — sahifalar navigatsiyasi
- **Redux Toolkit** + **React Redux** — global state (auth, barbers, services, appointments, inventory, payments,
  customers, reviews, chat, UI)
- **Tailwind CSS** — dizayn (qora + oltin "barber" mavzusi)
- **Framer Motion** — animatsiyalar (scroll-reveal, hover, floating elementlar, sahifa o‘tishlari)
- **Recharts** — statistik grafiklar (admin dashboard va hisobotlar)
- **React Icons** — ikonalar
- **Axios** — HTTP so‘rovlar
- **Express** + **PostgreSQL** — backend REST API (`server/pgserver.js`), port **4000** — ma’lumotlar bazasi
  sifatida bepul [Neon](https://neon.tech) Postgres ishlatiladi
- **vite-plugin-pwa** — PWA (telefon/planshetga o‘rnatiladigan qiladi, offline keshlash)

## O‘rnatish

```bash
npm install
```

Backend uchun bepul Postgres bazasi kerak ([neon.tech](https://neon.tech) yoki [supabase.com](https://supabase.com)
— ikkalasi ham bepul). Baza yaratib, connection string’ini oling va `.env.example`ni `.env` qilib nusxalab,
`DATABASE_URL`ga yozing. Keyin jadvallarni yaratish va boshlang‘ich ma’lumotlarni (`server/db.json`) ko‘chirish
uchun bir marta:

```bash
npm run migrate
```

## Ishga tushirish

Sayt to‘liq ishlashi uchun **frontend (Vite)** va **backend (Express + Postgres)** parallel ishlashi kerak.
Buning uchun bitta terminalda shu buyruqni yozish kifoya:

```bash
npm start
```

Shu bitta buyruq ikkalasini ham birga ishga tushiradi:

- frontend (Vite) — **http://localhost:5173**
- backend (Express + Postgres) — **http://localhost:4000**

Terminalda `[WEB]` (frontend) va `[API]` (backend) prefiksli loglar aralash ko‘rinadi — ikkalasi ham
ishga tushganini shundan bilib olasiz. To‘xtatish uchun terminalda `Ctrl + C` bosing.

> `npm run dev:all` buyrug‘i ham xuddi shunday ishlaydi (`npm start`ning sinonimi).

### Agar xohlasangiz — alohida-alohida (ikkita terminalda):

```bash
# 1-terminal — backend (Express + Postgres), http://localhost:4000
npm run server

# 2-terminal — frontend (Vite dev server), http://localhost:5173
npm run dev
```

Saytni ochish: **http://localhost:5173**

> Agar login/ro‘yxatdan o‘tish ishlamasa yoki "Backend serverga ulanib bo‘lmadi" degan xabar chiqsa —
> `npm run server` alohida ishga tushganini va `.env`dagi `DATABASE_URL` to‘g‘ri ekanini tekshiring
> (4000-port band emasligiga ham ishonch hosil qiling).
>
> **Muhim:** lokal kompyuter va production (Vercel/Render) bitta Postgres bazasiga ulanadi — bu ataylab
> shunday qilingan, shunda ikkalasida ham bir xil ma’lumot ko‘rinadi va hech qayerda "yo‘qolib qolmaydi".

## Demo hisoblar

| Rol | Email | Parol |
|---|---|---|
| Admin | admin@zolotoy.uz | admin123 |
| Mijoz | ali@example.com | 1234 |
| Mijoz | sardor@example.com | 1234 |

Yangi mijozlar **Ro‘yxatdan o‘tish** sahifasi orqali ro‘yxatdan o‘tishi mumkin — barcha ma’lumotlar
Postgres bazasidagi `users` jadvaliga real vaqtda yoziladi.

## Telegram bot

`server/bot/` — saytdagi support chatni va yangi navbatlarni Telegramga ulovchi bot. Long polling rejimida
ishlaydi (public URL shart emas), shuning uchun **lokal kompyuterda ham** to‘liq ishlaydi — u faqat
`npm run server` (Express + Postgres, port 4000) bilan gaplashadi. Ammo shu sababli u faqat kimdir uni
qo‘lda ishga tushirgan paytda ishlaydi — lokal ravishda ishga tushirilsa, kompyuter o‘chirilganda yoki
terminal yopilganda bot ham to‘xtaydi ("uxlab qoladi").

Sozlash (lokal):

1. Telegramda [@BotFather](https://t.me/BotFather) ga `/newbot` yozing, tokenni oling.
2. `.env.example` faylini `.env` qilib nusxalang, `TELEGRAM_BOT_TOKEN` ga tokenni yozing.
3. `npm run bot` (yoki `npm start` — u WEB, API, BOT uchtasini birga ishga tushiradi) ni ishga tushiring,
   botga Telegramda `/start` yozing — u sizga chat ID’ingizni qaytaradi.
4. Shu ID’ni `.env` faylidagi `TELEGRAM_ADMIN_CHAT_ID` ga yozib, botni qayta ishga tushiring.

Shundan keyin: mijoz saytda yozgan har bir support xabari botga keladi (mijoz xabariga "Reply" qilib javob
yozsangiz — u to‘g‘ridan-to‘g‘ri saytdagi chatga tushadi), va har bir yangi navbat ✅ Tasdiqlash / ❌ Bekor
qilish tugmalari bilan botga keladi. `.env` sozlanmagan bo‘lsa, bot shunchaki o‘chirilgan holatda qoladi —
`npm start` qolgan ikkitasini (WEB, API) normal ishga tushiradi.

### 24/7 ishlashi uchun (Render'ga deploy)

Botni doim yoniq ushlab turish uchun uni ham backend kabi Render'ga deploy qilish mumkin —
[render.yaml](render.yaml)da `barber-uz-bot` nomli ikkinchi service shu uchun qo‘shilgan
(`node server/bot/index.js`). Render'da:

1. Blueprint'ni qayta sync qiling (yoki qo‘lda "New Web Service" qo‘shing, start command
   `node server/bot/index.js`) — `barber-uz-bot` paydo bo‘ladi.
2. Uning Environment sozlamalarida `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`,
   `TELEGRAM_SUPER_ADMIN_USERNAME` va (ixtiyoriy) `SITE_URL` ni qo‘lda kiriting (`sync: false` bo‘lgani
   uchun bular Git'ga yozilmaydi).
3. Render'ning bepul tarifi 15 daqiqa kirish (HTTP so‘rov) bo‘lmasa xizmatni "uxlatib qo‘yadi" — bot esa
   faqat Telegramga chiqib turadi, hech kim unga HTTP so‘rov yubormaydi. Shuning uchun bepul tashqi pinger
   ([cron-job.org](https://cron-job.org) yoki UptimeRobot) sozlab, `barber-uz-bot`ning Render URL'iga
   ~10 daqiqada bir marta so‘rov yuboring — shundagina u chinakam 24/7 ishlaydi.

## Loyihaning tuzilishi

```
src/
  api/           — axios client (backend REST API bilan bog‘lanish)
  app/           — Redux store
  assets/images/ — protsedura bilan yaratilgan SVG rasm-placeholderlar (ustalar, hero)
  components/    — umumiy komponentlar (Navbar, Footer, ChatWidget, kartalar...)
  components/admin/ — admin uchun Modal, ConfirmDialog, StatCard
  features/      — Redux slice'lar (auth, barbers, services, appointments, inventory,
                    payments, customers, reviews, chat, ui) — har biri backend bilan
                    to‘liq CRUD (fetch/create/update/delete) qiladi
  hooks/         — useAuth, useConversationId
  layouts/       — ClientLayout (ochiq sayt), AdminLayout (boshqaruv paneli)
  pages/client/  — Bosh sahifa, Xizmatlar, Ustalar, Navbat olish, Kirish, Ro‘yxat,
                    Profil, Aloqa, 404
  pages/admin/   — Dashboard, Navbatlar, Mijozlar, Ustalar, Xizmatlar, Ombor,
                    To‘lovlar, Hisobotlar, Support chat
  routes/        — ProtectedRoute (login talab qiladi), AdminRoute (faqat admin)
server/
  pgserver.js    — Postgres ustidan ishlaydigan REST API (users, barbers, services,
                    appointments, inventory, payments, reviews, messages, conversations)
  db.json        — boshlang‘ich/namunaviy ma’lumotlar (faqat `npm run migrate` uchun,
                    runtime’da o‘qilmaydi)
  bot/           — Telegram bot (chat va navbat bildirishnomalarini Telegramga ulaydi)
scripts/
  gen-images.mjs — ustalar va hero uchun SVG rasmlarni qayta generatsiya qilish
```

## Xususiyatlar

- **Real login/ro‘yxatdan o‘tish** — Postgres orqali, foydalanuvchilar bazaga yoziladi
- **To‘liq CRUD** — barcha resurslar (navbatlar, mijozlar, ustalar, xizmatlar, ombor, to‘lovlar) uchun
  qo‘shish/o‘qish/yangilash/o‘chirish
- **Onlayn navbat olish** — 4 bosqichli wizard (xizmat → usta → sana/vaqt → ma’lumotlar), band qilingan
  vaqtlar avtomatik bloklanadi
- **Admin dashboard** — tushum dinamikasi, navbatlar holati, usta bo‘yicha statistika (Recharts grafiklar)
- **Hisobotlar** — davr bo‘yicha filtrlash (7/14/30 kun), CSV eksport
- **Support chat** — mijoz va admin o‘rtasida xabar almashish, Postgres’ga saqlanadi, 3 soniyalik polling
  bilan "jonli" yangilanish (WebSocket server yo‘q, polling simulyatsiya qiladi) — Telegram’ga ulangan
  mijoz/admin uchun xabarlar bot orqali Telegram’ga ham forward qilinadi
- **PWA** — telefon/planshetga "Bosh ekranga qo‘shish" orqali o‘rnatish mumkin, offline keshlash
- **To‘liq responsive** — mobil, planshet va desktop uchun moslashgan
- **Animatsiyalar** — Framer Motion bilan scroll-reveal, floating elementlar, sahifa o‘tish animatsiyalari

## Muhim eslatmalar

- Bu — **demo/o‘quv loyihasi**. Backend’da autentifikatsiya/avtorizatsiya qatlami yo‘q (istalgan client to‘g‘ridan-
  to‘g‘ri REST API’ga yoza oladi), parollar oddiy matn ko‘rinishida saqlanadi (hash qilinmagan). Ishlab chiqarish
  (production) muhitida haqiqiy auth (JWT/sessiya) va parollarni hash qilish (bcrypt) ishlatish kerak.
- Xarita uchun OpenStreetMap embed (API kalitisiz) ishlatilgan — internet ulanishi kerak.
- Shrift (Playfair Display, Inter) Google Fonts orqali yuklanadi — internet ulanishi kerak, aks holda tizim
  shriftiga qaytadi.
- Ustalar va hero rasmlar tashqi fotosuratlar emas, balki loyihaning o‘zida protseduraviy tarzda yaratilgan
  SVG grafikalar (`scripts/gen-images.mjs`). Xohlasangiz `src/assets/images/` papkasidagi fayllarni real
  fotosuratlar bilan almashtirishingiz mumkin (xuddi shu fayl nomlarini saqlab qoling yoki
  `src/assets/images/index.js`ni yangilang).

## Build (production)

```bash
npm run build
npm run preview
```

## PWA sifatida o‘rnatish

`npm run build` va `npm run preview` (yoki haqiqiy hostingga joylashtirilgandan so‘ng) — brauzerda "Bosh
ekranga qo‘shish" / "Install app" tugmasi orqali telefon yoki planshetga o‘rnatish mumkin.
