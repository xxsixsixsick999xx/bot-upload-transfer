import express from "express";
import bodyParser from "body-parser";
import TelegramBot from "node-telegram-bot-api";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

// === Konfigurasi ===
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;
const GOOGLE_CREDENTIALS = process.env.GOOGLE_CREDENTIALS
  ? JSON.parse(process.env.GOOGLE_CREDENTIALS)
  : null;

const PORT = process.env.PORT || 10000;

if (!GOOGLE_CREDENTIALS) {
  console.error("⚠️ GOOGLE_CREDENTIALS tidak ditemukan atau format salah.");
}

// === Inisialisasi ===
const app = express();
app.use(bodyParser.json());

const bot = new TelegramBot(TELEGRAM_TOKEN);
const WEBHOOK_URL = `https://bot-upload-transfer.onrender.com/webhook/${TELEGRAM_TOKEN}`;

// === Set webhook ===
try {
  await bot.setWebHook(WEBHOOK_URL);
  console.log("✅ Webhook aktif di:", WEBHOOK_URL);
} catch (err) {
  console.error("❌ Gagal set webhook:", err.message);
}

// === Fungsi otorisasi Google ===
async function authorize() {
  const auth = new google.auth.GoogleAuth({
    credentials: GOOGLE_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return auth.getClient();
}

// === Simpan data ke Google Sheets ===
async function appendToSheet(nama, kode, nominal) {
  try {
    const authClient = await authorize();
    const sheets = google.sheets({ version: "v4", auth: authClient });

    const values = [[nama, kode, nominal, new Date().toLocaleString()]];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:D`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    return true;
  } catch (err) {
    console.error("❌ Gagal menyimpan:", err.message);
    return false;
  }
}

// === Webhook route ===
app.post(`/webhook/${TELEGRAM_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// === Logika bot ===
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (!msg.caption && !msg.text) {
    return bot.sendMessage(
      chatId,
      "📩 Kirim data dengan format:\nNama/Kode/Nominal\nContoh: *Suryani/T02/50000*",
      { parse_mode: "Markdown" }
    );
  }

  const text = msg.caption || msg.text;
  const parts = text.split("/");

  if (parts.length !== 3) {
    return bot.sendMessage(
      chatId,
      "⚠️ Format salah.\nGunakan format: Nama/Kode/Nominal\nContoh: *Suryani/T02/50000*",
      { parse_mode: "Markdown" }
    );
  }

  const [nama, kode, nominal] = parts.map((x) => x.trim());
  const success = await appendToSheet(nama, kode, nominal);

  if (success) {
    bot.sendMessage(
      chatId,
      `✅ Data tersimpan!\n👤 Nama: *${nama}*\n💳 Kode: *${kode}*\n💰 Nominal: *${nominal}*\n📄 Tercatat di Google Sheets.`,
      { parse_mode: "Markdown" }
    );
  } else {
    bot.sendMessage(
      chatId,
      "⚠️ Gagal menyimpan ke Google Sheets. Periksa kredensial atau izin akses.",
      { parse_mode: "Markdown" }
    );
  }
});

// === Jalankan server ===
app.listen(PORT, () => {
  console.log(`🚀 Server aktif di port ${PORT}`);
});
