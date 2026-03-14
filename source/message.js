import "../settings/config.js";
import {
  BufferJSON,
  WA_DEFAULT_EPHEMERAL,
  generateWAMessageFromContent,
  generateWAMessageContent,
  generateWAMessage,
  prepareWAMessageMedia,
  areJidsSameUser,
  getContentType,
  downloadContentFromMessage
} from "@whiskeysockets/baileys";
import fs from "fs-extra";
import util from "util";
import chalk from "chalk";
import { exec, spawn } from "child_process";
import axios from "axios";
import syntaxerror from "syntax-error";
import { fileURLToPath } from "url";
import path from "path";
import os from "os";
import JsConfuser from "js-confuser";
import * as jimp from "jimp";
import speed from "performance-now";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import sharp from "sharp";
import fileType from "file-type";

import {
  generateProfilePicture,
  getBuffer,
  fetchJson,
  fetchText,
  getRandom,
  runtime,
  sleep,
  makeid,
  toRupiah
} from "../source/myfunc.js";
import { qtext, metaai } from "../source/quoted.js";
import x from "../handler.js";
import { makeStickerFromUrl } from "../source/events/_sticker.js";
import Case from "./events/system.js";

let prefix = ".";
let mode = true;

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
    }
  }

  return dp[a.length][b.length];
}

function similarityPercent(a, b) {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 100;

  const distance = levenshtein(a, b);
  const similarity = ((maxLength - distance) / maxLength) * 100;
  return Math.round(similarity);
}

async function getCaseCommands(filePath) {
  try {
    const code = await fs.promises.readFile(filePath, "utf8");
    const regex = /case\s+['"`](.*?)['"`]/g;
    const matches = [];
    let match;

    while ((match = regex.exec(code)) !== null) matches.push(match[1]);
    return matches;
  } catch {
    return [];
  }
}

export default async (conn, m) => {
  try {
    const body = m.body || m.text || "";
    const budy = m.body || m.text || "";

    const command = body.startsWith(prefix)
      ? body.replace(prefix, "").trim().split(/ +/).shift().toLowerCase()
      : "";

    const commands = command.replace(prefix, "");
    const args = body.trim().split(/ +/).slice(1);
    const q = args.join(" ");

    const qmsg = m.quoted || m;
    const quoted = m.quoted ? m.quoted : m;
    const mime = quoted?.msg?.mimetype || quoted?.mimetype || null;

    const message = m;
    const messageType = m.mtype;
    const messageKey = message.key;

    const pushName = m.pushName || "Undefined";
    const itsMe = m.key.fromMe;

    const chat = m.chat;
    const sender = m.sender;
    const userId = sender.split("@")[0];

    const isOwner = Array.isArray(global.owner) && global.owner.some(i => i.replace(/[^0-9]/g, "") === userId);

    const botNumber = conn.user.id.split(":")[0] + "@s.whatsapp.net";
    const isGroup = m.key.remoteJid.endsWith("@g.us");

    const isNet = (m.key.remoteJidAlt || m.key.remoteJid).replace(
      /@lid$/,
      "@s.whatsapp.net"
    );
    const isNomor =
      m.key.participantAlt ||
      m.key.remoteJidAlt ||
      (m.sender || "").replace(/@lid$/, "@s.whatsapp.net");
    const isNumber = isNomor.split("@")[0];

    let groupMetadata = {};
    let groupName = "";
    let groupId = "";
    let groupMembers = [];
    let isGroupAdmins = false;
    let isBotGroupAdmins = false;
    let me = {};

    let isAdmin = false;
    let isBotAdmin = false;

    if (isGroup) {
      groupMetadata = await conn.groupMetadata(chat).catch(() => ({}));
      groupName = groupMetadata.subject || "";
      groupId = groupMetadata.id || "";
      groupMembers = groupMetadata.participants || [];
      
      isAdmin = !!groupMembers.find((p) => p.admin && p.id === sender);
      isGroupAdmins = isAdmin; 
      
      isBotAdmin = !!groupMembers.find((p) => p.admin && p.id === botNumber);
      isBotGroupAdmins = isBotAdmin; 
      
      me = groupMembers.find((p) => p.id === m.sender || p.jid === m.sender) || {};
    }

    const TypeMess = getContentType(m?.message);
    const reactions =
      TypeMess === "reactionMessage" ? m?.message[TypeMess]?.text : false;

    const reply = async (teks) => {
      return conn.sendMessage(
        m.chat,
        {
          text: `${teks}`,
          mentions: [m.sender],
          contextInfo: {
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363417186717632@newsletter',
              serverMessageId: 200,
              newsletterName: '🎋 yae - miku',
            },
            externalAdReply: {
              title: `${global.namebotz}`,
              thumbnail: fs.readFileSync("./settings/image/image.jpg"),
            }
          }
        },
        { quoted: m }
      );
    };

    m.reply = reply;

    if (reactions) {
      if (["😂"].includes(reactions)) {
        conn.sendMessage(m.chat, { text: "*JAJAJAJA 😹*" }, { quoted: null });
      }
    }

    const resize = async (imagePathOrUrl, width, height) => {
      let imageBuffer;

      if (/^https?:\/\//.test(imagePathOrUrl)) {
        const response = await axios.get(imagePathOrUrl, { responseType: "arraybuffer" });
        imageBuffer = response.data;
      } else {
        imageBuffer = await fs.readFile(imagePathOrUrl);
      }

      const read = await jimp.read(imageBuffer);
      const data = await read.resize(width, height).getBufferAsync(jimp.MIME_JPEG);
      return data;
    };

    const reaction = async (jid, emoji) => {
      conn.sendMessage(jid, { react: { text: emoji, key: m.key } });
    };

    const plug = {
      conn,
      command,
      quoted,
      qtext,
      budy,
      commands,
      args,
      q,
      message,
      messageType,
      messageKey,
      pushName,
      itsMe,
      chat,
      sender,
      userId,
      reply,
      botNumber,
      isGroup,
      groupMetadata,
      groupName,
      groupId,
      groupMembers,
      isBotGroupAdmins,
      isGroupAdmins,
      generateProfilePicture,
      isBotAdmin,
      isAdmin,
      getBuffer,
      fetchJson,
      fetchText,
      getRandom,
      runtime,
      sleep,
      makeid,
      prefix,
      reaction,
      resize,
      metaai,
      isNumber
    };

    const pluginHandled = await x.run(m, plug);
    if (pluginHandled) return;

    if (body.startsWith("$")) {
      if (!isOwner) return;
      await reply("_Ejecutando..._");

      exec(q, async (err, stdout) => {
        if (err) return reply(`${err}`);
        if (stdout) await reply(`${stdout}`);
      });
    }

    if (body.startsWith(">")) {
      if (!isOwner) return;

      try {
        const txtt = util.format(await eval(`(async()=>{ ${q} })()`));
        reply(txtt);
      } catch (e) {
        let _syntax = "";
        const _err = util.format(e);

        const err = syntaxerror(q, "EvalError", {
          allowReturnOutsideFunction: true,
          allowAwaitOutsideFunction: true,
          sourceType: "module"
        });

        if (err) _syntax = err + "\n\n";
        reply(util.format(_syntax + _err));
      }
    }

    if (body.startsWith("=>")) {
      if (!isOwner) return;

      try {
        const txtt = util.format(await eval(`(async()=>{ return ${q} })()`));
        reply(txtt);
      } catch (e) {
        let _syntax = "";
        const _err = util.format(e);

        const err = syntaxerror(q, "EvalError", {
          allowReturnOutsideFunction: true,
          allowAwaitOutsideFunction: true,
          sourceType: "module"
        });

        if (err) _syntax = err + "\n\n";
        reply(util.format(_syntax + _err));
      }
    }

    if (m.message) {
      const time = new Date().toLocaleTimeString("es-GT", { hour12: false });
      const line = chalk.gray("│");
      const who = `${chalk.yellow(pushName)} ${chalk.gray("(" + m.sender + ")")}`;
      const place = isGroup ? chalk.magenta("Grupo: " + groupName) : chalk.green("Privado");

      console.log(
        chalk.gray("╭────────────────────────────────"),
        `\n${line} ${chalk.cyan("🕒")} ${time}`,
        `\n${line} ${chalk.cyan("💬")} ${chalk.green(budy || m.mtype)}`,
        `\n${line} ${chalk.cyan("👤")} ${who}`,
        `\n${line} ${chalk.cyan("📞")} ${isNumber}`,
        `\n${line} ${chalk.cyan("🏷️")} ${place}`,
        `\n${chalk.gray("╰────────────────────────────────")}\n`
      );
    }
    
    if (!mode && !itsMe) return;
    if (!body.startsWith(prefix)) return;

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const plugins = await x.loader(path.resolve(__dirname, "../cmd"));
    const pluginCommands = plugins.flatMap((p) => p.command || []);
    const caseCommands = await getCaseCommands(__filename);
    const allCommands = [...new Set([...pluginCommands, ...caseCommands])];

    if (!allCommands.includes(command)) {
      const similarities = allCommands.map((cmd) => ({
        name: cmd,
        percent: similarityPercent(command, cmd)
      }));

      const sorted = similarities.sort((a, b) => b.percent - a.percent).slice(0, 3);
      const filtered = sorted.filter((s) => s.percent >= 60);
      const suggestions = filtered
        .map((s, i) => `\( {i + 1}. * \){prefix + s.name}* — ${s.percent}%`)
        .join("\n");

      if (filtered.length > 0) {
        const buttons = filtered.map((s) => ({
          buttonId: `\( {prefix} \){s.name}`,
          buttonText: { displayText: `\( {prefix} \){s.name}` },
          type: 1
        }));

        await conn.sendMessage(
          m.chat,
          {
            text: `🔍 Quizás quisiste decir:\n${suggestions}`,
            footer: global.namebotz || "Bot",
            buttons,
            headerType: 1,
            viewOnce: true
          },
          { quoted: metaai }
        );
      }

      return;
    }

    switch (commands) {
      case "mode": {
        await reaction(m.chat, "🧠");
        reply(`🤖 Modo del bot: ${conn.public ? "Público" : "Solo yo"}`);
        break;
      }

      case "cekidch":
      case "idch": {
        if (!q) return reply(`*Ejemplo:*\n\( {prefix} \){commands} enlacecanal`);
        if (!q.includes("https://whatsapp.com/channel/"))
          return reply("El enlace del canal no es válido");

        const result = q.split("https://whatsapp.com/channel/")[1];
        const res = await conn.newsletterMetadata("invite", result);
        return reply(`${res.id}`);
        break;
      }

      case "sticker":
      case "s": {
        const quotedMessage = m.quoted ? m.quoted : m;
        const mime = (quotedMessage.msg || quotedMessage).mimetype || "";

        if (!/image|video/.test(mime))
          return reply(`Responde a una imagen o video con el comando \( {prefix} \){commands}`);

        try {
          if (/image/.test(mime)) {
            const media = await quotedMessage.download();
            const imageUrl = `data:\( {mime};base64, \){media.toString("base64")}`;
            await makeStickerFromUrl(imageUrl, conn, m, reply);
          } else if (/video/.test(mime)) {
            if ((quotedMessage?.msg || quotedMessage)?.seconds > 10)
              return reply("¡El video no puede durar más de 10 segundos!");

            const media = await quotedMessage.download();
            const videoUrl = `data:\( {mime};base64, \){media.toString("base64")}`;
            await makeStickerFromUrl(videoUrl, conn, m, reply);
          }
        } catch (error) {
          console.error(error);
          return reply("Ocurrió un error al procesar el archivo. Intenta de nuevo.");
        }
        break;
      }

      case "autotag":
      case "atag": {
        try {
          if (args.length < 2) return reply(`*Ejemplo:* \( {prefix} \){command} 502xxxx,503xxxx https://... texto aquí`);

          const numeros = args[0];
          const url = args[1];
          const texto = args.slice(2).join(" ");

          const jids = numeros
            .split(",")
            .map((n) => n.replace(/[^0-9]/g, "") + "@s.whatsapp.net")
            .filter((v) => v.length > 15);

          if (typeof conn.sendStatusMentions === "function") {
            await conn.sendStatusMentions(
              {
                image: { url },
                caption: texto
              },
              jids
            );

            reply(
              `✅ Estado enviado con mención a:\n\( {jids.map((j) => `@ \){j.split("@")[0]}`).join(", ")}`
            );
          } else {
            reply("Tu versión de Baileys no soporta sendStatusMentions(). Actualiza la librería.");
          }
        } catch (err) {
          reply("❌ No se pudo enviar el estado con menciones.\n" + String(err?.message || err));
        }
        break;
      }

      case "bot": {
        await conn.sendMessage(m.chat, { requestPhoneNumber: {} });
        break;
      }

      case "jid":
      case "getjid": {
        await reply(chat);
        break;
      }

      case "getcase": {
        if (!isOwner) return reply("Solo el dueño puede usar este comando.");
        if (!q) return reply(`Ejemplo: ${prefix}getcase nombrecase`);
        try {
          const resultado = Case.get(q);
          reply(`✅ Case encontrado:\n\n${resultado}`);
        } catch (e) {
          reply(e.message);
        }
        break;
      }

      case "addcase": {
        if (!isOwner) return reply("Solo el dueño puede usar este comando.");
        if (!q)
          return reply(
            `Ejemplo:\n${prefix}addcase case "nombre": {\n  reply("prueba");\n  break;\n}`
          );
        try {
          Case.add(q);
          reply(
            "✅ Case agregado con éxito.\n\n*Nota:* Reinicia el bot para que funcione el nuevo comando."
          );
        } catch (e) {
          reply(e.message);
        }
        break;
      }

      case "delcase": {
        if (!isOwner) return reply("Solo el dueño puede usar este comando.");
        if (!q) return reply(`Ejemplo: ${prefix}delcase nombrecase`);
        try {
          Case.delete(q);
          reply(
            `✅ Case "${q}" eliminado.\n\n*Nota:* Reinicia el bot para aplicar los cambios.`
          );
        } catch (e) {
          reply(e.message);
        }
        break;
      }

      case "listcase": {
        if (!isOwner) return reply("Solo el dueño puede usar este comando.");
        try {
          const lista = Case.list();

          if (lista === "Tidak ada case!") {
            return reply("📜 *Lista de cases*\n\nAún no hay cases personalizados agregados.");
          }

          const cmds = lista.split("\n");
          const total = cmds.length;

          const listaFormateada = cmds.map((cmd) => `- \( {prefix} \){cmd}`).join("\n");
          const texto = `*LISTA DE CASES PERSONALIZADOS*\n\n${listaFormateada}\n\n*Total: ${total} cases*`;

          reply(texto.trim());
        } catch (e) {
          reply(e.message);
        }
        break;
      }

      case "rvo":
      case "readviewonce": {
        if (!m.quoted)
          return reply("¡Responde al mensaje de vista única!");

        const msg = m.quoted.message || m.quoted.fakeObj.message;
        const type = Object.keys(msg)[0];

        if (!msg[type].viewOnce && m.quoted.mtype !== "viewOnceMessageV2") {
          return reply("¡Ese mensaje no es de vista única!");
        }

        const media = await downloadContentFromMessage(
          msg[type],
          type === "imageMessage" ? "image" : type === "videoMessage" ? "video" : "audio"
        );

        let buffer = Buffer.from([]);
        for await (const chunk of media) buffer = Buffer.concat([buffer, chunk]);

        if (/video/.test(type)) {
          return conn.sendMessage(
            m.chat,
            { video: buffer, caption: msg[type].caption || "" },
            { quoted: m }
          );
        }

        if (/image/.test(type)) {
          return conn.sendMessage(
            m.chat,
            { image: buffer, caption: msg[type].caption || "" },
            { quoted: m }
          );
        }

        if (/audio/.test(type)) {
          return conn.sendMessage(
            m.chat,
            { audio: buffer, mimetype: "audio/mpeg", ptt: true },
            { quoted: m }
          );
        }

        break;
      }

      case "cekapikey":
      case "cekkey": {
        if (!q)
          return reply(`Ejemplo:\n${prefix}cekapikey TU_CLAVE_API`);

        const clave = q.trim();
        const url = "https://velyn.mom/api/tools/check";

        await reaction(m.chat, "🔎");

        try {
          const respuesta = await axios.get(url, {
            params: { apikey: clave }
          });

          const resultado = respuesta.data;
          const datos = resultado.data;

          if (resultado.success === true && datos) {
            const fecha = new Date(datos.createdAt).toLocaleDateString("es-GT", {
              timeZone: "America/Guatemala"
            });

            const texto = `*RESULTADO DE LA API KEY*

*Estado:* ✅ *ACTIVA*
*Clave:* \`${datos.key}\`
*Rol:* ${datos.role.toUpperCase()}
*Créditos restantes:* ${datos.remaining}
*Fecha creación:* ${fecha}
*Reinicio de créditos:* en ${datos.daysUntilReset} días`;

            reply(texto.trim());
          } else {
            reply(`🔑 *API KEY NO VÁLIDA*

*Clave:* \`${clave}\`
*Estado:* ❌ *Inválida o expirada*
*Mensaje:* ${resultado.message || "No registrada"}`);
          }
        } catch (error) {
          const status = error.response?.status;
          let msgError = `❌ Error de conexión (código \( {status || "desconocido"})\n \){error.message}`;

          if (status === 404) {
            msgError = "❌ Error 404 - La clave o el endpoint parece incorrecto";
          }

          reply(msgError);
        }

        break;
      }

      default:
        break;
    }
  } catch (err) {
    conn.sendMessage(m.chat, { text: util.format(err) }, { quoted: m });
  }
};