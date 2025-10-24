// ===================================
// BOT TELEGRAM AUTO POST + INLINE BUTTON
// ===================================

import express from "express";
import TelegramBot from "node-telegram-bot-api";
import schedule from "node-schedule";

// === CONFIG ===
const TOKEN = process.env.TELEGRAM_TOKEN; // Token dari BotFather
const CHAT_ID = process.env.CHAT_ID; // ID grup/channel tujuan auto-post
const PORT = process.env.PORT || 10000;

const app = express();
const bot = new TelegramBot(TOKEN, { polling: true });

// === INLINE BUTTON TEMPLATE ===
const buttons = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🌐 Website", url: "https://yourwebsite.com" },
        { text: "📢 Join Channel", url: "https://t.me/yourchannel" },
      ],
      [{ text: "ℹ️ Info", callback_data: "info" }],
    ],
  },
};

// === EVENT CALLBACK BUTTON ===
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === "info") {
    bot.answerCallbackQuery(query.id, { text: "Bot aktif & berjalan lancar 🚀" });
    bot.sendMessage(chatId, "💡 Ini adalah pesan info dari bot.");
  }
});

// === COMMAND UNTUK MANUAL POST ===
bot.onText(/\/post/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "📢 *Posting Manual Dikirim!*", { parse_mode: "Markdown" });
  await bot.sendMessage(
    chatId,
    "🔥 Hai semua! Ini contoh posting dari bot otomatis dengan tombol interaktif!",
    { ...buttons, parse_mode: "Markdown" }
  );
});

// === AUTO POST SETIAP JAM 9 PAGI (bisa diubah) ===
schedule.scheduleJob("0 9 * * *", async () => {
  try {
    await bot.sendMessage(
      CHAT_ID,
      "🕘 Selamat pagi! Ini posting otomatis dari bot kamu 😄",
      { ...buttons, parse_mode: "Markdown" }
    );
    console.log("✅ Auto post terkirim!");
  } catch (err) {
    console.error("❌ Gagal kirim auto post:", err.message);
  }
});

// === SERVER EXPRESS (RENDER KOMPATIBEL) ===
app.get("/", (req, res) => {
  res.send("Bot Auto Post Aktif ✅");
});

app.listen(PORT, () => console.log(`🚀 Server berjalan di port ${PORT}`));
