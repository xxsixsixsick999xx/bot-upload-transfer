// ===================================================
// BOT UPLOAD TRANSFER (FINAL VERSION - FIX 503 ERROR)
// ===================================================

import express from "express";
import bodyParser from "body-parser";
import TelegramBot from "node-telegram-bot-api";
import { google } from "googleapis";

// === KONFIGURASI ENVIRONMENT VARIABLE ===
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;
const GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);

if (!TELEGRAM_TOKEN || !SPREADSHEET_ID || !SHEET_NAME || !GOOGLE_CREDENTIALS) {
  console.error("❌ Environment variable belum lengkap!");
  process.exit(1);
}

// === INISIALISASI EXPRESS ===
const app = express();
app.use(bodyParser.json());

// === INISIALISASI BOT (MODE WEBHOOK, TANPA POLLING) ===
const bot = new TelegramBot(TELEGRAM_TOKEN);
const WEBHOOK_URL = `https://inces-bot.onrender.com/webhook/${TELEGRAM_TOKEN}`;

await bot.setWebHook(WEBHOOK_URL);
console.log(`✅ Webhook terhubung di: ${WEBHOOK_URL}`);

// === AUTENTIKASI GOOGLE SHEETS ===
async function authorize() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: GOOGLE_CREDENTIALS,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const client = await auth.getClient();
    console.log("✅ Autentikasi Google berhasil");
    return client;
  } catch (err) {
    console.error("❌ Gagal autentikasi Google:", err.message);
    throw err;
  }
}

// === SIMPAN DATA KE SHEETS ===
async function appendToSheet(values) {
  try {
    const auth = await authorize();
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:C`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [values],
      },
    });
    console.log("✅ Data berhasil disimpan ke Sheets:", values);
    return res.status;
  } catch (err) {
    console.error("❌ Gagal menyimpan ke Google Sheets:", err.response?.data || err.message);
    return null;
  }
}

// === ROUTE UNTUK WEBHOOK TELEGRAM ===
app.post(`/webhook/${TELEGRAM_TOKEN}`, async (req, res) => {
  try {
    const update = req.body;
    if (update.message) {
      const msg = update.message;
      const text = msg.text?.trim();

      // Format pesan: Nama/Kode/Nominal
      if (text && text.includes("/")) {
        const parts = text.split("/");
        if (parts.length === 3) {
          const [nama, kode, nominal] = parts;
          const result = await appendToSheet([nama, kode, nominal]);
          if (result) {
            await bot.sendMessage(
              msg.chat.id,
              `✅ Data berhasil disimpan:\n👤 Nama: ${nama}\n💳 Kode: ${kode}\n💰 Nominal: ${nominal}`
            );
          } else {
            await bot.sendMessage(
              msg.chat.id,
              "⚠️ Gagal menyimpan ke Google Sheets. Cek kembali server atau credentials."
            );
          }
        } else {
          await bot.sendMessage(
            msg.chat.id,
            "❌ Format salah.\nGunakan format: `Nama/Kode/Nominal`\nContoh: `Suryani22/T02/50000`",
            { parse_mode: "Markdown" }
          );
        }
      } else {
        await bot.sendMessage(
          msg.chat.id,
          "📩 Kirim data dengan format: `Nama/Kode/Nominal`\nContoh: `Suryani22/T02/50000`",
          { parse_mode: "Markdown" }
        );
      }
    }

    // Wajib kirim 200 agar Telegram tidak error 503
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.sendStatus(200); // tetap 200 agar tidak error 503
  }
});

// === JALANKAN SERVER EXPRESS ===
app.listen(process.env.PORT, () => {
  console.log(`🚀 Server berjalan di port ${process.env.PORT}`);
});
