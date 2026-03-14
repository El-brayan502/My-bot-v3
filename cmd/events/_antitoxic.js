let handler = m => m

handler.before = async function (m, { conn, isBotAdmin }) {
    if (m.fromMe || !m.isGroup) return true

    const text = (m.text || m.body || m.msg?.text || m.msg?.caption || "").toLowerCase()
    const toxicWords = /anjing|babi|kntl|memek|ajg|goblog|tolol|peler|asuh/i
    
    if (toxicWords.test(text)) {
        await m.reply(`*─── [ TOXIC DETECTED ] ───*\n\nHai @${m.sender.split('@')[0]}, advertencia estricta!\nNadie tiene permitido decir cosas groseras en este grupo, sin excepción.`)
        
        if (isBotAdmin) {
            try {
                await conn.sendMessage(m.chat, { delete: m.key })
            } catch (err) {
                console.error(err)
            }
        }
    }
    
    return true
}

export default handler