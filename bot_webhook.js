// ===============================
// BOT TELEGRAM AUTO POST + BUTTON (WEBHOOK MODE)
// ===============================

import express from "express";
import bodyParser from "body-parser";
import TelegramBot from "node-telegram-bot-api";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID; // ID channel atau grup tujuan (misal: -1001234567890)
const PORT = process.env.PORT || 10000;

if (!TELEGRAM_TOKEN) {
  console.error("❌ TELEGRAM_TOKEN belum diatur di Render Environment!");
  process.exit(1);
}

// Inisialisasi Express dan bot (tanpa polling)
const app = express();
app.use(bodyParser.json());
const bot = new TelegramBot(TELEGRAM_TOKEN);

// ===============================
// ROUTE UTAMA
// ===============================
app.get("/", (req, res) => {
  res.send("✅ Bot Auto Post aktif via Webhook!");
});

// ===============================
// ROUTE UNTUK WEBHOOK
// ===============================
app.post(`/webhook/${TELEGRAM_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ===============================
// HANDLER BOT
// ===============================

// Saat /start diketik di chat bot
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `👋 Halo ${msg.from.first_name}!  
Saya bot auto-post. Gunakan tombol di bawah untuk posting ke channel.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📝 Kirim Pesan ke Channel", callback_data: "post_now" }],
          [{ text: "📢 Info Bot", callback_data: "info" }],
        ],
      },
    }
  );
});

// Saat tombol ditekan
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const action = query.data;

  if (action === "post_now") {
    await bot.sendMessage(
      CHAT_ID,
      `🚀 *Pesan Otomatis dari Bot!*\n\nDiposting oleh: @${query.from.username || "Anonim"}`,
      { parse_mode: "Markdown" }
    );
    await bot.sendMessage(chatId, "✅ Pesan berhasil dikirim ke channel!");
  } else if (action === "info") {
    await bot.sendMessage(
      chatId,
      "🤖 Bot ini digunakan untuk auto post ke channel Telegram secara otomatis dengan dukungan tombol interaktif."
    );
  }

  bot.answerCallbackQuery(query.id);
});

// ===============================
// JALANKAN SERVER
// ===============================
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
  console.log("✅ Bot webhook aktif dan siap menerima event dari Telegram!");
});
