// ===============================
// BOT TELEGRAM UPLOAD TRANSFER + GOOGLE SHEETS (WEBHOOK MODE)
// ===============================

import express from "express";
import bodyParser from "body-parser";
import TelegramBot from "node-telegram-bot-api";
import { google } from "googleapis";

// === KONFIGURASI DARI ENVIRONMENT ===
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;
const GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const PORT = process.env.PORT || 10000;

// === INISIALISASI EXPRESS ===
const app = express();
app.use(bodyParser.json());

// === INISIALISASI TELEGRAM BOT (WEBHOOK MODE) ===
const bot = new TelegramBot(TELEGRAM_TOKEN);
const WEBHOOK_URL = `https://bot-upload-transfer.onrender.com/webhook/${TELEGRAM_TOKEN}`;

await bot.setWebHook(WEBHOOK_URL);
console.log("✅ Webhook aktif di:", WEBHOOK_URL);

// === AUTENTIKASI GOOGLE SHEETS ===
async function authorize() {
  const auth = new google.auth.GoogleAuth({
    credentials: GOOGLE_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return auth.getClient();
}

// === SIMPAN DATA KE SHEETS ===
async function appendToSheet(nama, kode, nominal) {
  const authClient = await authorize();
  const sheets = google.sheets({ version: "v4", auth: authClient });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:C`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[nama, kode, nominal]],
    },
  });
}

// === ROUTE UNTUK WEBHOOK ===
app.post(`/webhook/${TELEGRAM_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// === HANDLE FOTO + CAPTION ===
bot.on("photo", async (msg) => {
  try {
    const caption = msg.caption || "";
    const parts = caption.split("/");

    const nama = parts[0]?.trim();
    const kode = parts[1]?.trim();
    const nominal = parts[2]?.trim();

    if (!nama || !kode || !nominal) {
      await bot.sendMessage(
        msg.chat.id,
        "❌ Format tidak valid.\nGunakan format:\n`Nama/Kode/Nominal`",
        { parse_mode: "Markdown" }
      );
      return;
    }

    await appendToSheet(nama, kode, nominal);
    await bot.sendMessage(
      msg.chat.id,
      `✅ Data berhasil disimpan!\n\n📋 Nama: *${nama}*\n🏷️ Kode: *${kode}*\n💰 Nominal: *${nominal}*`,
      { parse_mode: "Markdown" }
    );

    console.log(`✅ Data tersimpan: ${nama} | ${kode} | ${nominal}`);
  } catch (err) {
    console.error("❌ Error menyimpan data:", err);
    await bot.sendMessage(
      msg.chat.id,
      "⚠️ Gagal menyimpan ke Google Sheets.\nPeriksa izin atau kredensial.",
      { parse_mode: "Markdown" }
    );
  }
});

// === HANDLE /start DAN /help ===
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `👋 Halo ${msg.from.first_name || "user"}!\n\nKirim *foto bukti transfer* dengan caption berformat:\n\n\`Nama/Kode/Nominal\`\n\nContoh:\n\`Suryani22/T02/50000\``,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `📘 *Panduan Penggunaan Bot:*\n\n1️⃣ Kirim foto bukti transfer\n2️⃣ Tulis caption seperti berikut:\n\`Nama/Kode/Nominal\`\n\nContoh:\n\`Rudi/T01/150000\`\n\nData otomatis tersimpan ke Google Sheets.`,
    { parse_mode: "Markdown" }
  );
});

// === JALANKAN SERVER EXPRESS ===
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di port ${PORT}`);
});
