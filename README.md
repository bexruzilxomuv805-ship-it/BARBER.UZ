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
- **json-server** — backend o‘rnini bosuvchi REST API (`server/db.json`), port **4000**
- **vite-plugin-pwa** — PWA (telefon/planshetga o‘rnatiladigan qiladi, offline keshlash)

## O‘rnatish

```bash
npm install
```

## Ishga tushirish

Sayt to‘liq ishlashi uchun **frontend (Vite)** va **backend (json-server)** parallel ishlashi kerak.
Buning uchun bitta terminalda shu buyruqni yozish kifoya:

```bash
npm start
```

Shu bitta buyruq ikkalasini ham birga ishga tushiradi:

- frontend (Vite) — **http://localhost:5173**
- backend (json-server) — **http://localhost:4000**

Terminalda `[WEB]` (frontend) va `[API]` (backend) prefiksli loglar aralash ko‘rinadi — ikkalasi ham
ishga tushganini shundan bilib olasiz. To‘xtatish uchun terminalda `Ctrl + C` bosing.

> `npm run dev:all` buyrug‘i ham xuddi shunday ishlaydi (`npm start`ning sinonimi).

### Agar xohlasangiz — alohida-alohida (ikkita terminalda):

```bash
# 1-terminal — backend (json-server), http://localhost:4000
npm run server

# 2-terminal — frontend (Vite dev server), http://localhost:5173
npm run dev
```

Saytni ochish: **http://localhost:5173**

> Agar login/ro‘yxatdan o‘tish ishlamasa yoki "Backend serverga ulanib bo‘lmadi" degan xabar chiqsa —
> `npm run server` alohida ishga tushganini tekshiring (4000-port band emasligiga ishonch hosil qiling).

## Demo hisoblar

| Rol | Email | Parol |
|---|---|---|
| Admin | admin@zolotoy.uz | admin123 |
| Mijoz | ali@example.com | 1234 |
| Mijoz | sardor@example.com | 1234 |

Yangi mijozlar **Ro‘yxatdan o‘tish** sahifasi orqali ro‘yxatdan o‘tishi mumkin — barcha ma’lumotlar
`server/db.json` faylidagi `users` bo‘limiga real vaqtda yoziladi.

## Loyihaning tuzilishi

```
src/
  api/           — axios client (json-server bilan bog‘lanish)
  app/           — Redux store
  assets/images/ — protsedura bilan yaratilgan SVG rasm-placeholderlar (ustalar, hero)
  components/    — umumiy komponentlar (Navbar, Footer, ChatWidget, kartalar...)
  components/admin/ — admin uchun Modal, ConfirmDialog, StatCard
  features/      — Redux slice'lar (auth, barbers, services, appointments, inventory,
                    payments, customers, reviews, chat, ui) — har biri json-server bilan
                    to‘liq CRUD (fetch/create/update/delete) qiladi
  hooks/         — useAuth, useConversationId
  layouts/       — ClientLayout (ochiq sayt), AdminLayout (boshqaruv paneli)
  pages/client/  — Bosh sahifa, Xizmatlar, Ustalar, Navbat olish, Kirish, Ro‘yxat,
                    Profil, Aloqa, 404
  pages/admin/   — Dashboard, Navbatlar, Mijozlar, Ustalar, Xizmatlar, Ombor,
                    To‘lovlar, Hisobotlar, Support chat
  routes/        — ProtectedRoute (login talab qiladi), AdminRoute (faqat admin)
server/
  db.json        — json-server ma’lumotlar bazasi (users, barbers, services,
                    appointments, inventory, payments, reviews, messages, conversations)
scripts/
  gen-images.mjs — ustalar va hero uchun SVG rasmlarni qayta generatsiya qilish
```

## Xususiyatlar

- **Real login/ro‘yxatdan o‘tish** — json-server orqali, foydalanuvchilar `db.json`ga yoziladi
- **To‘liq CRUD** — barcha resurslar (navbatlar, mijozlar, ustalar, xizmatlar, ombor, to‘lovlar) uchun
  qo‘shish/o‘qish/yangilash/o‘chirish
- **Onlayn navbat olish** — 4 bosqichli wizard (xizmat → usta → sana/vaqt → ma’lumotlar), band qilingan
  vaqtlar avtomatik bloklanadi
- **Admin dashboard** — tushum dinamikasi, navbatlar holati, usta bo‘yicha statistika (Recharts grafiklar)
- **Hisobotlar** — davr bo‘yicha filtrlash (7/14/30 kun), CSV eksport
- **Support chat** — mijoz va admin o‘rtasida xabar almashish, `db.json`ga saqlanadi, 3 soniyalik polling
  bilan "jonli" yangilanish (json-server oddiy REST server bo‘lgani uchun WebSocket emas, polling simulyatsiya
  qiladi)
- **PWA** — telefon/planshetga "Bosh ekranga qo‘shish" orqali o‘rnatish mumkin, offline keshlash
- **To‘liq responsive** — mobil, planshet va desktop uchun moslashgan
- **Animatsiyalar** — Framer Motion bilan scroll-reveal, floating elementlar, sahifa o‘tish animatsiyalari

## Muhim eslatmalar

- Bu — **demo/o‘quv loyihasi**. `json-server` haqiqiy backend emas, parollar oddiy matn ko‘rinishida saqlanadi
  (hash qilinmagan). Ishlab chiqarish (production) muhitida haqiqiy backend (Node/Express, NestJS va h.k.) va
  parollarni hash qilish (bcrypt) ishlatish kerak.
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
