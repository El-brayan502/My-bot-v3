var handler = async (m, { conn, args }) => {
    if (!m.isGroup) return m.reply('🔒 Este comando solo se usa en grupos.');

    const groupMetadata = await conn.groupMetadata(m.chat);

    // Debug: mostrar participantes y sus roles en consola
    console.log('🔎 Participantes del grupo:');
    groupMetadata.participants.forEach(p => {
        console.log(`- ${p.id} admin: ${p.admin || 'miembro'}`);
    });

    // Buscar info del usuario que manda el comando
    const userParticipant = groupMetadata.participants.find(p => p.id === m.sender);

    console.log('🔎 Info usuario que manda:', userParticipant);

    // Check si es admin o dueño del grupo
    const isUserAdmin = userParticipant?.admin === 'admin' || userParticipant?.admin === 'superadmin' || m.sender === groupMetadata.owner;

    if (!isUserAdmin) {
        return m.reply('*❌ Solo los admins pueden usar este comando*.');
    }

    // Obtener usuario a expulsar
    let user;
    if (m.mentionedJid && m.mentionedJid[0]) {
        user = m.mentionedJid[0];
    } else if (m.quoted) {
        user = m.quoted.sender;
    } else if (args[0]) {
        const number = args[0].replace(/[^0-9]/g, '');
        if (!number) return m.reply('⚠️ Número inválido.');
        user = number + '@s.whatsapp.net';
    } else {
        return m.reply('*🚫 Mencioná, respondé o escribí un número para expulsar*.');
    }

    const ownerGroup = groupMetadata.owner || m.chat.split`-`[0] + '@s.whatsapp.net';
    const ownerBot = global.owner[0][0] + '@s.whatsapp.net';

    if (user === conn.user.jid) return m.reply(`😂 Calma no me puedo sacar yo mismo`);
    if (user === ownerGroup) return m.reply(`Ese es el dueño del no lo eliminaré grupo`);
    if (user === ownerBot) return m.reply(`Que piensas? ¿qué sacaré a el dueño del bot?`);

    try {
        await conn.groupParticipantsUpdate(m.chat, [user], 'remove');
        await m.reply(`Se nos fue el User :c JJAJAJAJ`);
    } catch (e) {
        await m.reply(`No pude expulsar al usuario. Puede que no sea admin o que no tenga permisos nmms da admin.`);
    }
};

handler.help = ['kick'];
handler.tags = ['grupo'];
handler.command = ['kick','echar','hechar','sacar','ban'];
handler.register = false

export default handler;
    const result = { title, dl: links };
    return result;
  } catch (err) {
    return { error: 'Failed to fetch or parse page', details: err.message };
  }
}

async function detail(url) {
const base = "https://animeav1.com";
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    const $ = cheerio.load(html);

    const title = $('h1').first().text().trim();
    const altTitle = $('h2').first().text().trim();
    const description = $('.entry p').text().trim();
    const rating = $('.ic-star-solid .text-2xl').first().text().trim();
    const votes = $('.ic-star-solid .text-xs span').first().text().trim();
    const cover = $('figure img[alt$="Poster"]').attr('src');
    const backdrop = $('figure img[alt$="Backdrop"]').attr('src');

    const genres = [];
    $('a.btn[href*="catalogo?genre="]').each((_, el) => {
      genres.push($(el).text().trim());
    });

    const episodes = [];
    $('article.group\\/item').each((_, el) => {
      const epNum = $(el).find('.text-lead').first().text().trim();
      const img = $(el).find('img').attr('src');
      const link = base + $(el).find('a').attr('href');
      episodes.push({ ep: epNum, img, link });
    });
let total = episodes.length;
    return {
      title,
      altTitle,
      description,
      rating,
      votes,
      cover,
      backdrop,
      genres,
      episodes,
      total
    };
  } catch (err) {
    return { error: err.message };
  }
}

async function search(query) {
let base = "https://animeav1.com"
  const res = await fetch(`https://animeav1.com/catalogo?search=${encodeURIComponent(query)}`, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  const html = await res.text();
  const $ = cheerio.load(html);

  const results = [];

  $("article").each((i, el) => {
    const title = $(el).find("h3").text().trim();
    const link = base + $(el).find("a").attr("href");
    const img = $(el).find("img").attr("src");
    const desc = $(el).find("p").text().trim();

    results.push({ title, link, img });
  });

  return results;
}
export { download, detail, search }