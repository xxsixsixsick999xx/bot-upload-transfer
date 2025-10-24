// ===============================
// BOT UPLOAD TRANSFER v2
// ===============================

import express from "express";
import bodyParser from "body-parser";
import TelegramBot from "node-telegram-bot-api";
import { google } from "googleapis";

const app = express();
app.use(bodyParser.json());

// === ENVIRONMENT VARIABLES ===
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;
const GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const PORT = process.env.PORT || 10000;

if (!TELEGRAM_TOKEN || !SPREADSHEET_ID || !SHEET_NAME || !GOOGLE_CREDENTIALS) {
  console.error("❌ Ada environment variable yang belum diatur!");
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });
const WEBHOOK_URL = `https://inces-bot.onrender.com/webhook/${TELEGRAM_TOKEN}`;
await bot.setWebHook(WEBHOOK_URL);

console.log("✅ Webhook aktif di:", WEBHOOK_URL);

// === AUTH GOOGLE SHEETS ===
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
    console.error("❌ Gagal autentikasi Google:", err);
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
    console.error("❌ Gagal simpan ke Google Sheets:", err.response?.data || err.message);
    return null;
  }
}

// === WEBHOOK HANDLER ===
app.post(`/webhook/${TELEGRAM_TOKEN}`, async (req, res) => {
  const update = req.body;
  if (update.message) {
    const msg = update.message;
    const text = msg.text?.trim();
    if (text && text.includes("/")) {
      const parts = text.split("/");
      if (parts.length === 3) {
        const [nama, kode, nominal] = parts;
        const success = await appendToSheet([nama, kode, nominal]);
        if (success) {
          await bot.sendMessage(msg.chat.id, `✅ Data disimpan:\nNama: ${nama}\nKode: ${kode}\nNominal: ${nominal}`);
        } else {
          await bot.sendMessage(msg.chat.id, `⚠️ Gagal menyimpan ke Google Sheets. Cek log Render.`);
        }
      } else {
        await bot.sendMessage(msg.chat.id, "❌ Format salah. Gunakan: Nama/Kode/Nominal");
      }
    }
  }
  res.sendStatus(200);
});

app.listen(PORT, () => console.log(`🚀 Server berjalan di port ${PORT}`));
