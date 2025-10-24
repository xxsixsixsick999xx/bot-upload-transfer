// =======================================
// BOT UPLOAD TRANSFER (FINAL RENDER VERSION)
// =======================================
import express from "express";
import bodyParser from "body-parser";
import { google } from "googleapis";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";

dotenv.config();

// === Konfigurasi dari environment ===
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || "Sheet1";
const PORT = process.env.PORT || 10000;

if (!TELEGRAM_TOKEN || !SPREADSHEET_ID || !process.env.GOOGLE_CREDENTIALS) {
  console.error("❌ Missing environment variables. Pastikan semua sudah diset di Render!");
  process.exit(1);
}

// === Parse Google Credentials ===
let GOOGLE_CREDENTIALS;
try {
  GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);
} catch (err) {
  console.error("⚠️ Format GOOGLE_CREDENTIALS salah atau tidak valid JSON!");
  process.exit(1);
}

// === Setup Express ===
const app = express();
app.use(bodyParser.json());

// === Setup Telegram Bot (Webhook) ===
const bot = new TelegramBot(TELEGRAM_TOKEN);
const WEBHOOK_URL = `https://bot-upload-transfer.onrender.com/webhook/${TELEGRAM_TOKEN}`;

await bot.setWebHook(WEBHOOK_URL);
console.log(`✅ Webhook aktif di: ${WEBHOOK_URL}`);

// === Fungsi autentikasi Google Sheets ===
async function authorize() {
  const auth = new google.auth.GoogleAuth({
    credentials: GOOGLE_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return auth.getClient();
}

// === Fungsi untuk menambahkan data ke Sheets ===
async function appendToSheet(data) {
  const authClient = await authorize();
  const sheets = google.sheets({ version: "v4", auth: authClient });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:C`,
    valueInputOption: "RAW",
    requestBody: { values: [data] },
  });
}

// === Handler Webhook Telegram ===
app.post(`/webhook/${TELEGRAM_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// === Pesan panduan ===
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `📬 Kirim data dengan format:\nNama/Kode/Nominal\nContoh: *Suryani/T02/50000*`,
    { parse_mode: "Markdown" }
  );
});

// === Handler pesan masuk ===
bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;

  const parts = msg.text.split("/");
  if (parts.length !== 3) {
    bot.sendMessage(
      msg.chat.id,
      `⚠️ Format salah!\nGunakan format: Nama/Kode/Nominal\nContoh: *Suryani/T02/50000*`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const [nama, kode, nominal] = parts.map((x) => x.trim());
  try {
    await appendToSheet([nama, kode, nominal]);
    bot.sendMessage(
      msg.chat.id,
      `✅ Data tersimpan!\n👤 Nama: ${nama}\n💳 Kode: ${kode}\n💰 Nominal: ${nominal}`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("❌ Gagal menyimpan:", err.message);
    bot.sendMessage(
      msg.chat.id,
      `⚠️ Gagal menyimpan ke Google Sheets.\nPeriksa kredensial atau izin akses.`,
      { parse_mode: "Markdown" }
    );
  }
});

// === Jalankan server ===
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
});
