import { exec } from 'child_process'

let handler = async (m, { conn }) => {

  await conn.sendMessage(m.chat, {
    text: '🔄 Reiniciando el bot...'
  }, { quoted: m })

  setTimeout(() => {
    process.exit(1)
  }, 1000)

}

handler.help = ['restart']
handler.tags = ['owner']
handler.command = ['restart', 'reiniciar']
handler.rowner = true

export default handler