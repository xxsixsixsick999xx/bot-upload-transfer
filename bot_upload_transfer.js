// ================================================
// BOT UPLOAD TRANSFER (FINAL FIX: SUPPORT CAPTION + TEXT)
// ================================================

import express from "express";
import bodyParser from "body-parser";
import TelegramBot from "node-telegram-bot-api";
import { google } from "googleapis";

// === ENVIRONMENT VARIABLE ===
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;
const GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const PORT = process.env.PORT || 10000;

// === CEK KONFIGURASI ===
if (!TELEGRAM_TOKEN || !SPREADSHEET_ID || !SHEET_NAME || !GOOGLE_CREDENTIALS) {
  console.error("❌ Environment variable belum lengkap!");
  process.exit(1);
}

// === INISIALISASI ===
const app = express();
app.use(bodyParser.json());
const bot = new TelegramBot(TELEGRAM_TOKEN);
const WEBHOOK_URL = `https://bot-upload-transfer.onrender.com/webhook/${TELEGRAM_TOKEN}`;

await bot.setWebHook(WEBHOOK_URL);
console.log(`✅ Webhook aktif di: ${WEBHOOK_URL}`);

// === AUTENTIKASI GOOGLE ===
async function authorize() {
  const auth = new google.auth.GoogleAuth({
    credentials: GOOGLE_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return await auth.getClient();
}

// === SIMPAN DATA KE SHEETS ===
async function appendToSheet(values) {
  try {
    const auth = await authorize();
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:C`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] },
    });
    console.log("✅ Data tersimpan:", values);
    return true;
  } catch (err) {
    console.error("❌ Gagal menyimpan:", err.response?.data || err.message);
    return false;
  }
}

// === ROUTE UNTUK TELEGRAM WEBHOOK ===
app.post(`/webhook/${TELEGRAM_TOKEN}`, async (req, res) => {
  try {
    const update = req.body;
    if (update.message) {
      const msg = update.message;
      // Ambil teks baik dari text maupun caption
      const text = msg.text?.trim() || msg.caption?.trim();

      if (text && text.includes("/")) {
        const parts = text.split("/");
        if (parts.length === 3) {
          const [nama, kode, nominal] = parts.map((v) => v.trim());
          const result = await appendToSheet([nama, kode, nominal]);
          if (result) {
            await bot.sendMessage(
              msg.chat.id,
              `✅ Data berhasil disimpan ke Google Sheets:\n👤 *Nama:* ${nama}\n💳 *Kode:* ${kode}\n💰 *Nominal:* ${nominal}`,
              { parse_mode: "Markdown" }
            );
          } else {
            await bot.sendMessage(
              msg.chat.id,
              "⚠️ Gagal menyimpan ke Google Sheets. Periksa kredensial atau izin akses."
            );
          }
        } else {
          await bot.sendMessage(
            msg.chat.id,
            "❌ Format salah.\nGunakan format: `Nama/Kode/Nominal`\nContoh: `Suryani/T02/50000`",
            { parse_mode: "Markdown" }
          );
        }
      } else {
        await bot.sendMessage(
          msg.chat.id,
          "📩 Kirim data dengan format:\n`Nama/Kode/Nominal`\nContoh: `Suryani/T02/50000`",
          { parse_mode: "Markdown" }
        );
      }
    }

    // WAJIB agar tidak error 503
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.sendStatus(200);
  }
});

// === JALANKAN SERVER ===
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
});
