import "./settings/config.js"; 
import {
  makeWASocket,
  useMultiFileAuthState,
  jidDecode,
  DisconnectReason,
  downloadContentFromMessage,
  areJidsSameUser
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { PassThrough } from "stream";
import readline from "readline";
import pino from "pino";
import chalk from "chalk";
import fs from "fs-extra";
import NodeCache from "node-cache";
import ffmpeg from "fluent-ffmpeg";
import fileType from "file-type";
import axios from "axios";
import * as jimp from "jimp";
import { spawn } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import { smsg } from "./source/myfunc.js";

// IMPORT ESTÁTICO (esto arregla el error ERR_MODULE_NOT_FOUND)
import messageHandler from "./source/message.js";

global.mode = true;
global.sessionName = "session";

const asciiArt = () => {
  console.log(chalk.redBright(`
  
░█▀▀░ ░▀█▀░ ░█░█░ ░█▀▀░ ░█░
░█▀░░ ░█▀█░ ░█░█░ ░▄▀░░ ░█░
░█░░░ ░▀░▀░ ░▀▀▀░ ░▀▀▀░ ░▀░
  
`));
};

let rl = null;
const getRl = () => {
  if (!rl || rl.closed) {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  }
  return rl;
};
const question = (text) => new Promise((resolve) => getRl().question(text, resolve));

const msgRetryCounterCache = new NodeCache();

const getBuffer = async (url, options = {}) => {
  try {
    const res = await axios({
      method: "get",
      url,
      headers: { DNT: 1, "Upgrade-Insecure-Request": 1 },
      responseType: "arraybuffer",
      ...options
    });
    return res.data;
  } catch (e) {
    console.log(`Error : ${e}`);
  }
};

const resize = async (imagePathOrUrl, width, height) => {
  let imageBuffer;
  if (/^https?:\/\//.test(imagePathOrUrl)) {
    const response = await axios.get(imagePathOrUrl, { responseType: "arraybuffer" });
    imageBuffer = response.data;
  } else {
    imageBuffer = await fs.readFile(imagePathOrUrl);
  }
  const read = await jimp.read(imageBuffer);
  return await read.resize(width, height).getBufferAsync(jimp.MIME_JPEG);
};

async function startServer() {
  const child = async () => {
    process.on("unhandledRejection", (err) => console.error(err));
    process.on("uncaughtException", (err) => console.error(err));

    const { state, saveCreds } = await useMultiFileAuthState("./" + global.sessionName);
    const conn = makeWASocket({
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      browser: ["Linux", "Chrome", "20.0.00"],
      auth: state,
      msgRetryCounterCache,
      connectTimeoutMs: 60000,
      emitOwnEvents: true,
      fireInitQueries: true,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      markOnlineOnConnect: true
    });
    global.conn = conn;
    conn.ev.on("creds.update", saveCreds);

    // Pairing manual (ya lo tienes funcionando)
    if (!conn.authState.creds.registered) {
      asciiArt();
      console.log(chalk.cyan("╭──────────────────────────────────────···"));
      console.log(chalk.yellow("   ¡Modo Pairing Manual activado!"));
      console.log(chalk.cyan("│  Ingresa el número de WhatsApp..."));
      console.log(chalk.cyan("╰──────────────────────────────────────···"));

      const phoneNumberInput = await question(chalk.greenBright("Número de teléfono: "));
      let cleanNumber = phoneNumberInput.trim().replace(/[^0-9]/g, '').replace(/^0+/, '');

      if (!cleanNumber || cleanNumber.length < 8) {
        console.log(chalk.redBright("Número inválido."));
        process.exit(1);
      }

      console.log(`📱 Número: +${cleanNumber}`);
      console.log(chalk.yellow("Generando código..."));

      try {
        const codeResult = await conn.requestPairingCode(cleanNumber);
        const displayCode = codeResult?.match(/.{1,4}/g)?.join("-") || codeResult;
        console.log(chalk.cyan.bold(`Código: ${displayCode}`));
        console.log(chalk.greenBright("Mantén abierta la terminal."));
      } catch (err) {
        console.error(chalk.red("Error generando código:"), err);
        process.exit(1);
      }
      if (rl && !rl.closed) rl.close();
    }

    // MESSAGES.UPSERT - USANDO EL message.js CORRECTO
    conn.ev.on("messages.upsert", async (chatUpdate) => {
      try {
        let m = chatUpdate.messages[0];
        if (!m?.message) return;
        m.message = Object.keys(m.message)[0] === "ephemeralMessage" ? m.message.ephemeralMessage.message : m.message;
        if (m.key.remoteJid === "status@broadcast") return;
        if (!conn.public && !m.key.fromMe && chatUpdate.type === "notify") return;
        if (m.key.id.startsWith("BAE5") && m.key.id.length === 16) return;

        m = smsg(conn, m);

        // Aquí usamos tu message.js correctamente
        await messageHandler(conn, m, chatUpdate);

      } catch (err) {
        if (err.message && err.message.includes("Bad MAC")) {
          console.log(chalk.yellow("[INFO] Bad MAC ignorado."));
        } else {
          console.error(chalk.red("[ERROR]"), err);
        }
      }
    });

    // Resto de tu código (decodeJid, connection.update, downloadAndSaveMediaMessage, etc.)
    conn.decodeJid = (jid) => {
      if (!jid) return jid;
      if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {};
        return (decode.user && decode.server && decode.user + "@" + decode.server) || jid;
      } else return jid;
    };

    conn.public = mode;
    conn.serializeM = (m) => smsg(conn, m);

    conn.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === "close") {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        console.log("Conexión cerrada:", reason);
        if ([DisconnectReason.connectionLost, DisconnectReason.connectionReplaced, DisconnectReason.restartRequired, DisconnectReason.timedOut, 405, 408, 410, 500, 503].includes(reason)) {
          await startServer();
        } else {
          spawn(process.argv[0], [process.argv[1]], { stdio: "inherit", detached: true }).unref();
          process.exit(0);
        }
      }
      if (connection === "open") {
        console.log(chalk.greenBright("Bot conectado exitosamente."));
      }
    });

    // Tus funciones sendText, sendImage, sendAudio, sendVideo... (las mantengo igual, no las copio aquí por espacio)
    // ... (pega aquí el resto de tus funciones que ya tenías)

    return conn;
  };
  await child();
}

startServer();

fs.watchFile(__filename, () => {
  console.log(chalk.redBright(`Archivo ${__filename} cambiado, reiniciando...`));
  spawn(process.argv[0], [__filename], { stdio: "inherit" });
  process.exit();
});