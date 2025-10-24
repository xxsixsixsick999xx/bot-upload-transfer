// ==========================================
// FINAL STABLE VERSION - TELEGRAM x GOOGLE SHEETS BOT
// ==========================================
// ✅ Fitur:
// - Bot menerima foto bukti transfer (caption berisi Nama, Kode, Nominal).
// - Data otomatis disimpan ke Google Sheets.
// - Tanpa error dependencies (Express stable).
// ==========================================

import express from "express";
import bodyParser from "body-parser";
import { google } from "googleapis";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";

dotenv.config();

// === KONFIGURASI ===
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;
const GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS || "{}");
const PORT = process.env.PORT || 10000;

if (!TELEGRAM_TOKEN || !SPREADSHEET_ID || !SHEET_NAME || !GOOGLE_CREDENTIALS.client_email) {
  console.error("❌ Missing environment variables. Pastikan semua sudah diset di Render!");
  process.exit(1);
}

// === INISIALISASI EXPRESS ===
const app = express();
app.use(bodyParser.json());

// === INISIALISASI TELEGRAM (WEBHOOK MODE) ===
const bot = new TelegramBot(TELEGRAM_TOKEN);
const WEBHOOK_URL = `https://bot-upload-transfer.onrender.com/webhook/${TELEGRAM_TOKEN}`;

bot.setWebHook(WEBHOOK_URL)
  .then(() => console.log(`✅ Webhook aktif di: ${WEBHOOK_URL}`))
  .catch((err) => console.error("❌ Gagal set webhook:", err.message));

// === AUTH GOOGLE SHEETS ===
async function authorize() {
  const auth = new google.auth.GoogleAuth({
    credentials: GOOGLE_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return auth.getClient();
}

// === FUNGSI SIMPAN KE SHEET ===
async function appendToSheet(data) {
  try {
    const authClient = await authorize();
    const sheets = google.sheets({ version: "v4", auth: authClient });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:D1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [data] },
    });

    console.log("✅ Data tersimpan:", data);
    return true;
  } catch (err) {
    console.error("❌ Gagal menyimpan:", err.message);
    return false;
  }
}

// === HANDLE PESAN DARI TELEGRAM ===
app.post(`/webhook/${TELEGRAM_TOKEN}`, async (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// === SAAT USER MENGIRIM FOTO (BUKTI TRANSFER) ===
bot.on("photo", async (msg) => {
  try {
    const caption = msg.caption || "";
    const chatId = msg.chat.id;

    // Ekstrak data: Nama, Kode, Nominal
    const regex = /nama[:\-]?\s*(.+?)\s+kode[:\-]?\s*(\S+)\s+nominal[:\-]?\s*([\d.,]+)/i;
    const match = caption.match(regex);

    if (!match) {
      await bot.sendMessage(
        chatId,
        "⚠️ Format caption salah.\nGunakan format:\n\nNama: Budi\nKode: T01\nNominal: 150000"
      );
      return;
    }

    const [_, nama, kode, nominal] = match;
    const tanggal = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

    const data = [tanggal, nama.trim(), kode.trim(), nominal.trim()];
    const success = await appendToSheet(data);

    if (success) {
      await bot.sendMessage(chatId, "✅ Bukti transfer berhasil disimpan ke Google Sheets!");
    } else {
      await bot.sendMessage(chatId, "❌ Gagal menyimpan ke Google Sheets. Coba lagi nanti.");
    }
  } catch (err) {
    console.error("❌ Error handle photo:", err.message);
  }
});

// === SAAT BOT /START ===
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "👋 Hai! Kirim foto bukti transfer dengan caption seperti contoh:\n\nNama: Budi\nKode: T01\nNominal: 150000"
  );
});

// === JALANKAN SERVER ===
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
});
