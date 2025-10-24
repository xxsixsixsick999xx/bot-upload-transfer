// ========================================
// BOT TELEGRAM AUTO POST TERJADWAL + BUTTON (WEBHOOK MODE)
// ========================================

import express from "express";
import bodyParser from "body-parser";
import TelegramBot from "node-telegram-bot-api";
import cron from "node-cron";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID; // contoh: -1002184309231
const PORT = process.env.PORT || 10000;

if (!TELEGRAM_TOKEN || !CHAT_ID) {
  console.error("❌ TELEGRAM_TOKEN atau CHAT_ID belum diatur di Render Environment!");
  process.exit(1);
}

const app = express();
app.use(bodyParser.json());
const bot = new TelegramBot(TELEGRAM_TOKEN);

// ========================================
// ROUTE WEBHOOK
// ========================================
app.post(`/webhook/${TELEGRAM_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.get("/", (req, res) => res.send("✅ Auto-Post Bot Aktif via Webhook!"));

// ========================================
// /start DAN /post
// ========================================
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `👋 Halo ${msg.from.first_name || "teman"}!\n\nSaya bot auto-post 📢  
Gunakan /post untuk kirim pesan manual ke channel.  
Atau tunggu jadwal auto-post setiap hari jam 09.00 & 18.00 WIB.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📝 Kirim Pesan Manual", callback_data: "manual_post" }],
          [{ text: "🕒 Jadwal Post", callback_data: "schedule_info" }],
        ],
      },
    }
  );
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;

  if (query.data === "manual_post") {
    bot.sendMessage(chatId, "📝 Ketik pesan yang ingin kamu posting ke channel:");
    bot.once("message", async (msg) => {
      const textToPost = msg.text;
      await sendPostToChannel(textToPost);
      await bot.sendMessage(chatId, "✅ Pesan berhasil dikirim ke channel!");
    });
  } else if (query.data === "schedule_info") {
    bot.sendMessage(
      chatId,
      "📅 Jadwal auto-post aktif setiap hari:\n• 09.00 WIB\n• 18.00 WIB"
    );
  }

  bot.answerCallbackQuery(query.id);
});

// ========================================
// FUNGSI KIRIM PESAN KE CHANNEL
// ========================================
async function sendPostToChannel(text) {
  const date = new Date().toLocaleString("id-ID");
  await bot.sendMessage(
    CHAT_ID,
    `📢 *${text}*\n\n🕒 Diposting otomatis pada ${date}`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🌐 Kunjungi Website", url: "https://tokomu.com" }],
          [{ text: "❤️ Suka", callback_data: "like" }],
        ],
      },
    }
  );
}

// Handler untuk tombol “❤️ Suka”
bot.on("callback_query", async (query) => {
  if (query.data === "like") {
    await bot.answerCallbackQuery(query.id, { text: "❤️ Terima kasih!" });
  }
});

// ========================================
// JADWAL AUTO POST (pakai CRON)
// ========================================
// Format CRON: “menit jam * * *”
// 0 9 * * *  → Jam 09:00 WIB
// 0 18 * * * → Jam 18:00 WIB

cron.schedule("0 9 * * *", async () => {
  await sendPostToChannel("Selamat pagi! 🌞 Ini auto-post jam 9 pagi.");
});

cron.schedule("0 18 * * *", async () => {
  await sendPostToChannel("Selamat sore! 🌇 Auto-post jam 6 sore.");
});

// ========================================
// JALANKAN SERVER
// ========================================
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
  console.log("✅ Auto-post webhook aktif & jadwal berjalan!");
});
