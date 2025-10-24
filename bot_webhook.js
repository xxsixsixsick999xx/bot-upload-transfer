// =====================================
// BOT TELEGRAM AUTO POST + INLINE BUTTON (WEBHOOK MODE - FINAL FOR RENDER)
// =====================================

import express from "express";
import bodyParser from "body-parser";
import TelegramBot from "node-telegram-bot-api";
import schedule from "node-schedule";

// === KONFIGURASI ENVIRONMENT ===
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID; // ID grup/channel
const PORT = process.env.PORT || 10000;

// === INISIALISASI EXPRESS ===
const app = express();
app.use(bodyParser.json());

// === INISIALISASI TELEGRAM BOT (WEBHOOK MODE) ===
const bot = new TelegramBot(TELEGRAM_TOKEN);
const WEBHOOK_URL = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/webhook/${TELEGRAM_TOKEN}`;

await bot.setWebHook(WEBHOOK_URL);
console.log("✅ Webhook terhubung di:", WEBHOOK_URL);

// === TOMBOL INLINE ===
const buttons = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🌐 Website", url: "https://yourwebsite.com" },
        { text: "📢 Join Channel", url: "https://t.me/yourchannel" }
      ],
      [{ text: "ℹ️ Info", callback_data: "info" }]
    ]
  }
};

// === EVENT CALLBACK UNTUK TOMBOL ===
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === "info") {
    bot.answerCallbackQuery(query.id, { text: "Bot aktif 24 jam 🚀" });
    bot.sendMessage(chatId, "💡 Ini adalah pesan info dari bot kamu.");
  }
});

// === COMMAND MANUAL POST ===
bot.onText(/\/post/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    "🔥 Contoh pesan otomatis dengan tombol interaktif:",
    { ...buttons, parse_mode: "Markdown" }
  );
});

// === AUTO POST JADWAL (SETIAP JAM 9 PAGI) ===
schedule.scheduleJob("0 9 * * *", async () => {
  try {
    await bot.sendMessage(
      CHAT_ID,
      "🕘 Selamat pagi! Ini pesan otomatis harian dari bot kamu 😄",
      { ...buttons, parse_mode: "Markdown" }
    );
    console.log("✅ Auto post terkirim!");
  } catch (err) {
    console.error("❌ Gagal kirim auto post:", err.message);
  }
});

// === HANDLER WEBHOOK ===
app.post(`/webhook/${TELEGRAM_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// === ROUTE DEFAULT UNTUK RENDER ===
app.get("/", (req, res) => {
  res.send("✅ Bot Webhook Auto Post aktif dan berjalan lancar.");
});

// === JALANKAN SERVER ===
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
});
