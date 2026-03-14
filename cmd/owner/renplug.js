import fs from 'fs-extra';
import path from 'path';

let handler = async (m, { q, reply }) => {
  try {
    if (!q.includes('|')) {
      return reply('Formato no válido.\nEjemplo: `.renplug path/old.js | path/new.js``');
    }

    let [oldPath, newPath] = q.split('|').map(p => p.trim());

    if (!oldPath || !newPath) {
      return reply('El camino antiguo y el camino nuevo no pueden estar vacíos..');
    }

    if (!oldPath.endsWith('.js')) oldPath += '.js';
    if (!newPath.endsWith('.js')) newPath += '.js';

    const rootDir = process.cwd();
    const cmdDir = path.resolve(rootDir, './cmd');
    
    const targetOldPath = path.resolve(cmdDir, oldPath);
    const targetNewPath = path.resolve(cmdDir, newPath);

    const relOld = path.relative(cmdDir, targetOldPath);
    const relNew = path.relative(cmdDir, targetNewPath);

    if (relOld.startsWith('..') || path.isAbsolute(relOld) || relNew.startsWith('..') || path.isAbsolute(relNew)) {
      return reply('Error: Se detectó un recorrido de ruta ilegal.\nSolo puede mover archivos dentro de la carpeta `./cmd/`.`');
    }

    if (!await fs.pathExists(targetOldPath)) {
      return reply(`Archivo antiguo no encontrado:\n${targetOldPath}`);
    }

    if (await fs.pathExists(targetNewPath)) {
      return reply(`File di path baru sudah ada:\n${targetNewPath}\n\nHapus file tersebut dulu jika ingin mengganti.`);
    }
    
    await fs.move(targetOldPath, targetNewPath);

    reply(`✅ Plugin berhasil dipindahkan:\nDari: ${oldPath}\nKe: ${newPath}\n\nPerubahan akan aktif (hot-reload) dalam beberapa detik.`);

  } catch (e) {
    console.error(e);
    reply(`Gagal memindahkan plugin:\n${e.message}`);
  }
};

handler.command = ['mvplugin'];
handler.owner = true;
handler.help = ['renplug'];
handler.tags = ['owner'];

export default handler;