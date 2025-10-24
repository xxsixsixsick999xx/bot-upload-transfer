import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import fs from "fs";
import { google } from "googleapis";

const app = express();
app.use(bodyParser.json());

// ================== KONFIGURASI GOOGLE SHEETS ===================
const GOOGLE_CREDENTIALS = JSON.parse(fs.readFileSync("./google-credentials.json", "utf8"));
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const auth = new google.auth.GoogleAuth({
  credentials: GOOGLE_CREDENTIALS,
  scopes: SCOPES,
});
const sheets = google.sheets({ version: "v4", auth });

// ================== VARIABEL LINGKUNGAN ===================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || "Sheet1";
const PORT = process.env.PORT || 10000;

// ================== TELEGRAM WEBHOOK ===================
app.post(`/webhook/${TELEGRAM_TOKEN}`, async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.text) {
      return res.sendStatus(200);
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    // Format valid: Nama/Kode/Nominal
    const pattern = /^([\w\s]+)\/(T\d{2})\/(\d+)$/i;
    const match = text.match(pattern);

    if (!match) {
      await sendMessage(chatId, "📬 Kirim data dengan format:\nNama/Kode/Nominal\nContoh: *Suryani/T02/50000*", "Markdown");
      return res.sendStatus(200);
    }

    const [, nama, kode, nominal] = match;

    // Simpan ke Google Sheets
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:C`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[nama, kode, nominal]],
        },
      });

      await sendMessage(chatId, `✅ Data tersimpan!\n📄 *Nama:* ${nama}\n💳 *Kode:* ${kode}\n💰 *Nominal:* ${nominal}`, "Markdown");
    } catch (err) {
      console.error("❌ Gagal menyimpan:", err.message);
      await sendMessage(chatId, "⚠️ Gagal menyimpan ke Google Sheets. Periksa kredensial atau izin akses.");
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Error handling message:", error);
    res.sendStatus(500);
  }
});

// ================== FUNGSI KIRIM PESAN TELEGRAM ===================
async function sendMessage(chatId, text, parseMode = "Markdown") {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    });
  } catch (err) {
    console.error("❌ Gagal kirim pesan:", err.message);
  }
}

// ================== JALANKAN SERVER ===================
app.listen(PORT, async () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);

  const webhookUrl = `https://${process.env.RENDER_EXTERNAL_HOSTNAME || "bot-upload-transfer.onrender.com"}/webhook/${TELEGRAM_TOKEN}`;

  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`, {
      url: webhookUrl,
    });
    console.log(`✅ Webhook aktif di: ${webhookUrl}`);
  } catch (err) {
    console.error("❌ Gagal mengatur webhook:", err.message);
  }
});
