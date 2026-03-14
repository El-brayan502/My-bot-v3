import { execSync } from 'child_process'

let handler = async (m, { conn, text }) => {
  try {

    await conn.sendMessage(m.chat, { react: { text: '🕒', key: m.key } })

    const cmd = 'git pull' + (m.fromMe && text ? ' ' + text : '')
    const out = execSync(cmd, { encoding: 'utf-8' })

    await conn.sendMessage(m.chat, {
      text: `🛠️ *ACTUALIZACIÓN DEL BOT*\n\n${out.trim() || '✅ Actualizado correctamente'}`
    }, { quoted: m })

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {

    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })

    await conn.sendMessage(m.chat, {
      text: `⚠️ *Error al actualizar*\n\n${e.message}`
    }, { quoted: m })

  }
}

handler.help = ['update']
handler.tags = ['owner']
handler.command = ['update', 'actualizar', 'fix', 'fixed']
handler.rowner = false

export default handler