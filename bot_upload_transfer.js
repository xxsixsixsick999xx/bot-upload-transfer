import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import { google } from "googleapis";
import dotenv from "dotenv";
import fs from "fs";

// ============================================================
// 1️⃣  Load .env kalau dijalankan lokal
// ============================================================
if (fs.existsSync(".env")) {
  dotenv.config();
  console.log("📦 .env file loaded (local mode)");
}

// ============================================================
// 2️⃣  Setup variabel environment
// ============================================================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || "Sheet1";
const PORT = process.env.PORT || 10000;

// Ambil kredensial Google dari Render atau lokal
let GOOGLE_CREDENTIALS;
try {
  GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);
} catch (err) {
  console.error("⚠️ GOOGLE_CREDENTIALS tidak ditemukan atau format salah.");
}

// ============================================================
// 3️⃣  Setup Google API client
// ============================================================
const auth = new google.auth.GoogleAuth({
  credentials: GOOGLE_CREDENTIALS,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

// ============================================================
// 4️⃣  Setup Express server
// ============================================================
const app = express();
app.use(bodyParser.json());

// ============================================================
// 5️⃣  Handle pesan Telegram
// ============================================================
app.post(`/webhook/${TELEGRAM_TOKEN}`, async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.text) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text.trim();

    // Format: Nama/Kode/Nominal
    const regex = /^([\w\s]+)\/(T\d{2})\/(\d+)$/i;
    const match = text.match(regex);

    if (!match) {
      await sendMessage(
        chatId,
        "❗ Format salah.\nGunakan format:\nNama/Kode/Nominal\nContoh: *Suryani/T01/50000*",
        "Markdown"
      );
      return res.sendStatus(200);
    }

    const [, nama, kode, nominal] = match;
    const tanggal = new Date().toLocaleString("id-ID");

    // Simpan ke Google Sheets
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:D`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[tanggal, nama, kode, nominal]],
      },
    });

    await sendMessage(
      chatId,
      `✅ Data tersimpan!\n📅 ${tanggal}\n👤 Nama: *${nama}*\n💳 Kode: *${kode}*\n💰 Nominal: *${nominal}*`,
      "Markdown"
    );

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Gagal menyimpan:", err.message);
    res.sendStatus(500);
  }
});

// ============================================================
// 6️⃣  Kirim pesan ke Telegram
// ============================================================
async function sendMessage(chatId, text, parseMode = "Markdown") {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    });
  } catch (error) {
    console.error("⚠️ Gagal kirim pesan:", error.message);
  }
}

// ============================================================
// 7️⃣  Jalankan server dan atur webhook
// ============================================================
app.listen(PORT, async () => {
  const webhookUrl = `https://${process.env.RENDER_EXTERNAL_HOSTNAME || "bot-upload-transfer.onrender.com"}/webhook/${TELEGRAM_TOKEN}`;
  console.log(`🚀 Server aktif di port ${PORT}`);

  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`, {
      url: webhookUrl,
    });
    console.log(`✅ Webhook aktif di: ${webhookUrl}`);
  } catch (err) {
    console.error("❌ Gagal set webhook:", err.message);
  }
});
