// ===============================
// BOT UPLOAD BUKTI TRANSFER KE GOOGLE SHEETS (WEBHOOK MODE)
// ===============================

import express from "express";
import bodyParser from "body-parser";
import TelegramBot from "node-telegram-bot-api";
import { google } from "googleapis";

// === Konfigurasi dari Environment Variable ===
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;
const GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const PORT = process.env.PORT || 10000;

// === Inisialisasi Express ===
const app = express();
app.use(bodyParser.json());

// === Inisialisasi Telegram Bot (Mode Webhook) ===
const bot = new TelegramBot(TELEGRAM_TOKEN);
const WEBHOOK_URL = `https://YOUR-RENDER-APP-NAME.onrender.com/webhook/${TELEGRAM_TOKEN}`;

await bot.setWebHook(WEBHOOK_URL);
console.log("✅ Webhook terhubung di:", WEBHOOK_URL);

// === Fungsi koneksi ke Google Sheets ===
async function authorize() {
  const auth = new google.auth.GoogleAuth({
    credentials: GOOGLE_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return auth.getClient();
}

// === Fungsi menulis data ke Google Sheets ===
async function appendToSheet(data) {
  const authClient = await authorize();
  const sheets = google.sheets({ version: "v4", auth: authClient });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:C`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [data],
    },
  });
}

// === Handler untuk update Telegram ===
app.post(`/webhook/${TELEGRAM_TOKEN}`, async (req, res) => {
  const update = req.body;
  bot.processUpdate(update);
  res.sendStatus(200);
});

// === Saat user mengirim foto dengan caption ===
bot.on("photo", async (msg) => {
  const caption = msg.caption;
  if (!caption) {
    bot.sendMessage(msg.chat.id, "❌ Harap kirim foto dengan caption: nama kode nominal");
    return;
  }

  const parts = caption.trim().split(/\s+/);
  if (parts.length < 3) {
    bot.sendMessage(msg.chat.id, "⚠️ Format salah!\nGunakan format: `nama kode nominal`\nContoh: `suryani22 t02 900000`", { parse_mode: "Markdown" });
    return;
  }

  const nama = parts[0];
  const kode = parts[1].toUpperCase();
  const nominal = parts[2];

  try {
    await appendToSheet([nama, kode, nominal]);
    bot.sendMessage(msg.chat.id, `✅ Data berhasil disimpan!\n\n*Nama:* ${nama}\n*Kode:* ${kode}\n*Nominal:* Rp${nominal}`, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("❌ ERROR appendToSheet:", err.message);
    bot.sendMessage(msg.chat.id, "⚠️ Gagal menyimpan data ke Google Sheets.");
  }
});

// === Jalankan server ===
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
});
